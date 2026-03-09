use chrono::{DateTime, Utc};
use uuid::Uuid;

use super::error::AiError;
use super::models::{
    CostSummary, CreateDraftParams, Draft, DraftSummary, GenerationContext, GenerationLog,
    SceneSummary,
};

#[async_trait::async_trait]
pub trait DraftRepository: Clone + Send + Sync + 'static {
    async fn create(&self, params: &CreateDraftParams) -> Result<Draft, AiError>;

    async fn find_latest_by_scene(&self, scene_id: Uuid) -> Result<Option<Draft>, AiError>;

    async fn find_by_version(
        &self,
        scene_id: Uuid,
        version: i32,
    ) -> Result<Option<Draft>, AiError>;

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

    async fn cost_summary_by_project(
        &self,
        project_id: Uuid,
    ) -> Result<CostSummary, AiError>;

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
