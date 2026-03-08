use uuid::Uuid;

use super::error::ProjectError;
use super::models::{
    PaginatedResult, PaginationParams, Project, ProjectSummary, UpdateProject, Workspace,
};

#[async_trait::async_trait]
pub trait ProjectRepository: Clone + Send + Sync + 'static {
    async fn create(&self, project: &Project) -> Result<Project, ProjectError>;

    async fn find_by_id(&self, id: Uuid) -> Result<Option<Project>, ProjectError>;

    async fn find_by_user_id(
        &self,
        user_id: Uuid,
        params: &PaginationParams,
    ) -> Result<PaginatedResult<ProjectSummary>, ProjectError>;

    async fn update(&self, id: Uuid, update: &UpdateProject) -> Result<Project, ProjectError>;

    async fn soft_delete(&self, id: Uuid) -> Result<(), ProjectError>;

    async fn get_workspace(&self, id: Uuid) -> Result<Option<Workspace>, ProjectError>;
}
