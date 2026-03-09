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

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use std::sync::{Arc, Mutex};

    // -- Mock ProjectRepository --

    #[derive(Clone)]
    struct MockProjectRepo {
        projects: Arc<Mutex<Vec<Project>>>,
        workspace: Arc<Mutex<Option<Workspace>>>,
    }

    impl MockProjectRepo {
        fn new() -> Self {
            Self {
                projects: Arc::new(Mutex::new(Vec::new())),
                workspace: Arc::new(Mutex::new(None)),
            }
        }

        fn with_project(self, project: Project) -> Self {
            self.projects.lock().unwrap().push(project);
            self
        }

        fn with_workspace(self, ws: Workspace) -> Self {
            *self.workspace.lock().unwrap() = Some(ws);
            self
        }
    }

    fn make_project(id: Uuid, user_id: Uuid) -> Project {
        Project {
            id,
            user_id,
            title: "Test Project".into(),
            genre: Some("Fantasy".into()),
            theme: None,
            era_location: None,
            pov: None,
            tone: None,
            source_type: None,
            source_input: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[async_trait::async_trait]
    impl ProjectRepository for MockProjectRepo {
        async fn create(&self, project: &Project) -> Result<Project, ProjectError> {
            let mut projects = self.projects.lock().unwrap();
            projects.push(project.clone());
            Ok(project.clone())
        }

        async fn find_by_id(&self, id: Uuid) -> Result<Option<Project>, ProjectError> {
            let projects = self.projects.lock().unwrap();
            Ok(projects.iter().find(|p| p.id == id).cloned())
        }

        async fn find_by_user_id(
            &self,
            user_id: Uuid,
            _params: &PaginationParams,
        ) -> Result<PaginatedResult<ProjectSummary>, ProjectError> {
            let projects = self.projects.lock().unwrap();
            let summaries: Vec<ProjectSummary> = projects
                .iter()
                .filter(|p| p.user_id == user_id)
                .map(|p| ProjectSummary {
                    id: p.id,
                    title: p.title.clone(),
                    genre: p.genre.clone(),
                    source_type: p.source_type.clone(),
                    created_at: p.created_at,
                    updated_at: p.updated_at,
                })
                .collect();
            Ok(PaginatedResult {
                data: summaries,
                next_cursor: None,
                has_more: false,
            })
        }

        async fn update(&self, id: Uuid, update: &UpdateProject) -> Result<Project, ProjectError> {
            let mut projects = self.projects.lock().unwrap();
            let project = projects
                .iter_mut()
                .find(|p| p.id == id)
                .ok_or(ProjectError::NotFound)?;
            if let Some(ref title) = update.title {
                project.title = title.clone();
            }
            Ok(project.clone())
        }

        async fn soft_delete(&self, id: Uuid) -> Result<(), ProjectError> {
            let mut projects = self.projects.lock().unwrap();
            projects.retain(|p| p.id != id);
            Ok(())
        }

        async fn get_workspace(&self, _id: Uuid) -> Result<Option<Workspace>, ProjectError> {
            Ok(self.workspace.lock().unwrap().clone())
        }
    }

    // -- Tests --

    #[tokio::test]
    async fn create_project_success() {
        let user_id = Uuid::new_v4();
        let project_id = Uuid::new_v4();
        let project = make_project(project_id, user_id);
        let repo = MockProjectRepo::new();
        let svc = ProjectServiceImpl::new(repo);

        let result = svc.create_project(&project, user_id).await.unwrap();
        assert_eq!(result.id, project_id);
        assert_eq!(result.user_id, user_id);
    }

    #[tokio::test]
    async fn create_project_forbidden_wrong_user() {
        let project = make_project(Uuid::new_v4(), Uuid::new_v4());
        let repo = MockProjectRepo::new();
        let svc = ProjectServiceImpl::new(repo);

        let other_user = Uuid::new_v4();
        let result = svc.create_project(&project, other_user).await;
        assert!(matches!(result.unwrap_err(), ProjectError::Forbidden));
    }

    #[tokio::test]
    async fn get_project_success() {
        let user_id = Uuid::new_v4();
        let project_id = Uuid::new_v4();
        let project = make_project(project_id, user_id);
        let repo = MockProjectRepo::new().with_project(project);
        let svc = ProjectServiceImpl::new(repo);

        let result = svc.get_project(project_id, user_id).await.unwrap();
        assert_eq!(result.id, project_id);
    }

    #[tokio::test]
    async fn get_project_not_found() {
        let repo = MockProjectRepo::new();
        let svc = ProjectServiceImpl::new(repo);

        let result = svc.get_project(Uuid::new_v4(), Uuid::new_v4()).await;
        assert!(matches!(result.unwrap_err(), ProjectError::NotFound));
    }

    #[tokio::test]
    async fn get_project_forbidden_wrong_user() {
        let owner = Uuid::new_v4();
        let project_id = Uuid::new_v4();
        let project = make_project(project_id, owner);
        let repo = MockProjectRepo::new().with_project(project);
        let svc = ProjectServiceImpl::new(repo);

        let other_user = Uuid::new_v4();
        let result = svc.get_project(project_id, other_user).await;
        assert!(matches!(result.unwrap_err(), ProjectError::Forbidden));
    }

    #[tokio::test]
    async fn list_projects_returns_user_projects() {
        let user_id = Uuid::new_v4();
        let p1 = make_project(Uuid::new_v4(), user_id);
        let p2 = make_project(Uuid::new_v4(), user_id);
        let p_other = make_project(Uuid::new_v4(), Uuid::new_v4());
        let repo = MockProjectRepo::new()
            .with_project(p1)
            .with_project(p2)
            .with_project(p_other);
        let svc = ProjectServiceImpl::new(repo);

        let params = PaginationParams {
            cursor: None,
            limit: 10,
        };
        let result = svc.list_projects(user_id, &params).await.unwrap();
        assert_eq!(result.data.len(), 2);
        assert!(!result.has_more);
    }

    #[tokio::test]
    async fn update_project_success() {
        let user_id = Uuid::new_v4();
        let project_id = Uuid::new_v4();
        let project = make_project(project_id, user_id);
        let repo = MockProjectRepo::new().with_project(project);
        let svc = ProjectServiceImpl::new(repo);

        let update = UpdateProject {
            title: Some("New Title".into()),
            ..Default::default()
        };
        let result = svc.update_project(project_id, user_id, &update).await.unwrap();
        assert_eq!(result.title, "New Title");
    }

    #[tokio::test]
    async fn update_project_not_found() {
        let repo = MockProjectRepo::new();
        let svc = ProjectServiceImpl::new(repo);

        let update = UpdateProject::default();
        let result = svc.update_project(Uuid::new_v4(), Uuid::new_v4(), &update).await;
        assert!(matches!(result.unwrap_err(), ProjectError::NotFound));
    }

    #[tokio::test]
    async fn update_project_forbidden() {
        let owner = Uuid::new_v4();
        let project_id = Uuid::new_v4();
        let project = make_project(project_id, owner);
        let repo = MockProjectRepo::new().with_project(project);
        let svc = ProjectServiceImpl::new(repo);

        let update = UpdateProject::default();
        let result = svc.update_project(project_id, Uuid::new_v4(), &update).await;
        assert!(matches!(result.unwrap_err(), ProjectError::Forbidden));
    }

    #[tokio::test]
    async fn delete_project_success() {
        let user_id = Uuid::new_v4();
        let project_id = Uuid::new_v4();
        let project = make_project(project_id, user_id);
        let repo = MockProjectRepo::new().with_project(project);
        let svc = ProjectServiceImpl::new(repo);

        svc.delete_project(project_id, user_id).await.unwrap();
    }

    #[tokio::test]
    async fn delete_project_not_found() {
        let repo = MockProjectRepo::new();
        let svc = ProjectServiceImpl::new(repo);

        let result = svc.delete_project(Uuid::new_v4(), Uuid::new_v4()).await;
        assert!(matches!(result.unwrap_err(), ProjectError::NotFound));
    }

    #[tokio::test]
    async fn delete_project_forbidden() {
        let owner = Uuid::new_v4();
        let project_id = Uuid::new_v4();
        let project = make_project(project_id, owner);
        let repo = MockProjectRepo::new().with_project(project);
        let svc = ProjectServiceImpl::new(repo);

        let result = svc.delete_project(project_id, Uuid::new_v4()).await;
        assert!(matches!(result.unwrap_err(), ProjectError::Forbidden));
    }

    #[tokio::test]
    async fn get_workspace_success() {
        let user_id = Uuid::new_v4();
        let project_id = Uuid::new_v4();
        let project = make_project(project_id, user_id);
        let ws = Workspace {
            project: project.clone(),
            tracks: vec![],
            scenes: vec![],
            characters: vec![],
            relationships: vec![],
            connections: vec![],
        };
        let repo = MockProjectRepo::new()
            .with_project(project)
            .with_workspace(ws);
        let svc = ProjectServiceImpl::new(repo);

        let result = svc.get_workspace(project_id, user_id).await.unwrap();
        assert_eq!(result.project.id, project_id);
    }

    #[tokio::test]
    async fn get_workspace_not_found_no_project() {
        let repo = MockProjectRepo::new();
        let svc = ProjectServiceImpl::new(repo);

        let result = svc.get_workspace(Uuid::new_v4(), Uuid::new_v4()).await;
        assert!(matches!(result.unwrap_err(), ProjectError::NotFound));
    }

    #[tokio::test]
    async fn get_workspace_forbidden() {
        let owner = Uuid::new_v4();
        let project_id = Uuid::new_v4();
        let project = make_project(project_id, owner);
        let repo = MockProjectRepo::new().with_project(project);
        let svc = ProjectServiceImpl::new(repo);

        let result = svc.get_workspace(project_id, Uuid::new_v4()).await;
        assert!(matches!(result.unwrap_err(), ProjectError::Forbidden));
    }

    #[tokio::test]
    async fn get_workspace_not_found_no_workspace() {
        let user_id = Uuid::new_v4();
        let project_id = Uuid::new_v4();
        let project = make_project(project_id, user_id);
        let repo = MockProjectRepo::new().with_project(project);
        let svc = ProjectServiceImpl::new(repo);

        let result = svc.get_workspace(project_id, user_id).await;
        assert!(matches!(result.unwrap_err(), ProjectError::NotFound));
    }
}
