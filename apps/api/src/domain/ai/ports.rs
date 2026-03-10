use std::convert::Infallible;
use std::pin::Pin;

use chrono::{DateTime, Utc};
use futures::Stream;
use uuid::Uuid;

use super::error::AiError;
use super::models::{
    CostSummary, CreateDraftParams, CreateManualDraft, Draft, DraftSummary, EditDraftRequest,
    GenerationContext, GenerationLog, QuotaInfo, SceneSummary, StructuredOutput, TimelineOutput,
};
use super::service::SseEvent;

#[async_trait::async_trait]
pub trait DraftRepository: Clone + Send + Sync + 'static {
    async fn create(&self, params: &CreateDraftParams) -> Result<Draft, AiError>;

    async fn find_latest_by_scene(&self, scene_id: Uuid) -> Result<Option<Draft>, AiError>;

    async fn find_by_version(&self, scene_id: Uuid, version: i32)
        -> Result<Option<Draft>, AiError>;

    async fn list_by_scene(&self, scene_id: Uuid) -> Result<Vec<DraftSummary>, AiError>;

    async fn next_version(&self, scene_id: Uuid) -> Result<i32, AiError>;
}

#[async_trait::async_trait]
pub trait SceneSummaryRepository: Clone + Send + Sync + 'static {
    async fn upsert(
        &self,
        scene_id: Uuid,
        draft_version: i32,
        summary_text: &str,
        model: Option<&str>,
    ) -> Result<SceneSummary, AiError>;

    async fn find_by_scene(&self, scene_id: Uuid) -> Result<Option<SceneSummary>, AiError>;

    async fn find_preceding(
        &self,
        project_id: Uuid,
        before_position: f64,
    ) -> Result<Vec<SceneSummary>, AiError>;
}

#[async_trait::async_trait]
pub trait GenerationLogRepository: Clone + Send + Sync + 'static {
    async fn create(&self, log: &GenerationLog) -> Result<(), AiError>;

    async fn cost_summary_by_user(&self, user_id: Uuid) -> Result<CostSummary, AiError>;

    async fn cost_summary_by_project(&self, project_id: Uuid) -> Result<CostSummary, AiError>;

    async fn count_by_user_since(
        &self,
        user_id: Uuid,
        since: DateTime<Utc>,
    ) -> Result<i64, AiError>;
}

#[async_trait::async_trait]
pub trait ContextAssemblyRepository: Clone + Send + Sync + 'static {
    async fn assemble_context(
        &self,
        project_id: Uuid,
        scene_id: Uuid,
    ) -> Result<GenerationContext, AiError>;
}

// ---------------------------------------------------------------------------
// Inbound port: AiService (used by HTTP handlers)
// ---------------------------------------------------------------------------

#[async_trait::async_trait]
pub trait AiService: Send + Sync {
    async fn generate_scene_draft(
        &self,
        user_id: Uuid,
        project_id: Uuid,
        scene_id: Uuid,
        locale: &str,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<SseEvent, Infallible>> + Send>>, AiError>;

    async fn edit_scene_draft(
        &self,
        user_id: Uuid,
        project_id: Uuid,
        scene_id: Uuid,
        edit_req: &EditDraftRequest,
        locale: &str,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<SseEvent, Infallible>> + Send>>, AiError>;

    async fn save_manual_draft(
        &self,
        scene_id: Uuid,
        input: &CreateManualDraft,
    ) -> Result<Draft, AiError>;
    async fn list_drafts(&self, scene_id: Uuid) -> Result<Vec<DraftSummary>, AiError>;
    async fn get_draft(&self, scene_id: Uuid, version: i32) -> Result<Draft, AiError>;
    async fn get_scene_summary(&self, scene_id: Uuid) -> Result<SceneSummary, AiError>;
    async fn upsert_scene_summary(
        &self,
        scene_id: Uuid,
        draft_version: i32,
        summary_text: &str,
        model: Option<&str>,
    ) -> Result<SceneSummary, AiError>;
    async fn user_cost_summary(&self, user_id: Uuid) -> Result<CostSummary, AiError>;
    async fn project_cost_summary(&self, project_id: Uuid) -> Result<CostSummary, AiError>;
    async fn get_quota(&self, user_id: Uuid) -> Result<QuotaInfo, AiError>;
    async fn check_quota(&self, user_id: Uuid) -> Result<QuotaInfo, AiError>;

    async fn stream_world(
        &self,
        source_input: &str,
        clarification_answers: Option<&[String]>,
        locale: &str,
    ) -> Result<
        Pin<Box<dyn Stream<Item = Result<narrex_llm::StreamChunk, narrex_llm::LlmError>> + Send>>,
        AiError,
    >;

    async fn stream_characters(
        &self,
        source_input: &str,
        world_context: &str,
        locale: &str,
    ) -> Result<
        Pin<Box<dyn Stream<Item = Result<narrex_llm::StreamChunk, narrex_llm::LlmError>> + Send>>,
        AiError,
    >;

    async fn stream_timeline(
        &self,
        source_input: &str,
        world_context: &str,
        characters_context: &str,
        locale: &str,
    ) -> Result<
        Pin<Box<dyn Stream<Item = Result<narrex_llm::StreamChunk, narrex_llm::LlmError>> + Send>>,
        AiError,
    >;

    async fn retry_timeline(
        &self,
        source_input: &str,
        world_context: &str,
        characters_context: &str,
        failed_output: &str,
        locale: &str,
    ) -> Result<(TimelineOutput, String, String, u32, u32), AiError>;

    async fn generate_structure(
        &self,
        source_input: &str,
        clarification_answers: Option<&[String]>,
        locale: &str,
    ) -> Result<(StructuredOutput, String, String, u32, u32), AiError>;

    async fn log_generation(&self, log: &GenerationLog) -> Result<(), AiError>;
}
