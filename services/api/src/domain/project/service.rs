use uuid::Uuid;

use super::error::ProjectError;
use super::models::{
    PaginatedResult, PaginationParams, Project, ProjectSummary, UpdateProject, Workspace,
};
use super::ports::ProjectRepository;

#[derive(Clone)]
pub struct ProjectServiceImpl<R: ProjectRepository> {
    repo: R,
}

impl<R: ProjectRepository> ProjectServiceImpl<R> {
    pub fn new(repo: R) -> Self {
        Self { repo }
    }

    pub async fn create_project(
        &self,
        project: &Project,
        user_id: Uuid,
    ) -> Result<Project, ProjectError> {
        // Ensure the project belongs to the requesting user.
        if project.user_id != user_id {
            return Err(ProjectError::Forbidden);
        }
        self.repo.create(project).await
    }

    pub async fn get_project(
        &self,
        id: Uuid,
        user_id: Uuid,
    ) -> Result<Project, ProjectError> {
        let project = self
            .repo
            .find_by_id(id)
            .await?
            .ok_or(ProjectError::NotFound)?;
        if project.user_id != user_id {
            return Err(ProjectError::Forbidden);
        }
        Ok(project)
    }

    pub async fn list_projects(
        &self,
        user_id: Uuid,
        params: &PaginationParams,
    ) -> Result<PaginatedResult<ProjectSummary>, ProjectError> {
        self.repo.find_by_user_id(user_id, params).await
    }

    pub async fn update_project(
        &self,
        id: Uuid,
        user_id: Uuid,
        update: &UpdateProject,
    ) -> Result<Project, ProjectError> {
        let project = self
            .repo
            .find_by_id(id)
            .await?
            .ok_or(ProjectError::NotFound)?;
        if project.user_id != user_id {
            return Err(ProjectError::Forbidden);
        }
        self.repo.update(id, update).await
    }

    pub async fn delete_project(
        &self,
        id: Uuid,
        user_id: Uuid,
    ) -> Result<(), ProjectError> {
        let project = self
            .repo
            .find_by_id(id)
            .await?
            .ok_or(ProjectError::NotFound)?;
        if project.user_id != user_id {
            return Err(ProjectError::Forbidden);
        }
        self.repo.soft_delete(id).await
    }

    pub async fn get_workspace(
        &self,
        id: Uuid,
        user_id: Uuid,
    ) -> Result<Workspace, ProjectError> {
        // First verify ownership.
        let project = self
            .repo
            .find_by_id(id)
            .await?
            .ok_or(ProjectError::NotFound)?;
        if project.user_id != user_id {
            return Err(ProjectError::Forbidden);
        }
        self.repo
            .get_workspace(id)
            .await?
            .ok_or(ProjectError::NotFound)
    }
}
