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

// ---------------------------------------------------------------------------
// Inbound port: ProjectService (used by HTTP handlers)
// ---------------------------------------------------------------------------

#[async_trait::async_trait]
pub trait ProjectService: Send + Sync {
    async fn create_project(
        &self,
        project: &Project,
        user_id: Uuid,
    ) -> Result<Project, ProjectError>;
    async fn get_project(&self, id: Uuid, user_id: Uuid) -> Result<Project, ProjectError>;
    async fn list_projects(
        &self,
        user_id: Uuid,
        params: &PaginationParams,
    ) -> Result<PaginatedResult<ProjectSummary>, ProjectError>;
    async fn update_project(
        &self,
        id: Uuid,
        user_id: Uuid,
        update: &UpdateProject,
    ) -> Result<Project, ProjectError>;
    async fn delete_project(&self, id: Uuid, user_id: Uuid) -> Result<(), ProjectError>;
    async fn get_workspace(&self, id: Uuid, user_id: Uuid) -> Result<Workspace, ProjectError>;
}
