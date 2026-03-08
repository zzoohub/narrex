use std::sync::Arc;
use std::time::Duration;

use axum::routing::{delete, get, patch, post};
use axum::Router;
use sqlx::PgPool;
use tokio::net::TcpListener;
use tokio::signal;
use axum::http::{header, HeaderValue, Method};
use tower_http::cors::CorsLayer;
use tower_http::set_header::SetResponseHeaderLayer;
use tower_http::timeout::TimeoutLayer;
use tower_http::trace::TraceLayer;
use tracing::info;

use crate::config::Config;
use crate::domain::ai::service::AiServiceImpl;
use crate::domain::auth::service::AuthServiceImpl;
use crate::domain::character::service::CharacterServiceImpl;
use crate::domain::project::service::ProjectServiceImpl;
use crate::domain::timeline::service::TimelineServiceImpl;
use crate::outbound::postgres::Postgres;

use super::ai::handlers as ai_handlers;
use super::auth::handlers as auth_handlers;
use super::character::handlers as char_handlers;
use super::health;
use super::project::handlers as project_handlers;
use super::timeline::handlers as timeline_handlers;

// ---------------------------------------------------------------------------
// Service type aliases (concrete adapter types)
// ---------------------------------------------------------------------------

pub type AuthSvc = AuthServiceImpl<Postgres, crate::outbound::jwt::JwtTokenService, crate::outbound::storage::R2Storage>;
pub type ProjectSvc = ProjectServiceImpl<Postgres>;
pub type TimelineSvc = TimelineServiceImpl<Postgres, Postgres, Postgres, Postgres>;
pub type CharacterSvc = CharacterServiceImpl<Postgres, Postgres>;
pub type AiSvc = AiServiceImpl<Postgres, Postgres, Postgres, Postgres, Postgres>;

// ---------------------------------------------------------------------------
// AppState
// ---------------------------------------------------------------------------

/// Concrete application state shared across all handlers.
///
/// Services are held behind `Arc` so the state is cheap to clone.
#[derive(Clone)]
pub struct AppState {
    auth_service: Arc<AuthSvc>,
    project_service: Arc<ProjectSvc>,
    timeline_service: Arc<TimelineSvc>,
    character_service: Arc<CharacterSvc>,
    ai_service: Arc<AiSvc>,
    postgres: Postgres,
    pub jwt_secret: String,
    config: Arc<Config>,
}

impl AppState {
    pub fn new(
        auth_service: AuthSvc,
        project_service: ProjectSvc,
        timeline_service: TimelineSvc,
        character_service: CharacterSvc,
        ai_service: AiSvc,
        postgres: Postgres,
        config: Config,
    ) -> Self {
        let jwt_secret = config.jwt_secret.clone();
        Self {
            auth_service: Arc::new(auth_service),
            project_service: Arc::new(project_service),
            timeline_service: Arc::new(timeline_service),
            character_service: Arc::new(character_service),
            ai_service: Arc::new(ai_service),
            postgres,
            jwt_secret,
            config: Arc::new(config),
        }
    }

    pub fn auth_service(&self) -> &AuthSvc {
        &self.auth_service
    }

    pub fn project_service(&self) -> &ProjectSvc {
        &self.project_service
    }

    pub fn timeline_service(&self) -> &TimelineSvc {
        &self.timeline_service
    }

    pub fn character_service(&self) -> &CharacterSvc {
        &self.character_service
    }

    pub fn ai_service(&self) -> &AiSvc {
        &self.ai_service
    }

    pub fn db_pool(&self) -> &PgPool {
        self.postgres.pool()
    }

    pub fn config(&self) -> &Config {
        &self.config
    }
}

// ---------------------------------------------------------------------------
// HttpServer
// ---------------------------------------------------------------------------

/// HTTP server wrapping Axum. `main.rs` never imports Axum directly.
pub struct HttpServer {
    listener: TcpListener,
    router: Router,
}

impl HttpServer {
    /// Build the server: bind to the configured port and assemble the router.
    pub async fn new(state: AppState) -> anyhow::Result<Self> {
        let port = state.config().port;
        let cors_origin = state.config().cors_origin.clone();

        let router = build_router(state, &cors_origin);
        let addr = format!("0.0.0.0:{port}");
        let listener = TcpListener::bind(&addr).await?;

        info!(%addr, "HTTP server bound");

        Ok(Self { listener, router })
    }

    /// Run the server with graceful shutdown on SIGINT / SIGTERM.
    pub async fn run(self) -> anyhow::Result<()> {
        info!("starting HTTP server");

        axum::serve(self.listener, self.router)
            .with_graceful_shutdown(shutdown_signal())
            .await?;

        info!("HTTP server stopped");
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

fn build_router(state: AppState, cors_origin: &str) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(
            cors_origin
                .parse::<axum::http::HeaderValue>()
                .expect("valid CORS origin"),
        )
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::PATCH,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([
            header::AUTHORIZATION,
            header::CONTENT_TYPE,
            header::ACCEPT,
        ])
        .allow_credentials(true);

    // ---- Public routes (no auth) ----
    let public = Router::new()
        .route("/health", get(health::health_check))
        .route("/v1/auth/google", get(auth_handlers::initiate_google_auth))
        .route(
            "/v1/auth/google/callback",
            get(auth_handlers::handle_google_callback),
        )
        .route("/v1/auth/refresh", post(auth_handlers::refresh_token));

    // ---- Authenticated routes ----
    let authed = Router::new()
        // Auth
        .route("/v1/auth/logout", post(auth_handlers::logout))
        .route(
            "/v1/auth/me",
            get(auth_handlers::get_current_user)
                .patch(auth_handlers::update_profile)
                .delete(auth_handlers::delete_account),
        )
        .route(
            "/v1/auth/me/avatar",
            post(auth_handlers::upload_avatar),
        )
        // Cost analytics
        .route("/v1/me/costs", get(ai_handlers::get_user_costs))
        // Projects
        .route(
            "/v1/projects/structure",
            post(project_handlers::structure_project),
        )
        .route(
            "/v1/projects",
            get(project_handlers::list_projects).post(project_handlers::create_project),
        )
        .route(
            "/v1/projects/{projectId}",
            get(project_handlers::get_project)
                .patch(project_handlers::update_project)
                .delete(project_handlers::delete_project),
        )
        .route(
            "/v1/projects/{projectId}/workspace",
            get(project_handlers::get_workspace),
        )
        .route(
            "/v1/projects/{projectId}/costs",
            get(ai_handlers::get_project_costs),
        )
        // Tracks
        .route(
            "/v1/projects/{projectId}/tracks",
            post(timeline_handlers::create_track),
        )
        .route(
            "/v1/projects/{projectId}/tracks/{trackId}",
            patch(timeline_handlers::update_track).delete(timeline_handlers::delete_track),
        )
        // Scenes
        .route(
            "/v1/projects/{projectId}/scenes",
            post(timeline_handlers::create_scene),
        )
        .route(
            "/v1/projects/{projectId}/scenes/{sceneId}",
            get(timeline_handlers::get_scene)
                .patch(timeline_handlers::update_scene)
                .delete(timeline_handlers::delete_scene),
        )
        // Connections
        .route(
            "/v1/projects/{projectId}/connections",
            post(timeline_handlers::create_connection),
        )
        .route(
            "/v1/projects/{projectId}/connections/{connectionId}",
            delete(timeline_handlers::delete_connection),
        )
        // Characters
        .route(
            "/v1/projects/{projectId}/characters",
            post(char_handlers::create_character),
        )
        .route(
            "/v1/projects/{projectId}/characters/{characterId}",
            get(char_handlers::get_character)
                .patch(char_handlers::update_character)
                .delete(char_handlers::delete_character),
        )
        // Relationships
        .route(
            "/v1/projects/{projectId}/relationships",
            post(char_handlers::create_relationship),
        )
        .route(
            "/v1/projects/{projectId}/relationships/{relationshipId}",
            patch(char_handlers::update_relationship)
                .delete(char_handlers::delete_relationship),
        )
        // Generation (SSE)
        .route(
            "/v1/projects/{projectId}/scenes/{sceneId}/generate",
            post(ai_handlers::generate_scene_draft),
        )
        .route(
            "/v1/projects/{projectId}/scenes/{sceneId}/edit",
            post(ai_handlers::edit_scene_draft),
        )
        // Scene Summary
        .route(
            "/v1/projects/{projectId}/scenes/{sceneId}/summary",
            get(ai_handlers::get_scene_summary).put(ai_handlers::upsert_scene_summary),
        )
        // Drafts
        .route(
            "/v1/projects/{projectId}/scenes/{sceneId}/drafts",
            get(ai_handlers::list_drafts).post(ai_handlers::save_draft),
        )
        .route(
            "/v1/projects/{projectId}/scenes/{sceneId}/drafts/{version}",
            get(ai_handlers::get_draft),
        );

    Router::new()
        .merge(public)
        .merge(authed)
        .layer(cors)
        .layer(SetResponseHeaderLayer::overriding(
            header::STRICT_TRANSPORT_SECURITY,
            HeaderValue::from_static("max-age=31536000; includeSubDomains"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            header::X_CONTENT_TYPE_OPTIONS,
            HeaderValue::from_static("nosniff"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            header::X_FRAME_OPTIONS,
            HeaderValue::from_static("DENY"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            header::REFERRER_POLICY,
            HeaderValue::from_static("strict-origin-when-cross-origin"),
        ))
        .layer(TimeoutLayer::with_status_code(
            axum::http::StatusCode::REQUEST_TIMEOUT,
            Duration::from_secs(60),
        ))
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => info!("received Ctrl+C, shutting down"),
        _ = terminate => info!("received SIGTERM, shutting down"),
    }
}
