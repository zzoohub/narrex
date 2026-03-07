use uuid::Uuid;

use super::error::AiError;
use super::models::{
    Draft, DraftSource, DraftSummary, GenerationContext, GenerationLog, SceneSummary,
};

#[async_trait::async_trait]
pub trait DraftRepository: Clone + Send + Sync + 'static {
    async fn create(
        &self,
        scene_id: Uuid,
        version: i32,
        content: &str,
        source: DraftSource,
        edit_direction: Option<&str>,
        model: Option<&str>,
        provider: Option<&str>,
        tokens_in: Option<i32>,
        tokens_out: Option<i32>,
        cost: Option<f64>,
    ) -> Result<Draft, AiError>;

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
}

#[async_trait::async_trait]
pub trait ContextAssemblyRepository: Clone + Send + Sync + 'static {
    async fn assemble_context(
        &self,
        project_id: Uuid,
        scene_id: Uuid,
    ) -> Result<GenerationContext, AiError>;
}
