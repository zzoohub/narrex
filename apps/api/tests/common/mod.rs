//! Shared test infrastructure for integration tests.
//!
//! Provides mock service implementations and a `TestApp` builder
//! that constructs a fully-wired Axum `Router` without a database.

use std::convert::Infallible;
use std::pin::Pin;
use std::sync::{Arc, Mutex};

use axum::Router;
use chrono::Utc;
use futures::Stream;
use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
use serde::Serialize;
use uuid::Uuid;

use narrex_api::config::Config;
use narrex_api::domain::ai::error::AiError;
use narrex_api::domain::ai::models::*;
use narrex_api::domain::ai::ports::AiService;
use narrex_api::domain::ai::service::SseEvent;
use narrex_api::domain::auth::error::AuthError;
use narrex_api::domain::auth::models::*;
use narrex_api::domain::auth::ports::AuthService;
use narrex_api::domain::character::error::CharacterError;
use narrex_api::domain::character::models::*;
use narrex_api::domain::character::ports::CharacterService;
use narrex_api::domain::project::error::ProjectError;
use narrex_api::domain::project::models::*;
use narrex_api::domain::project::ports::ProjectService;
use narrex_api::domain::sample::ports::SampleService;
use narrex_api::domain::timeline::error::TimelineError;
use narrex_api::domain::timeline::models::*;
use narrex_api::domain::timeline::ports::TimelineService;
use narrex_api::inbound::http::server::{build_router, AppState};

pub const TEST_JWT_SECRET: &str = "test-secret-for-integration-tests-1234";

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------

#[derive(Serialize)]
struct Claims {
    sub: String,
    exp: usize,
    iat: usize,
    kind: String,
}

pub fn make_access_token(secret: &str, user_id: Uuid) -> String {
    let now = Utc::now().timestamp() as usize;
    let claims = Claims {
        sub: user_id.to_string(),
        exp: now + 900, // 15 min
        iat: now,
        kind: "access".into(),
    };
    encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .unwrap()
}

pub fn make_expired_token(secret: &str) -> String {
    let now = Utc::now().timestamp() as usize;
    let claims = Claims {
        sub: Uuid::new_v4().to_string(),
        exp: now.saturating_sub(3600), // 1 hour ago
        iat: now.saturating_sub(7200),
        kind: "access".into(),
    };
    encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .unwrap()
}

pub fn make_refresh_token(secret: &str, user_id: Uuid) -> String {
    let now = Utc::now().timestamp() as usize;
    let claims = Claims {
        sub: user_id.to_string(),
        exp: now + 86400,
        iat: now,
        kind: "refresh".into(),
    };
    encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .unwrap()
}

// ---------------------------------------------------------------------------
// TestApp
// ---------------------------------------------------------------------------

pub struct TestApp {
    router: Router,
    user_id: Uuid,
    project_id: Uuid,
    bearer: String,
}

impl TestApp {
    /// Default test app with a seeded user and project.
    pub fn new() -> Self {
        let user_id = Uuid::new_v4();
        let project_id = Uuid::new_v4();
        let token = make_access_token(TEST_JWT_SECRET, user_id);

        let user = make_test_user(user_id);
        let project = make_test_project(project_id, user_id);

        let auth = MockAuthService { user: user.clone() };
        let proj = MockProjectService {
            projects: Arc::new(Mutex::new(vec![project])),
        };
        let timeline = StubTimelineService;
        let character = StubCharacterService;
        let ai = StubAiService;
        let sample = StubSampleService;

        let config = Config::test();
        let state = AppState::new(auth, proj, timeline, character, ai, sample, None, config);
        let router = build_router(state, "http://localhost:3000");

        Self {
            router,
            user_id,
            project_id,
            bearer: format!("Bearer {token}"),
        }
    }

    /// Test app where get_project always returns NotFound.
    pub fn new_with_empty_project() -> Self {
        let user_id = Uuid::new_v4();
        let token = make_access_token(TEST_JWT_SECRET, user_id);
        let user = make_test_user(user_id);

        let auth = MockAuthService { user };
        let proj = MockProjectService {
            projects: Arc::new(Mutex::new(vec![])),
        };

        let config = Config::test();
        let state = AppState::new(
            auth,
            proj,
            StubTimelineService,
            StubCharacterService,
            StubAiService,
            StubSampleService,
            None,
            config,
        );
        let router = build_router(state, "http://localhost:3000");

        Self {
            router,
            user_id,
            project_id: Uuid::new_v4(),
            bearer: format!("Bearer {token}"),
        }
    }

    /// Test app where get_project returns Forbidden.
    pub fn new_with_forbidden_project() -> Self {
        let user_id = Uuid::new_v4();
        let project_id = Uuid::new_v4();
        let token = make_access_token(TEST_JWT_SECRET, user_id);
        let user = make_test_user(user_id);

        // Project owned by a DIFFERENT user
        let other_user = Uuid::new_v4();
        let project = make_test_project(project_id, other_user);

        let auth = MockAuthService { user };
        let proj = MockProjectService {
            projects: Arc::new(Mutex::new(vec![project])),
        };

        let config = Config::test();
        let state = AppState::new(
            auth,
            proj,
            StubTimelineService,
            StubCharacterService,
            StubAiService,
            StubSampleService,
            None,
            config,
        );
        let router = build_router(state, "http://localhost:3000");

        Self {
            router,
            user_id,
            project_id,
            bearer: format!("Bearer {token}"),
        }
    }

    pub fn router(self) -> Router {
        self.router
    }

    pub fn user_id(&self) -> Uuid {
        self.user_id
    }

    pub fn project_id(&self) -> Uuid {
        self.project_id
    }

    pub fn bearer(&self) -> String {
        self.bearer.clone()
    }
}

// ---------------------------------------------------------------------------
// Test data builders
// ---------------------------------------------------------------------------

fn make_test_user(id: Uuid) -> User {
    User {
        id,
        google_id: format!("test-google-{id}"),
        email: "test@example.com".into(),
        display_name: Some("Test User".into()),
        profile_image_url: None,
        theme_preference: "system".into(),
        language_preference: "en".into(),
        created_at: Utc::now(),
        updated_at: Utc::now(),
    }
}

fn make_test_project(id: Uuid, user_id: Uuid) -> Project {
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

// ---------------------------------------------------------------------------
// MockAuthService
// ---------------------------------------------------------------------------

pub struct MockAuthService {
    pub user: User,
}

#[async_trait::async_trait]
impl AuthService for MockAuthService {
    async fn google_callback(
        &self,
        _info: GoogleUserInfo,
        _locale: &str,
    ) -> Result<(User, AuthTokens, String), AuthError> {
        Ok((
            self.user.clone(),
            AuthTokens {
                access_token: "mock-access".into(),
                expires_in: 900,
            },
            "mock-refresh".into(),
        ))
    }
    async fn refresh_tokens(&self, _token: &str) -> Result<(AuthTokens, String), AuthError> {
        Ok((
            AuthTokens {
                access_token: "mock-access".into(),
                expires_in: 900,
            },
            "mock-refresh".into(),
        ))
    }
    async fn verify_token(&self, _token: &str) -> Result<Uuid, AuthError> {
        Ok(self.user.id)
    }
    async fn get_user(&self, user_id: Uuid) -> Result<User, AuthError> {
        if user_id == self.user.id {
            Ok(self.user.clone())
        } else {
            Err(AuthError::UserNotFound)
        }
    }
    async fn update_profile(
        &self,
        _user_id: Uuid,
        _update: &UpdateProfile,
    ) -> Result<User, AuthError> {
        Ok(self.user.clone())
    }
    async fn delete_account(&self, _user_id: Uuid) -> Result<(), AuthError> {
        Ok(())
    }
    async fn upload_avatar(
        &self,
        _user_id: Uuid,
        _content_type: &str,
        _data: Vec<u8>,
    ) -> Result<User, AuthError> {
        Ok(self.user.clone())
    }
    async fn test_login(
        &self,
        _email: &str,
        _name: Option<&str>,
    ) -> Result<(User, AuthTokens, String), AuthError> {
        Ok((
            self.user.clone(),
            AuthTokens {
                access_token: make_access_token(TEST_JWT_SECRET, self.user.id),
                expires_in: 900,
            },
            "mock-refresh".into(),
        ))
    }
}

// ---------------------------------------------------------------------------
// MockProjectService
// ---------------------------------------------------------------------------

pub struct MockProjectService {
    pub projects: Arc<Mutex<Vec<Project>>>,
}

#[async_trait::async_trait]
impl ProjectService for MockProjectService {
    async fn create_project(
        &self,
        project: &Project,
        user_id: Uuid,
    ) -> Result<Project, ProjectError> {
        if project.user_id != user_id {
            return Err(ProjectError::Forbidden);
        }
        let mut projects = self.projects.lock().unwrap();
        projects.push(project.clone());
        Ok(project.clone())
    }
    async fn get_project(&self, id: Uuid, user_id: Uuid) -> Result<Project, ProjectError> {
        let projects = self.projects.lock().unwrap();
        let project = projects
            .iter()
            .find(|p| p.id == id)
            .ok_or(ProjectError::NotFound)?;
        if project.user_id != user_id {
            return Err(ProjectError::Forbidden);
        }
        Ok(project.clone())
    }
    async fn list_projects(
        &self,
        user_id: Uuid,
        _params: &PaginationParams,
    ) -> Result<PaginatedResult<ProjectSummary>, ProjectError> {
        let projects = self.projects.lock().unwrap();
        let data: Vec<ProjectSummary> = projects
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
            data,
            next_cursor: None,
            has_more: false,
        })
    }
    async fn update_project(
        &self,
        id: Uuid,
        user_id: Uuid,
        _update: &UpdateProject,
    ) -> Result<Project, ProjectError> {
        self.get_project(id, user_id).await
    }
    async fn delete_project(&self, id: Uuid, user_id: Uuid) -> Result<(), ProjectError> {
        self.get_project(id, user_id).await?;
        Ok(())
    }
    async fn get_workspace(&self, _id: Uuid, _user_id: Uuid) -> Result<Workspace, ProjectError> {
        Err(ProjectError::NotFound)
    }
}

// ---------------------------------------------------------------------------
// Stub services (minimal implementations for unused endpoints)
// ---------------------------------------------------------------------------

pub struct StubTimelineService;

#[async_trait::async_trait]
impl TimelineService for StubTimelineService {
    async fn create_track(&self, _: Uuid, _: &CreateTrack) -> Result<Track, TimelineError> {
        Err(TimelineError::TrackNotFound)
    }
    async fn update_track(&self, _: Uuid, _: &UpdateTrack) -> Result<Track, TimelineError> {
        Err(TimelineError::TrackNotFound)
    }
    async fn delete_track(&self, _: Uuid) -> Result<(), TimelineError> {
        Err(TimelineError::TrackNotFound)
    }
    async fn create_scene(&self, _: Uuid, _: &CreateScene) -> Result<Scene, TimelineError> {
        Err(TimelineError::SceneNotFound)
    }
    async fn get_scene(&self, _: Uuid) -> Result<Scene, TimelineError> {
        Err(TimelineError::SceneNotFound)
    }
    async fn get_scene_detail(&self, _: Uuid) -> Result<SceneDetail, TimelineError> {
        Err(TimelineError::SceneNotFound)
    }
    async fn update_scene(&self, _: Uuid, _: &UpdateScene) -> Result<Scene, TimelineError> {
        Err(TimelineError::SceneNotFound)
    }
    async fn delete_scene(&self, _: Uuid) -> Result<(), TimelineError> {
        Err(TimelineError::SceneNotFound)
    }
    async fn create_connection(
        &self,
        _: Uuid,
        _: &CreateConnection,
    ) -> Result<SceneConnection, TimelineError> {
        Err(TimelineError::ConnectionNotFound)
    }
    async fn delete_connection(&self, _: Uuid) -> Result<(), TimelineError> {
        Err(TimelineError::ConnectionNotFound)
    }
    async fn mark_scenes_needs_revision(&self, _: Uuid) -> Result<(), TimelineError> {
        Ok(())
    }
}

pub struct StubCharacterService;

#[async_trait::async_trait]
impl CharacterService for StubCharacterService {
    async fn list_characters(&self, _: Uuid) -> Result<Vec<Character>, CharacterError> {
        Ok(vec![])
    }
    async fn create_character(
        &self,
        _: Uuid,
        _: &CreateCharacter,
    ) -> Result<Character, CharacterError> {
        Err(CharacterError::NotFound)
    }
    async fn get_character(&self, _: Uuid) -> Result<Character, CharacterError> {
        Err(CharacterError::NotFound)
    }
    async fn update_character(
        &self,
        _: Uuid,
        _: &UpdateCharacter,
    ) -> Result<Character, CharacterError> {
        Err(CharacterError::NotFound)
    }
    async fn delete_character(&self, _: Uuid) -> Result<(), CharacterError> {
        Err(CharacterError::NotFound)
    }
    async fn create_relationship(
        &self,
        _: Uuid,
        _: &CreateRelationship,
    ) -> Result<CharacterRelationship, CharacterError> {
        Err(CharacterError::NotFound)
    }
    async fn update_relationship(
        &self,
        _: Uuid,
        _: &UpdateRelationship,
    ) -> Result<CharacterRelationship, CharacterError> {
        Err(CharacterError::RelationshipNotFound)
    }
    async fn delete_relationship(&self, _: Uuid) -> Result<(), CharacterError> {
        Err(CharacterError::RelationshipNotFound)
    }
}

pub struct StubAiService;

#[async_trait::async_trait]
impl AiService for StubAiService {
    async fn generate_scene_draft(
        &self,
        _: Uuid,
        _: Uuid,
        _: Uuid,
        _: &str,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<SseEvent, Infallible>> + Send>>, AiError> {
        Err(AiError::SceneNotFound)
    }
    async fn edit_scene_draft(
        &self,
        _: Uuid,
        _: Uuid,
        _: Uuid,
        _: &EditDraftRequest,
        _: &str,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<SseEvent, Infallible>> + Send>>, AiError> {
        Err(AiError::SceneNotFound)
    }
    async fn save_manual_draft(&self, _: Uuid, _: &CreateManualDraft) -> Result<Draft, AiError> {
        Err(AiError::DraftNotFound)
    }
    async fn list_drafts(&self, _: Uuid) -> Result<Vec<DraftSummary>, AiError> {
        Ok(vec![])
    }
    async fn get_draft(&self, _: Uuid, _: i32) -> Result<Draft, AiError> {
        Err(AiError::DraftNotFound)
    }
    async fn get_scene_summary(&self, _: Uuid) -> Result<SceneSummary, AiError> {
        Err(AiError::SceneNotFound)
    }
    async fn upsert_scene_summary(
        &self,
        _: Uuid,
        _: i32,
        _: &str,
        _: Option<&str>,
    ) -> Result<SceneSummary, AiError> {
        Err(AiError::SceneNotFound)
    }
    async fn user_cost_summary(&self, _: Uuid) -> Result<CostSummary, AiError> {
        Ok(CostSummary {
            total_generations: 0,
            total_tokens_input: 0,
            total_tokens_output: 0,
            total_cost_usd: 0.0,
        })
    }
    async fn project_cost_summary(&self, _: Uuid) -> Result<CostSummary, AiError> {
        Ok(CostSummary {
            total_generations: 0,
            total_tokens_input: 0,
            total_tokens_output: 0,
            total_cost_usd: 0.0,
        })
    }
    async fn get_quota(&self, _: Uuid) -> Result<QuotaInfo, AiError> {
        Ok(QuotaInfo {
            used: 0,
            limit: 50,
            remaining: 50,
            warning: false,
            exceeded: false,
            resets_at: Utc::now(),
        })
    }
    async fn check_quota(&self, _: Uuid) -> Result<QuotaInfo, AiError> {
        Ok(QuotaInfo {
            used: 0,
            limit: 50,
            remaining: 50,
            warning: false,
            exceeded: false,
            resets_at: Utc::now(),
        })
    }
    async fn stream_world(
        &self,
        _: &str,
        _: Option<&[String]>,
        _: &str,
    ) -> Result<
        Pin<Box<dyn Stream<Item = Result<narrex_llm::StreamChunk, narrex_llm::LlmError>> + Send>>,
        AiError,
    > {
        Err(AiError::GenerationFailed("not available in tests".into()))
    }
    async fn stream_characters(
        &self,
        _: &str,
        _: &str,
        _: &str,
    ) -> Result<
        Pin<Box<dyn Stream<Item = Result<narrex_llm::StreamChunk, narrex_llm::LlmError>> + Send>>,
        AiError,
    > {
        Err(AiError::GenerationFailed("not available in tests".into()))
    }
    async fn stream_timeline(
        &self,
        _: &str,
        _: &str,
        _: &str,
        _: &str,
    ) -> Result<
        Pin<Box<dyn Stream<Item = Result<narrex_llm::StreamChunk, narrex_llm::LlmError>> + Send>>,
        AiError,
    > {
        Err(AiError::GenerationFailed("not available in tests".into()))
    }
    async fn retry_timeline(
        &self,
        _: &str,
        _: &str,
        _: &str,
        _: &str,
        _: &str,
    ) -> Result<(TimelineOutput, String, String, u32, u32), AiError> {
        Err(AiError::GenerationFailed("not available in tests".into()))
    }
    async fn generate_structure(
        &self,
        _: &str,
        _: Option<&[String]>,
        _: &str,
    ) -> Result<(StructuredOutput, String, String, u32, u32), AiError> {
        Err(AiError::GenerationFailed("not available in tests".into()))
    }
    async fn log_generation(&self, _: &GenerationLog) -> Result<(), AiError> {
        Ok(())
    }
}

pub struct StubSampleService;

#[async_trait::async_trait]
impl SampleService for StubSampleService {
    async fn ensure_sample_project(&self, _: Uuid, _: &str) -> Option<Project> {
        None
    }
}
