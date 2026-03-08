use std::convert::Infallible;
use std::pin::Pin;
use std::time::Instant;

use futures::Stream;
use uuid::Uuid;

use narrex_llm::{GenerateRequest, LlmProvider};

use super::error::AiError;
use super::models::{
    CostSummary, CreateDraftParams, CreateManualDraft, Draft, DraftSource, DraftSummary,
    EditDraftRequest, GenerationLog, GenerationStatus, GenerationType, SceneSummary,
};
use super::ports::{
    ContextAssemblyRepository, DraftRepository, GenerationLogRepository, SceneSummaryRepository,
};
use super::prompt::PromptBuilder;

use crate::domain::timeline::ports::SceneRepository;

#[derive(Clone)]
pub struct AiServiceImpl<
    DR: DraftRepository,
    SSR: SceneSummaryRepository,
    GLR: GenerationLogRepository,
    CAR: ContextAssemblyRepository,
    SR: SceneRepository,
> {
    draft_repo: DR,
    summary_repo: SSR,
    log_repo: GLR,
    context_repo: CAR,
    scene_repo: SR,
    llm: std::sync::Arc<dyn LlmProvider>,
}

impl<DR, SSR, GLR, CAR, SR> AiServiceImpl<DR, SSR, GLR, CAR, SR>
where
    DR: DraftRepository,
    SSR: SceneSummaryRepository,
    GLR: GenerationLogRepository,
    CAR: ContextAssemblyRepository,
    SR: SceneRepository,
{
    pub fn new(
        draft_repo: DR,
        summary_repo: SSR,
        log_repo: GLR,
        context_repo: CAR,
        scene_repo: SR,
        llm: std::sync::Arc<dyn LlmProvider>,
    ) -> Self {
        Self {
            draft_repo,
            summary_repo,
            log_repo,
            context_repo,
            scene_repo,
            llm,
        }
    }

    /// Generate a scene draft, returning an SSE-compatible stream.
    pub async fn generate_scene_draft(
        &self,
        user_id: Uuid,
        project_id: Uuid,
        scene_id: Uuid,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<SseEvent, Infallible>> + Send>>, AiError> {
        let ctx = self.context_repo.assemble_context(project_id, scene_id).await?;

        let system = PromptBuilder::system_prompt(&ctx);
        let user = PromptBuilder::user_prompt(&ctx);
        let req = GenerateRequest {
            system_prompt: system,
            user_prompt: user,
            max_tokens: Some(4096),
            temperature: Some(0.8),
        };

        let llm_stream = self
            .llm
            .generate_stream(req)
            .await
            .map_err(|e| AiError::GenerationFailed(e.to_string()))?;

        let draft_repo = self.draft_repo.clone();
        let scene_repo = self.scene_repo.clone();
        let _summary_repo = self.summary_repo.clone();
        let log_repo = self.log_repo.clone();
        let _llm = self.llm.clone();
        let start = Instant::now();

        let stream = async_stream::stream! {
            let mut full_text = String::new();
            let mut final_model = String::new();
            let mut final_provider = String::new();
            let mut tokens_in: u32 = 0;
            let mut tokens_out: u32 = 0;

            let mut llm_stream = Box::pin(llm_stream);
            use futures::StreamExt;

            while let Some(result) = llm_stream.next().await {
                match result {
                    Ok(chunk) => {
                        if chunk.done {
                            if let Some(ref usage) = chunk.usage {
                                final_model = usage.model.clone();
                                final_provider = usage.provider.clone();
                                tokens_in = usage.token_count_input;
                                tokens_out = usage.token_count_output;
                            }

                            // Save draft.
                            let next_version = match draft_repo.next_version(scene_id).await {
                                Ok(v) => v,
                                Err(e) => {
                                    yield Ok(SseEvent::Error { message: e.to_string() });
                                    return;
                                }
                            };

                            let draft = match draft_repo
                                .create(&CreateDraftParams {
                                    scene_id,
                                    version: next_version,
                                    content: full_text.clone(),
                                    source: DraftSource::AiGeneration,
                                    edit_direction: None,
                                    model: if final_model.is_empty() { None } else { Some(final_model.clone()) },
                                    provider: if final_provider.is_empty() { None } else { Some(final_provider.clone()) },
                                    tokens_in: Some(tokens_in as i32),
                                    tokens_out: Some(tokens_out as i32),
                                    cost: None,
                                })
                                .await
                            {
                                Ok(d) => d,
                                Err(e) => {
                                    yield Ok(SseEvent::Error { message: e.to_string() });
                                    return;
                                }
                            };

                            // Update scene status.
                            let _ = scene_repo
                                .update(
                                    scene_id,
                                    &crate::domain::timeline::models::UpdateScene {
                                        ..Default::default()
                                    },
                                )
                                .await;

                            // Log generation.
                            let elapsed = start.elapsed().as_millis() as i32;
                            let log = GenerationLog {
                                id: Uuid::new_v4(),
                                user_id,
                                project_id: Some(project_id),
                                scene_id: Some(scene_id),
                                generation_type: GenerationType::Scene,
                                status: GenerationStatus::Success,
                                model: final_model.clone(),
                                provider: final_provider.clone(),
                                duration_ms: elapsed,
                                token_count_input: tokens_in as i32,
                                token_count_output: tokens_out as i32,
                                cost_usd: 0.0,
                                error_message: None,
                                created_at: chrono::Utc::now(),
                            };
                            let _ = log_repo.create(&log).await;

                            yield Ok(SseEvent::Completed { draft });
                        } else {
                            full_text.push_str(&chunk.text);
                            yield Ok(SseEvent::Token { text: chunk.text });
                        }
                    }
                    Err(e) => {
                        yield Ok(SseEvent::Error { message: e.to_string() });
                        return;
                    }
                }
            }
        };

        Ok(Box::pin(stream))
    }

    /// Edit a scene draft based on a direction, returning an SSE-compatible stream.
    pub async fn edit_scene_draft(
        &self,
        user_id: Uuid,
        project_id: Uuid,
        scene_id: Uuid,
        edit_req: &EditDraftRequest,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<SseEvent, Infallible>> + Send>>, AiError> {
        let system = PromptBuilder::edit_system_prompt();
        let user = PromptBuilder::edit_user_prompt(
            &edit_req.content,
            edit_req.selected_text.as_deref(),
            &edit_req.direction,
        );

        let req = GenerateRequest {
            system_prompt: system,
            user_prompt: user,
            max_tokens: Some(4096),
            temperature: Some(0.7),
        };

        let llm_stream = self
            .llm
            .generate_stream(req)
            .await
            .map_err(|e| AiError::GenerationFailed(e.to_string()))?;

        let draft_repo = self.draft_repo.clone();
        let log_repo = self.log_repo.clone();
        let direction = edit_req.direction.clone();
        let start = Instant::now();

        let stream = async_stream::stream! {
            let mut full_text = String::new();
            let mut final_model = String::new();
            let mut final_provider = String::new();
            let mut tokens_in: u32 = 0;
            let mut tokens_out: u32 = 0;

            let mut llm_stream = Box::pin(llm_stream);
            use futures::StreamExt;

            while let Some(result) = llm_stream.next().await {
                match result {
                    Ok(chunk) => {
                        if chunk.done {
                            if let Some(ref usage) = chunk.usage {
                                final_model = usage.model.clone();
                                final_provider = usage.provider.clone();
                                tokens_in = usage.token_count_input;
                                tokens_out = usage.token_count_output;
                            }

                            let next_version = match draft_repo.next_version(scene_id).await {
                                Ok(v) => v,
                                Err(e) => {
                                    yield Ok(SseEvent::Error { message: e.to_string() });
                                    return;
                                }
                            };

                            let draft = match draft_repo
                                .create(&CreateDraftParams {
                                    scene_id,
                                    version: next_version,
                                    content: full_text.clone(),
                                    source: DraftSource::AiEdit,
                                    edit_direction: Some(direction.clone()),
                                    model: if final_model.is_empty() { None } else { Some(final_model.clone()) },
                                    provider: if final_provider.is_empty() { None } else { Some(final_provider.clone()) },
                                    tokens_in: Some(tokens_in as i32),
                                    tokens_out: Some(tokens_out as i32),
                                    cost: None,
                                })
                                .await
                            {
                                Ok(d) => d,
                                Err(e) => {
                                    yield Ok(SseEvent::Error { message: e.to_string() });
                                    return;
                                }
                            };

                            let elapsed = start.elapsed().as_millis() as i32;
                            let log = GenerationLog {
                                id: Uuid::new_v4(),
                                user_id,
                                project_id: Some(project_id),
                                scene_id: Some(scene_id),
                                generation_type: GenerationType::Edit,
                                status: GenerationStatus::Success,
                                model: final_model.clone(),
                                provider: final_provider.clone(),
                                duration_ms: elapsed,
                                token_count_input: tokens_in as i32,
                                token_count_output: tokens_out as i32,
                                cost_usd: 0.0,
                                error_message: None,
                                created_at: chrono::Utc::now(),
                            };
                            let _ = log_repo.create(&log).await;

                            yield Ok(SseEvent::Completed { draft });
                        } else {
                            full_text.push_str(&chunk.text);
                            yield Ok(SseEvent::Token { text: chunk.text });
                        }
                    }
                    Err(e) => {
                        yield Ok(SseEvent::Error { message: e.to_string() });
                        return;
                    }
                }
            }
        };

        Ok(Box::pin(stream))
    }

    /// Save a manual draft.
    pub async fn save_manual_draft(
        &self,
        scene_id: Uuid,
        input: &CreateManualDraft,
    ) -> Result<Draft, AiError> {
        let version = self.draft_repo.next_version(scene_id).await?;
        self.draft_repo
            .create(&CreateDraftParams {
                scene_id,
                version,
                content: input.content.clone(),
                source: DraftSource::Manual,
                edit_direction: None,
                model: None,
                provider: None,
                tokens_in: None,
                tokens_out: None,
                cost: None,
            })
            .await
    }

    /// List draft summaries for a scene.
    pub async fn list_drafts(&self, scene_id: Uuid) -> Result<Vec<DraftSummary>, AiError> {
        self.draft_repo.list_by_scene(scene_id).await
    }

    /// Get a specific draft version.
    pub async fn get_draft(
        &self,
        scene_id: Uuid,
        version: i32,
    ) -> Result<Draft, AiError> {
        self.draft_repo
            .find_by_version(scene_id, version)
            .await?
            .ok_or(AiError::DraftNotFound)
    }

    /// Get the scene summary for a given scene.
    pub async fn get_scene_summary(
        &self,
        scene_id: Uuid,
    ) -> Result<SceneSummary, AiError> {
        self.summary_repo
            .find_by_scene(scene_id)
            .await?
            .ok_or(AiError::SceneNotFound)
    }

    /// Upsert a scene summary (manual or after generation).
    pub async fn upsert_scene_summary(
        &self,
        scene_id: Uuid,
        draft_version: i32,
        summary_text: &str,
        model: Option<&str>,
    ) -> Result<SceneSummary, AiError> {
        self.summary_repo
            .upsert(scene_id, draft_version, summary_text, model)
            .await
    }

    /// Get generation cost summary for a user.
    pub async fn user_cost_summary(
        &self,
        user_id: Uuid,
    ) -> Result<CostSummary, AiError> {
        self.log_repo.cost_summary_by_user(user_id).await
    }

    /// Get generation cost summary for a project.
    pub async fn project_cost_summary(
        &self,
        project_id: Uuid,
    ) -> Result<CostSummary, AiError> {
        self.log_repo.cost_summary_by_project(project_id).await
    }
}

/// SSE event types emitted by generation/edit streams.
#[derive(Debug, Clone)]
pub enum SseEvent {
    Token { text: String },
    Completed { draft: Draft },
    Error { message: String },
}
