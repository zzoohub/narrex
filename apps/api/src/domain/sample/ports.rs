use uuid::Uuid;

use crate::domain::project::error::ProjectError;

use super::seed::SampleProjectData;

#[async_trait::async_trait]
pub trait SampleProjectRepository: Clone + Send + Sync + 'static {
    /// Returns true if the user owns at least one non-deleted project.
    async fn has_projects(&self, user_id: Uuid) -> Result<bool, ProjectError>;

    /// Atomically insert the full sample project (project + tracks + scenes +
    /// characters + relationships + connections + scene_characters + drafts)
    /// in a single transaction.
    async fn create_sample_project(&self, data: &SampleProjectData) -> Result<(), ProjectError>;
}

// ---------------------------------------------------------------------------
// Inbound port: SampleService (used by HTTP handlers)
// ---------------------------------------------------------------------------

use crate::domain::project::models::Project;

#[async_trait::async_trait]
pub trait SampleService: Send + Sync {
    async fn ensure_sample_project(&self, user_id: Uuid, locale: &str) -> Option<Project>;
}
