use axum::extract::State;
use axum::Json;
use serde::Serialize;

use super::server::AppState;

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub database: &'static str,
}

/// `GET /health` — checks DB connectivity, no auth required.
pub async fn health_check(State(state): State<AppState>) -> Json<HealthResponse> {
    let db_status = match sqlx::query("SELECT 1").execute(state.db_pool()).await {
        Ok(_) => "connected",
        Err(_) => "disconnected",
    };

    Json(HealthResponse {
        status: "ok",
        database: db_status,
    })
}
