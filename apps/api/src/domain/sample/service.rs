use uuid::Uuid;

use crate::domain::project::error::ProjectError;
use crate::domain::project::models::Project;

use super::ports::{SampleProjectRepository, SampleService};
use super::seed::build_sample_project;

#[derive(Clone)]
pub struct SampleProjectService<R: SampleProjectRepository> {
    repo: R,
}

impl<R: SampleProjectRepository> SampleProjectService<R> {
    pub fn new(repo: R) -> Self {
        Self { repo }
    }

    /// Create the sample project if this user has no projects yet.
    ///
    /// `locale` determines the language of the sample content ("ko" or "en").
    /// Returns `Some(project)` if created, `None` if the user already has projects.
    /// Errors from the repo are logged and swallowed — sample project creation
    /// must never block the auth flow.
    pub async fn ensure_sample_project(
        &self,
        user_id: Uuid,
        locale: &str,
    ) -> Option<Project> {
        match self.try_create(user_id, locale).await {
            Ok(project) => project,
            Err(e) => {
                tracing::warn!(%user_id, error = %e, "failed to create sample project");
                None
            }
        }
    }

    async fn try_create(&self, user_id: Uuid, locale: &str) -> Result<Option<Project>, ProjectError> {
        if self.repo.has_projects(user_id).await? {
            return Ok(None);
        }

        let data = build_sample_project(user_id, locale);
        let project = data.project.clone();
        self.repo.create_sample_project(&data).await?;
        Ok(Some(project))
    }
}

// ---------------------------------------------------------------------------
// SampleService trait implementation (delegates to inherent methods)
// ---------------------------------------------------------------------------

#[async_trait::async_trait]
impl<R: SampleProjectRepository> SampleService for SampleProjectService<R> {
    async fn ensure_sample_project(&self, user_id: Uuid, locale: &str) -> Option<Project> {
        Self::ensure_sample_project(self, user_id, locale).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Mutex};

    #[derive(Clone)]
    struct MockSampleRepo {
        has_projects: bool,
        created: Arc<Mutex<bool>>,
        should_fail: bool,
    }

    impl MockSampleRepo {
        fn new(has_projects: bool) -> Self {
            Self {
                has_projects,
                created: Arc::new(Mutex::new(false)),
                should_fail: false,
            }
        }

        fn failing() -> Self {
            Self {
                has_projects: false,
                created: Arc::new(Mutex::new(false)),
                should_fail: true,
            }
        }

        fn was_created(&self) -> bool {
            *self.created.lock().unwrap()
        }
    }

    #[async_trait::async_trait]
    impl SampleProjectRepository for MockSampleRepo {
        async fn has_projects(&self, _user_id: Uuid) -> Result<bool, ProjectError> {
            if self.should_fail {
                return Err(ProjectError::Unknown(anyhow::anyhow!("db error")));
            }
            Ok(self.has_projects)
        }

        async fn create_sample_project(
            &self,
            _data: &super::super::seed::SampleProjectData,
        ) -> Result<(), ProjectError> {
            if self.should_fail {
                return Err(ProjectError::Unknown(anyhow::anyhow!("db error")));
            }
            *self.created.lock().unwrap() = true;
            Ok(())
        }
    }

    #[tokio::test]
    async fn creates_sample_when_user_has_no_projects() {
        let repo = MockSampleRepo::new(false);
        let svc = SampleProjectService::new(repo.clone());

        let result = svc.ensure_sample_project(Uuid::new_v4(), "ko").await;
        assert!(result.is_some(), "should return the created project");
        assert!(repo.was_created(), "should have called create_sample_project");
    }

    #[tokio::test]
    async fn skips_when_user_already_has_projects() {
        let repo = MockSampleRepo::new(true);
        let svc = SampleProjectService::new(repo.clone());

        let result = svc.ensure_sample_project(Uuid::new_v4(), "en").await;
        assert!(result.is_none(), "should return None when user has projects");
        assert!(!repo.was_created(), "should not create sample project");
    }

    #[tokio::test]
    async fn swallows_errors_gracefully() {
        let repo = MockSampleRepo::failing();
        let svc = SampleProjectService::new(repo.clone());

        let result = svc.ensure_sample_project(Uuid::new_v4(), "ko").await;
        assert!(result.is_none(), "should return None on error");
        assert!(!repo.was_created(), "should not have created anything");
    }
}
