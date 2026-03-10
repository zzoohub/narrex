use std::sync::Arc;

use tracing_subscriber::EnvFilter;

use narrex_api::config::Config;
use narrex_api::domain::ai::service::AiServiceImpl;
use narrex_api::domain::auth::service::AuthServiceImpl;
use narrex_api::domain::character::service::CharacterServiceImpl;
use narrex_api::domain::project::service::ProjectServiceImpl;
use narrex_api::domain::sample::service::SampleProjectService;
use narrex_api::domain::timeline::service::TimelineServiceImpl;
use narrex_api::inbound::http::server::{AppState, HttpServer};
use narrex_api::outbound::jwt::JwtTokenService;
use narrex_api::outbound::postgres::Postgres;
use narrex_api::outbound::storage::R2Storage;

use narrex_llm::{CfWorkersAiProvider, GeminiFlashProvider, LlmGateway};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 0. Load .env file (silently ignore if not present).
    dotenvy::dotenv().ok();

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

    // Defence-in-depth: refuse to start in test mode on release builds.
    if config.run_mode == "test" && !cfg!(debug_assertions) {
        anyhow::bail!("RUN_MODE=test is not permitted in release builds");
    }

    // 3. Create Postgres adapter (creates the PgPool internally).
    let postgres = Postgres::connect(&config.database_url).await?;
    tracing::info!("database connected");

    // 4. Create LLM gateway.
    let primary =
        CfWorkersAiProvider::new(config.cf_account_id.clone(), config.cf_api_token.clone());
    let fallback = GeminiFlashProvider::new(config.gemini_api_key.clone());
    let llm = Arc::new(LlmGateway::new(Box::new(primary), Box::new(fallback)));

    // 5. Create JwtTokenService.
    let token_service = JwtTokenService::new(&config.jwt_secret);

    // 6. Create R2 storage adapter.
    let r2_storage = R2Storage::new(
        &config.r2_account_id,
        &config.r2_access_key_id,
        &config.r2_secret_access_key,
        &config.r2_bucket_name,
        &config.r2_public_url,
    );

    // 7. Assemble domain services with adapters.
    let auth_service = AuthServiceImpl::new(postgres.clone(), token_service, r2_storage);
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
    let sample_service = SampleProjectService::new(postgres.clone());

    // 8. Build application state.
    let state = AppState::new(
        auth_service,
        project_service,
        timeline_service,
        character_service,
        ai_service,
        sample_service,
        Some(postgres.pool().clone()),
        config,
    );

    // 9. Create and run HTTP server with graceful shutdown.
    let server = HttpServer::new(state).await?;
    server.run().await
}
