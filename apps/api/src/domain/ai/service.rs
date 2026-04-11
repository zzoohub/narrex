use std::convert::Infallible;
use std::pin::Pin;
use std::sync::Arc;
use std::time::Instant;

use futures::Stream;
use uuid::Uuid;

use narrex_llm::{GenerateRequest, LlmProvider};
use tracing::warn;

use super::error::AiError;
use super::models::{
    CharactersOutput, CostSummary, CreateDraftParams, CreateManualDraft, Draft, DraftSource,
    DraftSummary, EditDraftRequest, GenerationLog, GenerationStatus, GenerationType, QuotaInfo,
    SceneSummary, StructuredOutput, TimelineOutput, WorldOutput, MONTHLY_GENERATION_LIMIT,
    MONTHLY_GENERATION_WARNING_THRESHOLD,
};
use super::ports::{
    AiService, ContextAssemblyRepository, DraftRepository, GenerationLogRepository,
    SceneSummaryRepository,
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
    llm: Arc<dyn LlmProvider>,
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
        llm: Arc<dyn LlmProvider>,
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
        locale: &str,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<SseEvent, Infallible>> + Send>>, AiError> {
        self.check_quota(user_id).await?;
        let ctx = self
            .context_repo
            .assemble_context(project_id, scene_id)
            .await?;

        let req = GenerateRequest {
            system_prompt: PromptBuilder::system_prompt(&ctx, locale),
            user_prompt: PromptBuilder::user_prompt(&ctx, locale),
            max_tokens: Some(16384),
            temperature: Some(0.8),
        };

        let llm_stream = self
            .llm
            .generate_stream(req)
            .await
            .map_err(|e| AiError::GenerationFailed(e.to_string()))?;

        Ok(self.build_generation_stream(
            llm_stream,
            user_id,
            project_id,
            scene_id,
            DraftSource::AiGeneration,
            GenerationType::Scene,
            None,
            true,
        ))
    }

    /// Edit a scene draft based on a direction, returning an SSE-compatible stream.
    pub async fn edit_scene_draft(
        &self,
        user_id: Uuid,
        project_id: Uuid,
        scene_id: Uuid,
        edit_req: &EditDraftRequest,
        locale: &str,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<SseEvent, Infallible>> + Send>>, AiError> {
        self.check_quota(user_id).await?;
        let has_selection = edit_req.selected_text.is_some();

        let req = GenerateRequest {
            system_prompt: PromptBuilder::edit_system_prompt(locale, has_selection),
            user_prompt: PromptBuilder::edit_user_prompt(
                &edit_req.content,
                edit_req.selected_text.as_deref(),
                &edit_req.direction,
                locale,
            ),
            max_tokens: Some(16384),
            temperature: Some(0.7),
        };

        let llm_stream = self
            .llm
            .generate_stream(req)
            .await
            .map_err(|e| AiError::GenerationFailed(e.to_string()))?;

        Ok(self.build_generation_stream(
            llm_stream,
            user_id,
            project_id,
            scene_id,
            DraftSource::AiEdit,
            GenerationType::Edit,
            Some(edit_req.direction.clone()),
            false,
        ))
    }

    /// Build the SSE stream that processes LLM chunks, saves drafts, logs, and updates scene.
    #[allow(clippy::too_many_arguments)]
    fn build_generation_stream(
        &self,
        llm_stream: impl Stream<Item = Result<narrex_llm::StreamChunk, narrex_llm::LlmError>>
            + Send
            + 'static,
        user_id: Uuid,
        project_id: Uuid,
        scene_id: Uuid,
        source: DraftSource,
        generation_type: GenerationType,
        edit_direction: Option<String>,
        update_scene_on_complete: bool,
    ) -> Pin<Box<dyn Stream<Item = Result<SseEvent, Infallible>> + Send>> {
        let draft_repo = self.draft_repo.clone();
        let scene_repo = self.scene_repo.clone();
        let log_repo = self.log_repo.clone();
        let log_repo_for_quota = self.log_repo.clone();
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
                                    source: source.clone(),
                                    edit_direction: edit_direction.clone(),
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

                            // Update scene status and content (only for generation, not edit).
                            if update_scene_on_complete {
                                let _ = scene_repo
                                    .update(
                                        scene_id,
                                        &crate::domain::timeline::models::UpdateScene {
                                            content: Some(Some(full_text.clone())),
                                            status: Some(crate::domain::timeline::models::SceneStatus::AiDraft),
                                            ..Default::default()
                                        },
                                    )
                                    .await;
                            }

                            // Log generation.
                            let elapsed = start.elapsed().as_millis() as i32;
                            let log = GenerationLog {
                                id: Uuid::new_v4(),
                                user_id,
                                project_id: Some(project_id),
                                scene_id: Some(scene_id),
                                generation_type: generation_type.clone(),
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

                            let quota = Self::build_quota_info(&log_repo_for_quota, user_id).await;
                            yield Ok(SseEvent::Completed { draft, quota });
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

        Box::pin(stream)
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
    pub async fn get_draft(&self, scene_id: Uuid, version: i32) -> Result<Draft, AiError> {
        self.draft_repo
            .find_by_version(scene_id, version)
            .await?
            .ok_or(AiError::DraftNotFound)
    }

    /// Get the scene summary for a given scene.
    pub async fn get_scene_summary(&self, scene_id: Uuid) -> Result<SceneSummary, AiError> {
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
    pub async fn user_cost_summary(&self, user_id: Uuid) -> Result<CostSummary, AiError> {
        self.log_repo.cost_summary_by_user(user_id).await
    }

    /// Get generation cost summary for a project.
    pub async fn project_cost_summary(&self, project_id: Uuid) -> Result<CostSummary, AiError> {
        self.log_repo.cost_summary_by_project(project_id).await
    }

    /// Call LLM to generate structured project data from raw text (non-streaming).
    /// Returns (StructuredOutput, model, provider, tokens_in, tokens_out).
    pub async fn generate_structure(
        &self,
        source_input: &str,
        clarification_answers: Option<&[String]>,
        locale: &str,
    ) -> Result<(StructuredOutput, String, String, u32, u32), AiError> {
        let system = PromptBuilder::structure_system_prompt(locale);
        let user = PromptBuilder::structure_user_prompt(source_input, clarification_answers);
        let req = GenerateRequest {
            system_prompt: system,
            user_prompt: user,
            max_tokens: Some(16384),
            temperature: Some(0.7),
        };

        let response = self
            .llm
            .generate(req)
            .await
            .map_err(|e| AiError::GenerationFailed(e.to_string()))?;

        // Try to extract JSON from response. LLM may wrap it in ```json ... ```
        let json_text = extract_json(&response.text).ok_or_else(|| {
            warn!(
                provider = %response.provider,
                model = %response.model,
                raw_len = response.text.len(),
                raw_preview = %response.text.chars().take(500).collect::<String>(),
                "failed to extract JSON from LLM response"
            );
            AiError::GenerationFailed("LLM did not return valid JSON".into())
        })?;

        let output: StructuredOutput = serde_json::from_str(&json_text)
            .map_err(|e| AiError::GenerationFailed(format!("failed to parse structure: {e}")))?;

        Ok((
            output,
            response.model,
            response.provider,
            response.token_count_input,
            response.token_count_output,
        ))
    }

    /// Stream Phase 1: world/setting (title, genre, theme, era, pov, tone).
    /// Returns an LLM token stream for the caller to consume.
    pub async fn stream_world(
        &self,
        source_input: &str,
        clarification_answers: Option<&[String]>,
        locale: &str,
    ) -> Result<
        Pin<Box<dyn Stream<Item = Result<narrex_llm::StreamChunk, narrex_llm::LlmError>> + Send>>,
        AiError,
    > {
        let system = PromptBuilder::world_system_prompt(locale);
        let user = PromptBuilder::world_user_prompt(source_input, clarification_answers);
        let req = GenerateRequest {
            system_prompt: system,
            user_prompt: user,
            max_tokens: Some(4096),
            temperature: Some(0.7),
        };
        self.llm
            .generate_stream(req)
            .await
            .map_err(|e| AiError::GenerationFailed(e.to_string()))
    }

    /// Stream Phase 2: characters + relationships.
    /// `world_context` is the raw JSON from Phase 1 for context chaining.
    pub async fn stream_characters(
        &self,
        source_input: &str,
        world_context: &str,
        locale: &str,
    ) -> Result<
        Pin<Box<dyn Stream<Item = Result<narrex_llm::StreamChunk, narrex_llm::LlmError>> + Send>>,
        AiError,
    > {
        let system = PromptBuilder::characters_system_prompt(locale);
        let user = PromptBuilder::characters_user_prompt(source_input, world_context);
        let req = GenerateRequest {
            system_prompt: system,
            user_prompt: user,
            max_tokens: Some(8192),
            temperature: Some(0.7),
        };
        self.llm
            .generate_stream(req)
            .await
            .map_err(|e| AiError::GenerationFailed(e.to_string()))
    }

    /// Stream Phase 3: timeline tracks + scenes.
    /// `world_context` and `characters_context` are raw JSON from Phases 1 & 2.
    pub async fn stream_timeline(
        &self,
        source_input: &str,
        world_context: &str,
        characters_context: &str,
        locale: &str,
    ) -> Result<
        Pin<Box<dyn Stream<Item = Result<narrex_llm::StreamChunk, narrex_llm::LlmError>> + Send>>,
        AiError,
    > {
        let system = PromptBuilder::timeline_system_prompt(locale);
        let user =
            PromptBuilder::timeline_user_prompt(source_input, world_context, characters_context);
        let req = GenerateRequest {
            system_prompt: system,
            user_prompt: user,
            max_tokens: Some(16384),
            temperature: Some(0.7),
        };
        self.llm
            .generate_stream(req)
            .await
            .map_err(|e| AiError::GenerationFailed(e.to_string()))
    }

    /// Retry Phase 3 with a JSON-only prompt (non-streaming).
    /// Called when `parse_timeline_output` fails on the streaming result.
    pub async fn retry_timeline(
        &self,
        source_input: &str,
        world_context: &str,
        characters_context: &str,
        failed_output: &str,
        locale: &str,
    ) -> Result<(TimelineOutput, String, String, u32, u32), AiError> {
        let system = PromptBuilder::timeline_retry_system_prompt(locale);
        let user = PromptBuilder::timeline_retry_user_prompt(
            source_input,
            world_context,
            characters_context,
            failed_output,
        );
        let req = GenerateRequest {
            system_prompt: system,
            user_prompt: user,
            max_tokens: Some(16384),
            temperature: Some(0.4),
        };
        let resp = self
            .llm
            .generate(req)
            .await
            .map_err(|e| AiError::GenerationFailed(e.to_string()))?;

        let output = parse_timeline_output(&resp.text)?;
        Ok((
            output,
            resp.model,
            resp.provider,
            resp.token_count_input,
            resp.token_count_output,
        ))
    }

    /// Check quota and return error if exceeded. Used before generation calls.
    pub async fn check_quota(&self, user_id: Uuid) -> Result<QuotaInfo, AiError> {
        let quota = self.get_quota(user_id).await?;
        if quota.exceeded {
            return Err(AiError::QuotaExceeded {
                used: quota.used,
                limit: quota.limit,
                resets_at: quota.resets_at,
            });
        }
        Ok(quota)
    }

    /// Get quota info without erroring on exceeded. Used for the GET endpoint.
    pub async fn get_quota(&self, user_id: Uuid) -> Result<QuotaInfo, AiError> {
        use chrono::{Datelike, TimeZone, Utc};

        let now = Utc::now();
        let month_start = Utc
            .with_ymd_and_hms(now.year(), now.month(), 1, 0, 0, 0)
            .single()
            .expect("valid date");

        let used = self
            .log_repo
            .count_by_user_since(user_id, month_start)
            .await?;

        let remaining = (MONTHLY_GENERATION_LIMIT - used).max(0);
        let exceeded = used >= MONTHLY_GENERATION_LIMIT;
        let warning = used >= MONTHLY_GENERATION_WARNING_THRESHOLD;

        let resets_at = if now.month() == 12 {
            Utc.with_ymd_and_hms(now.year() + 1, 1, 1, 0, 0, 0)
                .single()
                .expect("valid date")
        } else {
            Utc.with_ymd_and_hms(now.year(), now.month() + 1, 1, 0, 0, 0)
                .single()
                .expect("valid date")
        };

        Ok(QuotaInfo {
            used,
            limit: MONTHLY_GENERATION_LIMIT,
            remaining,
            warning,
            exceeded,
            resets_at,
        })
    }

    /// Log a generation event.
    pub async fn log_generation(&self, log: &GenerationLog) -> Result<(), AiError> {
        self.log_repo.create(log).await
    }

    /// Build QuotaInfo from a log repo. Used inside stream closures.
    async fn build_quota_info(log_repo: &GLR, user_id: Uuid) -> QuotaInfo {
        use chrono::{Datelike, TimeZone, Utc};

        let now = Utc::now();
        let month_start = Utc
            .with_ymd_and_hms(now.year(), now.month(), 1, 0, 0, 0)
            .single()
            .expect("valid date");

        let used = log_repo
            .count_by_user_since(user_id, month_start)
            .await
            .unwrap_or(0);

        let remaining = (MONTHLY_GENERATION_LIMIT - used).max(0);
        let exceeded = used >= MONTHLY_GENERATION_LIMIT;
        let warning = used >= MONTHLY_GENERATION_WARNING_THRESHOLD;

        let resets_at = if now.month() == 12 {
            Utc.with_ymd_and_hms(now.year() + 1, 1, 1, 0, 0, 0)
                .single()
                .expect("valid date")
        } else {
            Utc.with_ymd_and_hms(now.year(), now.month() + 1, 1, 0, 0, 0)
                .single()
                .expect("valid date")
        };

        QuotaInfo {
            used,
            limit: MONTHLY_GENERATION_LIMIT,
            remaining,
            warning,
            exceeded,
            resets_at,
        }
    }
}

/// Parse raw LLM text into WorldOutput (Phase 1).
pub fn parse_world_output(raw_text: &str) -> Result<WorldOutput, AiError> {
    let json = extract_json(raw_text).ok_or_else(|| {
        warn!(raw_preview = %raw_text.chars().take(200).collect::<String>(), "world: no valid JSON");
        AiError::GenerationFailed("World: LLM did not return valid JSON".into())
    })?;
    serde_json::from_str(&json)
        .map_err(|e| AiError::GenerationFailed(format!("World: parse error: {e}")))
}

/// Parse raw LLM text into CharactersOutput (Phase 2).
pub fn parse_characters_output(raw_text: &str) -> Result<CharactersOutput, AiError> {
    let json = extract_json(raw_text).ok_or_else(|| {
        warn!(raw_preview = %raw_text.chars().take(200).collect::<String>(), "characters: no valid JSON");
        AiError::GenerationFailed("Characters: LLM did not return valid JSON".into())
    })?;
    serde_json::from_str(&json)
        .map_err(|e| AiError::GenerationFailed(format!("Characters: parse error: {e}")))
}

/// Parse raw LLM text into TimelineOutput (Phase 3).
pub fn parse_timeline_output(raw_text: &str) -> Result<TimelineOutput, AiError> {
    let json = extract_json(raw_text).ok_or_else(|| {
        warn!(raw_preview = %raw_text.chars().take(200).collect::<String>(), "timeline: no valid JSON");
        AiError::GenerationFailed("Timeline: LLM did not return valid JSON".into())
    })?;
    serde_json::from_str(&json)
        .map_err(|e| AiError::GenerationFailed(format!("Timeline: parse error: {e}")))
}

/// Public accessor for extract_json (used by handler for context chaining).
pub fn extract_json_from_raw(text: &str) -> Option<String> {
    extract_json(text)
}

/// Extract JSON from LLM response text, handling optional markdown fences
/// and surrounding prose.
fn extract_json(text: &str) -> Option<String> {
    // Try to find JSON block in ```json ... ``` fences
    if let Some(start) = text.find("```json") {
        let after = &text[start + 7..];
        if let Some(end) = after.find("```") {
            return Some(after[..end].trim().to_string());
        }
    }
    // Try to find JSON block in ``` ... ``` fences
    if let Some(start) = text.find("```") {
        let after = &text[start + 3..];
        if let Some(end) = after.find("```") {
            let candidate = after[..end].trim();
            if candidate.starts_with('{') {
                return Some(candidate.to_string());
            }
        }
    }
    // Find the outermost JSON object by brace-depth counting.
    // Handles text before/after the JSON and nested braces inside strings.
    find_outermost_json_object(text)
}

/// Locate the first top-level `{...}` in `text`, respecting JSON strings.
fn find_outermost_json_object(text: &str) -> Option<String> {
    let bytes = text.as_bytes();
    let mut start: Option<usize> = None;
    let mut depth: i32 = 0;
    let mut in_string = false;
    let mut escape = false;
    let mut i = 0;

    while i < bytes.len() {
        let b = bytes[i];

        if escape {
            escape = false;
            i += 1;
            continue;
        }

        if b == b'\\' && in_string {
            escape = true;
            i += 1;
            continue;
        }

        if b == b'"' {
            in_string = !in_string;
            i += 1;
            continue;
        }

        if in_string {
            i += 1;
            continue;
        }

        if b == b'{' {
            if depth == 0 {
                start = Some(i);
            }
            depth += 1;
        } else if b == b'}' {
            depth -= 1;
            if depth == 0 {
                if let Some(s) = start {
                    return Some(text[s..=i].to_string());
                }
            }
        }

        i += 1;
    }

    None
}

/// SSE event types emitted by generation/edit streams.
#[derive(Debug, Clone)]
pub enum SseEvent {
    Token {
        text: String,
    },
    Completed {
        draft: Draft,
        quota: QuotaInfo,
    },
    Progress {
        message: String,
    },
    StructuringCompleted {
        workspace: crate::domain::project::models::Workspace,
    },
    Error {
        message: String,
    },
}

// ---------------------------------------------------------------------------
// AiService trait implementation (delegates to inherent methods)
// ---------------------------------------------------------------------------

#[async_trait::async_trait]
impl<DR, SSR, GLR, CAR, SR> AiService for AiServiceImpl<DR, SSR, GLR, CAR, SR>
where
    DR: DraftRepository,
    SSR: SceneSummaryRepository,
    GLR: GenerationLogRepository,
    CAR: ContextAssemblyRepository,
    SR: SceneRepository,
{
    async fn generate_scene_draft(
        &self,
        user_id: Uuid,
        project_id: Uuid,
        scene_id: Uuid,
        locale: &str,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<SseEvent, Infallible>> + Send>>, AiError> {
        Self::generate_scene_draft(self, user_id, project_id, scene_id, locale).await
    }
    async fn edit_scene_draft(
        &self,
        user_id: Uuid,
        project_id: Uuid,
        scene_id: Uuid,
        edit_req: &EditDraftRequest,
        locale: &str,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<SseEvent, Infallible>> + Send>>, AiError> {
        Self::edit_scene_draft(self, user_id, project_id, scene_id, edit_req, locale).await
    }
    async fn save_manual_draft(
        &self,
        scene_id: Uuid,
        input: &CreateManualDraft,
    ) -> Result<Draft, AiError> {
        Self::save_manual_draft(self, scene_id, input).await
    }
    async fn list_drafts(&self, scene_id: Uuid) -> Result<Vec<DraftSummary>, AiError> {
        Self::list_drafts(self, scene_id).await
    }
    async fn get_draft(&self, scene_id: Uuid, version: i32) -> Result<Draft, AiError> {
        Self::get_draft(self, scene_id, version).await
    }
    async fn get_scene_summary(&self, scene_id: Uuid) -> Result<SceneSummary, AiError> {
        Self::get_scene_summary(self, scene_id).await
    }
    async fn upsert_scene_summary(
        &self,
        scene_id: Uuid,
        draft_version: i32,
        summary_text: &str,
        model: Option<&str>,
    ) -> Result<SceneSummary, AiError> {
        Self::upsert_scene_summary(self, scene_id, draft_version, summary_text, model).await
    }
    async fn user_cost_summary(&self, user_id: Uuid) -> Result<CostSummary, AiError> {
        Self::user_cost_summary(self, user_id).await
    }
    async fn project_cost_summary(&self, project_id: Uuid) -> Result<CostSummary, AiError> {
        Self::project_cost_summary(self, project_id).await
    }
    async fn get_quota(&self, user_id: Uuid) -> Result<QuotaInfo, AiError> {
        Self::get_quota(self, user_id).await
    }
    async fn check_quota(&self, user_id: Uuid) -> Result<QuotaInfo, AiError> {
        Self::check_quota(self, user_id).await
    }
    async fn stream_world(
        &self,
        source_input: &str,
        clarification_answers: Option<&[String]>,
        locale: &str,
    ) -> Result<
        Pin<Box<dyn Stream<Item = Result<narrex_llm::StreamChunk, narrex_llm::LlmError>> + Send>>,
        AiError,
    > {
        Self::stream_world(self, source_input, clarification_answers, locale).await
    }
    async fn stream_characters(
        &self,
        source_input: &str,
        world_context: &str,
        locale: &str,
    ) -> Result<
        Pin<Box<dyn Stream<Item = Result<narrex_llm::StreamChunk, narrex_llm::LlmError>> + Send>>,
        AiError,
    > {
        Self::stream_characters(self, source_input, world_context, locale).await
    }
    async fn stream_timeline(
        &self,
        source_input: &str,
        world_context: &str,
        characters_context: &str,
        locale: &str,
    ) -> Result<
        Pin<Box<dyn Stream<Item = Result<narrex_llm::StreamChunk, narrex_llm::LlmError>> + Send>>,
        AiError,
    > {
        Self::stream_timeline(
            self,
            source_input,
            world_context,
            characters_context,
            locale,
        )
        .await
    }
    async fn retry_timeline(
        &self,
        source_input: &str,
        world_context: &str,
        characters_context: &str,
        failed_output: &str,
        locale: &str,
    ) -> Result<(TimelineOutput, String, String, u32, u32), AiError> {
        Self::retry_timeline(
            self,
            source_input,
            world_context,
            characters_context,
            failed_output,
            locale,
        )
        .await
    }
    async fn generate_structure(
        &self,
        source_input: &str,
        clarification_answers: Option<&[String]>,
        locale: &str,
    ) -> Result<(StructuredOutput, String, String, u32, u32), AiError> {
        Self::generate_structure(self, source_input, clarification_answers, locale).await
    }
    async fn log_generation(&self, log: &GenerationLog) -> Result<(), AiError> {
        Self::log_generation(self, log).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::ai::models::StructuredOutput;

    // ---- extract_json tests ----

    #[test]
    fn extract_json_raw_json() {
        let raw = r#"{"title": "test", "characters": [], "relationships": [], "tracks": []}"#;
        let result = extract_json(raw).unwrap();
        assert!(result.starts_with('{'));
        let parsed: StructuredOutput = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed.title, "test");
    }

    #[test]
    fn extract_json_fenced_json() {
        let raw = "Some preamble\n```json\n{\"title\": \"fenced\", \"characters\": [], \"relationships\": [], \"tracks\": []}\n```\nSome postamble";
        let result = extract_json(raw).unwrap();
        let parsed: StructuredOutput = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed.title, "fenced");
    }

    #[test]
    fn extract_json_generic_fence() {
        let raw = "Here:\n```\n{\"title\": \"generic\", \"characters\": [], \"relationships\": [], \"tracks\": []}\n```\n";
        let result = extract_json(raw).unwrap();
        let parsed: StructuredOutput = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed.title, "generic");
    }

    #[test]
    fn extract_json_no_json() {
        let raw = "This is just plain text without any JSON.";
        assert!(extract_json(raw).is_none());
    }

    #[test]
    fn extract_json_whitespace_around_raw() {
        let raw = "  \n  {\"title\": \"spaced\", \"characters\": [], \"relationships\": [], \"tracks\": []}  \n  ";
        let result = extract_json(raw).unwrap();
        let parsed: StructuredOutput = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed.title, "spaced");
    }

    #[test]
    fn extract_json_text_before_json() {
        let raw = "여기 결과입니다:\n{\"title\": \"preamble\", \"characters\": [], \"relationships\": [], \"tracks\": []}";
        let result = extract_json(raw).unwrap();
        let parsed: StructuredOutput = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed.title, "preamble");
    }

    #[test]
    fn extract_json_text_after_json() {
        let raw = "{\"title\": \"postamble\", \"characters\": [], \"relationships\": [], \"tracks\": []}\n추가 설명이 있습니다.";
        let result = extract_json(raw).unwrap();
        let parsed: StructuredOutput = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed.title, "postamble");
    }

    #[test]
    fn extract_json_text_before_and_after() {
        let raw = "분석 결과:\n{\"title\": \"surrounded\", \"characters\": [{\"name\": \"A\"}], \"relationships\": [], \"tracks\": []}\n이상입니다.";
        let result = extract_json(raw).unwrap();
        let parsed: StructuredOutput = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed.title, "surrounded");
        assert_eq!(parsed.characters.len(), 1);
    }

    #[test]
    fn extract_json_nested_braces() {
        let raw = "결과:\n{\"title\": \"nested\", \"characters\": [{\"name\": \"A\", \"personality\": \"brave\"}], \"relationships\": [], \"tracks\": [{\"scenes\": [{\"title\": \"S1\"}]}]}\n끝.";
        let result = extract_json(raw).unwrap();
        let parsed: StructuredOutput = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed.title, "nested");
        assert_eq!(parsed.tracks.len(), 1);
    }

    #[test]
    fn extract_json_fenced_without_closing_fence() {
        // LLM response truncated — ```json present but no closing ```
        let raw = "```json\n{\"title\": \"truncated fence\", \"characters\": [], \"relationships\": [], \"tracks\": []}";
        let result = extract_json(raw).unwrap();
        let parsed: StructuredOutput = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed.title, "truncated fence");
    }

    #[test]
    fn extract_json_braces_in_strings_ignored() {
        let raw = "{\"title\": \"has {braces} inside\", \"characters\": [], \"relationships\": [], \"tracks\": []}";
        let result = extract_json(raw).unwrap();
        let parsed: StructuredOutput = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed.title, "has {braces} inside");
    }

    // ---- generate_structure tests ----

    #[tokio::test]
    async fn generate_structure_success() {
        let llm_response_text = r#"{"title": "AI 프로젝트", "genre": "SF", "theme": "인공지능", "characters": [{"name": "로봇"}], "relationships": [], "tracks": [{"scenes": [{"title": "시작"}]}]}"#;
        let mock_llm = MockLlmProvider::new(llm_response_text.to_string());
        let svc = build_test_ai_service(mock_llm);

        let (output, model, provider, tokens_in, tokens_out) = svc
            .generate_structure("나의 이야기", None, "ko")
            .await
            .unwrap();

        assert_eq!(output.title, "AI 프로젝트");
        assert_eq!(output.genre.as_deref(), Some("SF"));
        assert_eq!(output.characters.len(), 1);
        assert_eq!(output.characters[0].name, "로봇");
        assert_eq!(output.tracks.len(), 1);
        assert_eq!(model, "test-model");
        assert_eq!(provider, "test-provider");
        assert_eq!(tokens_in, 100);
        assert_eq!(tokens_out, 200);
    }

    #[tokio::test]
    async fn generate_structure_with_fenced_response() {
        let llm_response_text = "Here is the structure:\n```json\n{\"title\": \"Fenced\", \"characters\": [], \"relationships\": [], \"tracks\": []}\n```";
        let mock_llm = MockLlmProvider::new(llm_response_text.to_string());
        let svc = build_test_ai_service(mock_llm);

        let (output, _, _, _, _) = svc.generate_structure("텍스트", None, "ko").await.unwrap();

        assert_eq!(output.title, "Fenced");
    }

    #[tokio::test]
    async fn generate_structure_with_text_wrapped_json() {
        let llm_response_text = "분석 결과입니다:\n{\"title\": \"Wrapped\", \"characters\": [], \"relationships\": [], \"tracks\": []}\n이상입니다.";
        let mock_llm = MockLlmProvider::new(llm_response_text.to_string());
        let svc = build_test_ai_service(mock_llm);

        let (output, _, _, _, _) = svc.generate_structure("텍스트", None, "ko").await.unwrap();

        assert_eq!(output.title, "Wrapped");
    }

    #[tokio::test]
    async fn generate_structure_invalid_json_errors() {
        let mock_llm = MockLlmProvider::new("not json at all".to_string());
        let svc = build_test_ai_service(mock_llm);

        let err = svc
            .generate_structure("텍스트", None, "ko")
            .await
            .unwrap_err();
        match err {
            AiError::GenerationFailed(msg) => assert!(msg.contains("valid JSON")),
            other => panic!("expected GenerationFailed, got: {other:?}"),
        }
    }

    #[tokio::test]
    async fn generate_structure_llm_error_propagates() {
        let mock_llm = MockLlmProvider::failing();
        let svc = build_test_ai_service(mock_llm);

        let err = svc
            .generate_structure("텍스트", None, "ko")
            .await
            .unwrap_err();
        match err {
            AiError::GenerationFailed(msg) => assert!(msg.contains("provider unavailable")),
            other => panic!("expected GenerationFailed, got: {other:?}"),
        }
    }

    // ---- parse_world_output tests ----

    #[test]
    fn parse_world_output_success() {
        let raw = r#"{"title": "테스트", "genre": "SF", "theme": "AI", "era_location": "미래", "pov": "1인칭", "tone": "긴장감"}"#;
        let output = parse_world_output(raw).unwrap();
        assert_eq!(output.title, "테스트");
        assert_eq!(output.genre.as_deref(), Some("SF"));
    }

    #[test]
    fn parse_world_output_with_fences() {
        let raw = "결과:\n```json\n{\"title\": \"Fenced\", \"genre\": \"Fantasy\"}\n```";
        let output = parse_world_output(raw).unwrap();
        assert_eq!(output.title, "Fenced");
    }

    #[test]
    fn parse_world_output_invalid_json() {
        let err = parse_world_output("not json").unwrap_err();
        match err {
            AiError::GenerationFailed(msg) => assert!(msg.contains("valid JSON")),
            other => panic!("expected GenerationFailed, got: {other:?}"),
        }
    }

    // ---- parse_characters_output tests ----

    #[test]
    fn parse_characters_output_success() {
        let raw = r#"{"characters": [{"name": "A"}], "relationships": []}"#;
        let output = parse_characters_output(raw).unwrap();
        assert_eq!(output.characters.len(), 1);
    }

    #[test]
    fn parse_characters_output_with_fences() {
        let raw = "결과:\n```json\n{\"characters\": [], \"relationships\": []}\n```";
        let output = parse_characters_output(raw).unwrap();
        assert_eq!(output.characters.len(), 0);
    }

    #[test]
    fn parse_characters_output_invalid_json() {
        let err = parse_characters_output("not json").unwrap_err();
        match err {
            AiError::GenerationFailed(msg) => assert!(msg.contains("valid JSON")),
            other => panic!("expected GenerationFailed, got: {other:?}"),
        }
    }

    // ---- parse_timeline_output tests ----

    #[test]
    fn parse_timeline_output_success() {
        let raw = r#"{"tracks": [{"label": "메인", "scenes": [{"title": "시작"}]}]}"#;
        let output = parse_timeline_output(raw).unwrap();
        assert_eq!(output.tracks.len(), 1);
        assert_eq!(output.tracks[0].scenes[0].title, "시작");
    }

    #[test]
    fn parse_timeline_output_invalid_json() {
        let err = parse_timeline_output("garbage").unwrap_err();
        match err {
            AiError::GenerationFailed(msg) => assert!(msg.contains("valid JSON")),
            other => panic!("expected GenerationFailed, got: {other:?}"),
        }
    }

    #[test]
    fn parse_timeline_output_narrative_without_json() {
        // Simulates LLM ending with "### JSON 데이터\n타임라인" without actual JSON
        let raw = "등장인물 설명...\n\n### JSON 데이터\n타임라인";
        let err = parse_timeline_output(raw).unwrap_err();
        match err {
            AiError::GenerationFailed(msg) => assert!(msg.contains("valid JSON")),
            other => panic!("expected GenerationFailed, got: {other:?}"),
        }
    }

    #[test]
    fn parse_timeline_output_truncated_json_in_fence() {
        // Simulates LLM output where JSON block is truncated (no closing ```)
        let raw = "설명...\n```json\n{\"tracks\": [{\"label\": \"메인\", \"scenes\": [{\"title\": \"시작\"}]}]}";
        let output = parse_timeline_output(raw).unwrap();
        assert_eq!(output.tracks.len(), 1);
    }

    // ---- stream_world / stream_characters / stream_timeline tests ----

    #[tokio::test]
    async fn stream_world_calls_generate_stream() {
        let mock_llm = MockStreamingLlmProvider::new(vec![
            narrex_llm::StreamChunk {
                text: "{\"title\":\"T\",".into(),
                done: false,
                usage: None,
            },
            narrex_llm::StreamChunk {
                text: "\"genre\":\"SF\"}".into(),
                done: false,
                usage: None,
            },
            narrex_llm::StreamChunk {
                text: String::new(),
                done: true,
                usage: Some(narrex_llm::StreamUsage {
                    model: "m".into(),
                    provider: "p".into(),
                    token_count_input: 10,
                    token_count_output: 20,
                }),
            },
        ]);
        let svc = build_test_ai_service(mock_llm);

        let stream = svc.stream_world("test input", None, "ko").await.unwrap();
        let chunks: Vec<_> = {
            use futures::StreamExt;
            Box::pin(stream).collect::<Vec<_>>().await
        };
        assert_eq!(chunks.len(), 3);
        assert!(!chunks[0].as_ref().unwrap().done);
        assert!(chunks[2].as_ref().unwrap().done);
    }

    #[tokio::test]
    async fn stream_characters_uses_world_context() {
        let mock_llm = MockStreamingLlmProvider::new(vec![
            narrex_llm::StreamChunk {
                text: "{\"characters\":[],\"relationships\":[]}".into(),
                done: false,
                usage: None,
            },
            narrex_llm::StreamChunk {
                text: String::new(),
                done: true,
                usage: Some(narrex_llm::StreamUsage {
                    model: "m".into(),
                    provider: "p".into(),
                    token_count_input: 10,
                    token_count_output: 20,
                }),
            },
        ]);
        let svc = build_test_ai_service(mock_llm);

        let stream = svc
            .stream_characters("test input", "{\"title\":\"T\"}", "ko")
            .await
            .unwrap();
        let chunks: Vec<_> = {
            use futures::StreamExt;
            Box::pin(stream).collect::<Vec<_>>().await
        };
        assert_eq!(chunks.len(), 2);
    }

    #[tokio::test]
    async fn stream_timeline_includes_world_and_character_context() {
        let mock_llm = MockStreamingLlmProvider::new(vec![
            narrex_llm::StreamChunk {
                text: "{\"tracks\":[]}".into(),
                done: false,
                usage: None,
            },
            narrex_llm::StreamChunk {
                text: String::new(),
                done: true,
                usage: Some(narrex_llm::StreamUsage {
                    model: "m".into(),
                    provider: "p".into(),
                    token_count_input: 10,
                    token_count_output: 20,
                }),
            },
        ]);
        let svc = build_test_ai_service(mock_llm);

        let stream = svc
            .stream_timeline("input", "{\"title\":\"T\"}", "{\"characters\":[]}", "ko")
            .await
            .unwrap();
        let chunks: Vec<_> = {
            use futures::StreamExt;
            Box::pin(stream).collect::<Vec<_>>().await
        };
        assert_eq!(chunks.len(), 2);
    }

    // ---- retry_timeline tests ----

    #[tokio::test]
    async fn retry_timeline_succeeds_with_valid_json() {
        let json = r#"{"tracks": [{"label": "메인", "scenes": [{"title": "시작"}]}]}"#;
        let mock_llm = MockLlmProvider::new(json.to_string());
        let svc = build_test_ai_service(mock_llm);

        let (output, model, provider, _, _) = svc
            .retry_timeline("input", "{}", "{}", "previous failed output", "ko")
            .await
            .unwrap();

        assert_eq!(output.tracks.len(), 1);
        assert_eq!(output.tracks[0].scenes[0].title, "시작");
        assert_eq!(model, "test-model");
        assert_eq!(provider, "test-provider");
    }

    #[tokio::test]
    async fn retry_timeline_fails_when_llm_returns_no_json() {
        let mock_llm = MockLlmProvider::new("still no json".to_string());
        let svc = build_test_ai_service(mock_llm);

        let err = svc
            .retry_timeline("input", "{}", "{}", "failed", "ko")
            .await
            .unwrap_err();

        match err {
            AiError::GenerationFailed(msg) => assert!(msg.contains("valid JSON")),
            other => panic!("expected GenerationFailed, got: {other:?}"),
        }
    }

    #[tokio::test]
    async fn retry_timeline_fails_when_llm_unavailable() {
        let mock_llm = MockLlmProvider::failing();
        let svc = build_test_ai_service(mock_llm);

        let err = svc
            .retry_timeline("input", "{}", "{}", "failed", "ko")
            .await
            .unwrap_err();

        match err {
            AiError::GenerationFailed(msg) => assert!(msg.contains("provider unavailable")),
            other => panic!("expected GenerationFailed, got: {other:?}"),
        }
    }

    // ---- log_generation tests ----

    #[tokio::test]
    async fn log_generation_delegates_to_repo() {
        let mock_llm = MockLlmProvider::new("{}".to_string());
        let svc = build_test_ai_service(mock_llm);

        let log = GenerationLog {
            id: uuid::Uuid::new_v4(),
            user_id: uuid::Uuid::new_v4(),
            project_id: Some(uuid::Uuid::new_v4()),
            scene_id: None,
            generation_type: GenerationType::Structuring,
            status: GenerationStatus::Success,
            model: "test".into(),
            provider: "test".into(),
            duration_ms: 100,
            token_count_input: 10,
            token_count_output: 20,
            cost_usd: 0.0,
            error_message: None,
            created_at: chrono::Utc::now(),
        };

        // Should not error
        svc.log_generation(&log).await.unwrap();
    }

    // ---- Test helpers ----

    use std::pin::Pin;
    use std::sync::Arc;

    #[derive(Clone)]
    struct MockLlmProvider {
        response: Option<String>,
    }

    impl MockLlmProvider {
        fn new(text: String) -> Arc<Self> {
            Arc::new(Self {
                response: Some(text),
            })
        }
        fn failing() -> Arc<Self> {
            Arc::new(Self { response: None })
        }
    }

    #[async_trait::async_trait]
    impl narrex_llm::LlmProvider for MockLlmProvider {
        async fn generate(
            &self,
            _req: narrex_llm::GenerateRequest,
        ) -> Result<narrex_llm::GenerateResponse, narrex_llm::LlmError> {
            match &self.response {
                Some(text) => Ok(narrex_llm::GenerateResponse {
                    text: text.clone(),
                    model: "test-model".into(),
                    provider: "test-provider".into(),
                    token_count_input: 100,
                    token_count_output: 200,
                }),
                None => Err(narrex_llm::LlmError::Unavailable(
                    "provider unavailable".into(),
                )),
            }
        }

        async fn generate_stream(
            &self,
            _req: narrex_llm::GenerateRequest,
        ) -> Result<
            Pin<
                Box<
                    dyn futures::Stream<
                            Item = Result<narrex_llm::StreamChunk, narrex_llm::LlmError>,
                        > + Send,
                >,
            >,
            narrex_llm::LlmError,
        > {
            Err(narrex_llm::LlmError::Unavailable("not used in test".into()))
        }

        fn name(&self) -> &str {
            "mock"
        }
    }

    /// Mock LLM that supports generate_stream, yielding pre-defined chunks.
    #[derive(Clone)]
    struct MockStreamingLlmProvider {
        chunks: Vec<narrex_llm::StreamChunk>,
    }

    impl MockStreamingLlmProvider {
        fn new(chunks: Vec<narrex_llm::StreamChunk>) -> Arc<Self> {
            Arc::new(Self { chunks })
        }
    }

    #[async_trait::async_trait]
    impl narrex_llm::LlmProvider for MockStreamingLlmProvider {
        async fn generate(
            &self,
            _req: narrex_llm::GenerateRequest,
        ) -> Result<narrex_llm::GenerateResponse, narrex_llm::LlmError> {
            Err(narrex_llm::LlmError::Unavailable(
                "use generate_stream".into(),
            ))
        }

        async fn generate_stream(
            &self,
            _req: narrex_llm::GenerateRequest,
        ) -> Result<
            Pin<
                Box<
                    dyn futures::Stream<
                            Item = Result<narrex_llm::StreamChunk, narrex_llm::LlmError>,
                        > + Send,
                >,
            >,
            narrex_llm::LlmError,
        > {
            let chunks = self.chunks.clone();
            let stream = futures::stream::iter(chunks.into_iter().map(Ok));
            Ok(Box::pin(stream))
        }

        fn name(&self) -> &str {
            "mock-streaming"
        }
    }

    // Mock repositories for AiServiceImpl

    #[derive(Clone)]
    struct MockDraftRepo;

    #[async_trait::async_trait]
    impl crate::domain::ai::ports::DraftRepository for MockDraftRepo {
        async fn create(&self, _params: &CreateDraftParams) -> Result<Draft, AiError> {
            unimplemented!()
        }
        async fn find_latest_by_scene(
            &self,
            _scene_id: uuid::Uuid,
        ) -> Result<Option<Draft>, AiError> {
            Ok(None)
        }
        async fn find_by_version(
            &self,
            _scene_id: uuid::Uuid,
            _version: i32,
        ) -> Result<Option<Draft>, AiError> {
            Ok(None)
        }
        async fn list_by_scene(&self, _scene_id: uuid::Uuid) -> Result<Vec<DraftSummary>, AiError> {
            Ok(vec![])
        }
        async fn next_version(&self, _scene_id: uuid::Uuid) -> Result<i32, AiError> {
            Ok(1)
        }
    }

    #[derive(Clone)]
    struct MockSummaryRepo;

    #[async_trait::async_trait]
    impl crate::domain::ai::ports::SceneSummaryRepository for MockSummaryRepo {
        async fn upsert(
            &self,
            _: uuid::Uuid,
            _: i32,
            _: &str,
            _: Option<&str>,
        ) -> Result<SceneSummary, AiError> {
            unimplemented!()
        }
        async fn find_by_scene(&self, _: uuid::Uuid) -> Result<Option<SceneSummary>, AiError> {
            Ok(None)
        }
        async fn find_preceding(
            &self,
            _: uuid::Uuid,
            _: f64,
        ) -> Result<Vec<SceneSummary>, AiError> {
            Ok(vec![])
        }
    }

    #[derive(Clone)]
    struct MockLogRepo {
        logs: std::sync::Arc<std::sync::Mutex<Vec<GenerationLog>>>,
        count_override: std::sync::Arc<std::sync::Mutex<Option<i64>>>,
    }

    impl MockLogRepo {
        fn new() -> Self {
            Self {
                logs: std::sync::Arc::new(std::sync::Mutex::new(vec![])),
                count_override: std::sync::Arc::new(std::sync::Mutex::new(None)),
            }
        }
        fn with_count(count: i64) -> Self {
            Self {
                logs: std::sync::Arc::new(std::sync::Mutex::new(vec![])),
                count_override: std::sync::Arc::new(std::sync::Mutex::new(Some(count))),
            }
        }
    }

    #[async_trait::async_trait]
    impl crate::domain::ai::ports::GenerationLogRepository for MockLogRepo {
        async fn create(&self, log: &GenerationLog) -> Result<(), AiError> {
            self.logs.lock().unwrap().push(log.clone());
            Ok(())
        }
        async fn cost_summary_by_user(&self, _: uuid::Uuid) -> Result<CostSummary, AiError> {
            Ok(CostSummary {
                total_generations: 0,
                total_tokens_input: 0,
                total_tokens_output: 0,
                total_cost_usd: 0.0,
            })
        }
        async fn cost_summary_by_project(&self, _: uuid::Uuid) -> Result<CostSummary, AiError> {
            Ok(CostSummary {
                total_generations: 0,
                total_tokens_input: 0,
                total_tokens_output: 0,
                total_cost_usd: 0.0,
            })
        }
        async fn count_by_user_since(
            &self,
            _: uuid::Uuid,
            _: chrono::DateTime<chrono::Utc>,
        ) -> Result<i64, AiError> {
            Ok(self.count_override.lock().unwrap().unwrap_or(0))
        }
    }

    #[derive(Clone)]
    struct MockContextRepo;

    #[async_trait::async_trait]
    impl crate::domain::ai::ports::ContextAssemblyRepository for MockContextRepo {
        async fn assemble_context(
            &self,
            _: uuid::Uuid,
            _: uuid::Uuid,
        ) -> Result<crate::domain::ai::models::GenerationContext, AiError> {
            unimplemented!()
        }
    }

    #[derive(Clone)]
    struct MockSceneRepo {
        updates:
            std::sync::Arc<std::sync::Mutex<Vec<crate::domain::timeline::models::UpdateScene>>>,
    }

    impl MockSceneRepo {
        fn new() -> Self {
            Self {
                updates: std::sync::Arc::new(std::sync::Mutex::new(vec![])),
            }
        }
    }

    #[async_trait::async_trait]
    impl crate::domain::timeline::ports::SceneRepository for MockSceneRepo {
        async fn create(
            &self,
            _: uuid::Uuid,
            _: &crate::domain::timeline::models::CreateScene,
        ) -> Result<
            crate::domain::timeline::models::Scene,
            crate::domain::timeline::error::TimelineError,
        > {
            unimplemented!()
        }
        async fn find_by_id(
            &self,
            _: uuid::Uuid,
        ) -> Result<
            Option<crate::domain::timeline::models::Scene>,
            crate::domain::timeline::error::TimelineError,
        > {
            Ok(None)
        }
        async fn find_detail_by_id(
            &self,
            _: uuid::Uuid,
        ) -> Result<
            Option<crate::domain::timeline::models::SceneDetail>,
            crate::domain::timeline::error::TimelineError,
        > {
            Ok(None)
        }
        async fn update(
            &self,
            _id: uuid::Uuid,
            update: &crate::domain::timeline::models::UpdateScene,
        ) -> Result<
            crate::domain::timeline::models::Scene,
            crate::domain::timeline::error::TimelineError,
        > {
            self.updates.lock().unwrap().push(update.clone());
            Ok(crate::domain::timeline::models::Scene {
                id: _id,
                track_id: uuid::Uuid::new_v4(),
                project_id: uuid::Uuid::new_v4(),
                start_position: 0.0,
                duration: 1.0,
                status: crate::domain::timeline::models::SceneStatus::AiDraft,
                title: "test".into(),
                plot_summary: None,
                location: None,
                mood_tags: vec![],
                content: update.content.as_ref().and_then(|c| c.clone()),
                character_ids: vec![],
                created_at: chrono::Utc::now(),
                updated_at: chrono::Utc::now(),
            })
        }
        async fn delete(
            &self,
            _: uuid::Uuid,
        ) -> Result<(), crate::domain::timeline::error::TimelineError> {
            Ok(())
        }
        async fn find_max_position(
            &self,
            _: uuid::Uuid,
        ) -> Result<f64, crate::domain::timeline::error::TimelineError> {
            Ok(0.0)
        }
        async fn mark_needs_revision(
            &self,
            _: uuid::Uuid,
        ) -> Result<(), crate::domain::timeline::error::TimelineError> {
            Ok(())
        }
    }

    fn build_test_ai_service(
        llm: Arc<dyn narrex_llm::LlmProvider>,
    ) -> AiServiceImpl<MockDraftRepo, MockSummaryRepo, MockLogRepo, MockContextRepo, MockSceneRepo>
    {
        AiServiceImpl::new(
            MockDraftRepo,
            MockSummaryRepo,
            MockLogRepo::new(),
            MockContextRepo,
            MockSceneRepo::new(),
            llm,
        )
    }

    fn build_test_ai_service_with_log_repo(
        llm: Arc<dyn narrex_llm::LlmProvider>,
        log_repo: MockLogRepo,
    ) -> AiServiceImpl<MockDraftRepo, MockSummaryRepo, MockLogRepo, MockContextRepo, MockSceneRepo>
    {
        AiServiceImpl::new(
            MockDraftRepo,
            MockSummaryRepo,
            log_repo,
            MockContextRepo,
            MockSceneRepo::new(),
            llm,
        )
    }

    // ---- quota tests ----

    #[tokio::test]
    async fn get_quota_below_warning() {
        let log_repo = MockLogRepo::with_count(3);
        let svc = build_test_ai_service_with_log_repo(MockLlmProvider::new("{}".into()), log_repo);
        let quota = svc.get_quota(Uuid::new_v4()).await.unwrap();
        assert_eq!(quota.used, 3);
        assert_eq!(quota.limit, 10);
        assert_eq!(quota.remaining, 7);
        assert!(!quota.warning);
        assert!(!quota.exceeded);
    }

    #[tokio::test]
    async fn get_quota_at_warning_threshold() {
        let log_repo = MockLogRepo::with_count(7);
        let svc = build_test_ai_service_with_log_repo(MockLlmProvider::new("{}".into()), log_repo);
        let quota = svc.get_quota(Uuid::new_v4()).await.unwrap();
        assert_eq!(quota.used, 7);
        assert_eq!(quota.remaining, 3);
        assert!(quota.warning);
        assert!(!quota.exceeded);
    }

    #[tokio::test]
    async fn get_quota_between_warning_and_limit() {
        let log_repo = MockLogRepo::with_count(9);
        let svc = build_test_ai_service_with_log_repo(MockLlmProvider::new("{}".into()), log_repo);
        let quota = svc.get_quota(Uuid::new_v4()).await.unwrap();
        assert_eq!(quota.used, 9);
        assert_eq!(quota.remaining, 1);
        assert!(quota.warning);
        assert!(!quota.exceeded);
    }

    #[tokio::test]
    async fn get_quota_at_limit_shows_exceeded() {
        let log_repo = MockLogRepo::with_count(10);
        let svc = build_test_ai_service_with_log_repo(MockLlmProvider::new("{}".into()), log_repo);
        let quota = svc.get_quota(Uuid::new_v4()).await.unwrap();
        assert_eq!(quota.used, 10);
        assert_eq!(quota.remaining, 0);
        assert!(quota.warning);
        assert!(quota.exceeded);
    }

    #[tokio::test]
    async fn get_quota_over_limit_remaining_is_zero() {
        let log_repo = MockLogRepo::with_count(15);
        let svc = build_test_ai_service_with_log_repo(MockLlmProvider::new("{}".into()), log_repo);
        let quota = svc.get_quota(Uuid::new_v4()).await.unwrap();
        assert_eq!(quota.remaining, 0);
        assert!(quota.exceeded);
    }

    #[tokio::test]
    async fn check_quota_ok_below_limit() {
        let log_repo = MockLogRepo::with_count(5);
        let svc = build_test_ai_service_with_log_repo(MockLlmProvider::new("{}".into()), log_repo);
        let result = svc.check_quota(Uuid::new_v4()).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn check_quota_errors_at_limit() {
        let log_repo = MockLogRepo::with_count(10);
        let svc = build_test_ai_service_with_log_repo(MockLlmProvider::new("{}".into()), log_repo);
        let err = svc.check_quota(Uuid::new_v4()).await.unwrap_err();
        match err {
            AiError::QuotaExceeded { used, limit, .. } => {
                assert_eq!(used, 10);
                assert_eq!(limit, 10);
            }
            other => panic!("expected QuotaExceeded, got: {other:?}"),
        }
    }

    #[tokio::test]
    async fn check_quota_errors_over_limit() {
        let log_repo = MockLogRepo::with_count(15);
        let svc = build_test_ai_service_with_log_repo(MockLlmProvider::new("{}".into()), log_repo);
        let err = svc.check_quota(Uuid::new_v4()).await.unwrap_err();
        assert!(matches!(err, AiError::QuotaExceeded { .. }));
    }

    #[tokio::test]
    async fn get_quota_resets_at_is_next_month() {
        let log_repo = MockLogRepo::with_count(0);
        let svc = build_test_ai_service_with_log_repo(MockLlmProvider::new("{}".into()), log_repo);
        let quota = svc.get_quota(Uuid::new_v4()).await.unwrap();
        let now = chrono::Utc::now();
        assert!(quota.resets_at > now);
        // resets_at should be the 1st of next month
        assert_eq!(quota.resets_at.day(), 1);
        assert_eq!(quota.resets_at.hour(), 0);
    }

    use chrono::{Datelike, Timelike};
}
