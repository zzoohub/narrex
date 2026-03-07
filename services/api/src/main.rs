use std::sync::Arc;

use tracing_subscriber::EnvFilter;

use narrex_api::config::Config;
use narrex_api::domain::ai::service::AiServiceImpl;
use narrex_api::domain::auth::service::AuthServiceImpl;
use narrex_api::domain::character::service::CharacterServiceImpl;
use narrex_api::domain::project::service::ProjectServiceImpl;
use narrex_api::domain::timeline::service::TimelineServiceImpl;
use narrex_api::inbound::http::server::{AppState, HttpServer};
use narrex_api::outbound::jwt::JwtTokenService;
use narrex_api::outbound::postgres::Postgres;

use narrex_llm::{CfWorkersAiProvider, GeminiFlashProvider, LlmGateway};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 1. Init tracing.
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .json()
        .init();

    // 2. Load config.
    let config = Config::from_env()?;
    tracing::info!(port = config.port, "configuration loaded");

    // 3. Create Postgres adapter (creates the PgPool internally).
    let postgres = Postgres::connect(&config.database_url).await?;
    tracing::info!("database connected");

    // 4. Create LLM gateway.
    let primary = CfWorkersAiProvider::new(
        config.cf_account_id.clone(),
        config.cf_api_token.clone(),
    );
    let fallback = GeminiFlashProvider::new(config.gemini_api_key.clone());
    let llm = Arc::new(LlmGateway::new(Box::new(primary), Box::new(fallback)));

    // 5. Create JwtTokenService.
    let token_service = JwtTokenService::new(&config.jwt_secret);

    // 6. Assemble domain services with adapters.
    let auth_service = AuthServiceImpl::new(postgres.clone(), token_service);
    let project_service = ProjectServiceImpl::new(postgres.clone());
    let timeline_service = TimelineServiceImpl::new(
        postgres.clone(),
        postgres.clone(),
        postgres.clone(),
        postgres.clone(),
    );
    let character_service = CharacterServiceImpl::new(postgres.clone(), postgres.clone());
    let ai_service = AiServiceImpl::new(
        postgres.clone(),
        postgres.clone(),
        postgres.clone(),
        postgres.clone(),
        postgres.clone(),
        llm,
    );

    // 7. Build application state.
    let state = AppState::new(
        auth_service,
        project_service,
        timeline_service,
        character_service,
        ai_service,
        postgres,
        config,
    );

    // 8. Create and run HTTP server with graceful shutdown.
    let server = HttpServer::new(state).await?;
    server.run().await
}
