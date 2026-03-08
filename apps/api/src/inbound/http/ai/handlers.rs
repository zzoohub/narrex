use std::convert::Infallible;

use axum::extract::{Path, State};
use axum::response::sse::{Event, Sse};
use axum::Json;
use futures::stream::StreamExt;
use uuid::Uuid;

use crate::domain::ai::service::SseEvent;
use crate::inbound::http::error::ApiError;
use crate::inbound::http::middleware::auth::AuthUser;
use crate::inbound::http::response::{ApiSuccess, Created};
use crate::inbound::http::server::AppState;

/// Verify a scene belongs to the given project. Returns `ApiError::NotFound` if not.
async fn verify_scene_ownership(
    state: &AppState,
    project_id: Uuid,
    scene_id: Uuid,
) -> Result<(), ApiError> {
    let scene = state.timeline_service().get_scene(scene_id).await?;
    if scene.project_id != project_id {
        return Err(ApiError::NotFound("scene not found in this project".into()));
    }
    Ok(())
}

use super::request::{EditDraftHttpRequest, SaveDraftRequest, UpsertSceneSummaryRequest};
use super::response::{
    CostSummaryResponse, DraftResponse, DraftSummaryResponse, SceneSummaryResponse,
};

/// `POST /v1/projects/{projectId}/scenes/{sceneId}/generate` — generate AI draft (SSE).
pub async fn generate_scene_draft(
    State(state): State<AppState>,
    auth: AuthUser,
    Path((project_id, scene_id)): Path<(Uuid, Uuid)>,
) -> Result<Sse<impl futures::Stream<Item = Result<Event, Infallible>>>, ApiError> {
    // Verify project ownership and scene belongs to project.
    state
        .project_service()
        .get_project(project_id, auth.user_id)
        .await?;
    verify_scene_ownership(&state, project_id, scene_id).await?;

    let stream = state
        .ai_service()
        .generate_scene_draft(auth.user_id, project_id, scene_id)
        .await?;

    let sse_stream = stream.map(|result| match result {
        Ok(event) => Ok(map_sse_event(event)),
        Err(infallible) => match infallible {},
    });

    Ok(Sse::new(sse_stream))
}

/// `POST /v1/projects/{projectId}/scenes/{sceneId}/edit` — edit draft via direction (SSE).
pub async fn edit_scene_draft(
    State(state): State<AppState>,
    auth: AuthUser,
    Path((project_id, scene_id)): Path<(Uuid, Uuid)>,
    Json(body): Json<EditDraftHttpRequest>,
) -> Result<Sse<impl futures::Stream<Item = Result<Event, Infallible>>>, ApiError> {
    state
        .project_service()
        .get_project(project_id, auth.user_id)
        .await?;
    verify_scene_ownership(&state, project_id, scene_id).await?;

    let edit_req = body.into();
    let stream = state
        .ai_service()
        .edit_scene_draft(auth.user_id, project_id, scene_id, &edit_req)
        .await?;

    let sse_stream = stream.map(|result| match result {
        Ok(event) => Ok(map_sse_event(event)),
        Err(infallible) => match infallible {},
    });

    Ok(Sse::new(sse_stream))
}

/// `POST /v1/projects/{projectId}/scenes/{sceneId}/drafts` — save manual draft.
pub async fn save_draft(
    State(state): State<AppState>,
    auth: AuthUser,
    Path((project_id, scene_id)): Path<(Uuid, Uuid)>,
    Json(body): Json<SaveDraftRequest>,
) -> Result<Created<DraftResponse>, ApiError> {
    state
        .project_service()
        .get_project(project_id, auth.user_id)
        .await?;
    verify_scene_ownership(&state, project_id, scene_id).await?;

    let input = body.into();
    let draft = state
        .ai_service()
        .save_manual_draft(scene_id, &input)
        .await?;

    Ok(Created::new(DraftResponse::from(&draft)))
}

/// `GET /v1/projects/{projectId}/scenes/{sceneId}/drafts` — list draft summaries.
pub async fn list_drafts(
    State(state): State<AppState>,
    auth: AuthUser,
    Path((project_id, scene_id)): Path<(Uuid, Uuid)>,
) -> Result<ApiSuccess<Vec<DraftSummaryResponse>>, ApiError> {
    state
        .project_service()
        .get_project(project_id, auth.user_id)
        .await?;
    verify_scene_ownership(&state, project_id, scene_id).await?;

    let drafts = state.ai_service().list_drafts(scene_id).await?;
    let data: Vec<DraftSummaryResponse> = drafts.iter().map(DraftSummaryResponse::from).collect();

    Ok(ApiSuccess::new(data))
}

/// `GET /v1/projects/{projectId}/scenes/{sceneId}/drafts/{version}` — get specific draft.
pub async fn get_draft(
    State(state): State<AppState>,
    auth: AuthUser,
    Path((project_id, scene_id, version)): Path<(Uuid, Uuid, i32)>,
) -> Result<ApiSuccess<DraftResponse>, ApiError> {
    state
        .project_service()
        .get_project(project_id, auth.user_id)
        .await?;
    verify_scene_ownership(&state, project_id, scene_id).await?;

    let draft = state.ai_service().get_draft(scene_id, version).await?;

    Ok(ApiSuccess::new(DraftResponse::from(&draft)))
}

/// `GET /v1/projects/{projectId}/scenes/{sceneId}/summary` — get scene summary.
pub async fn get_scene_summary(
    State(state): State<AppState>,
    auth: AuthUser,
    Path((project_id, scene_id)): Path<(Uuid, Uuid)>,
) -> Result<ApiSuccess<SceneSummaryResponse>, ApiError> {
    state
        .project_service()
        .get_project(project_id, auth.user_id)
        .await?;
    verify_scene_ownership(&state, project_id, scene_id).await?;

    let summary = state.ai_service().get_scene_summary(scene_id).await?;
    Ok(ApiSuccess::new(SceneSummaryResponse::from(&summary)))
}

/// `GET /v1/me/costs` — get cost summary for the current user.
pub async fn get_user_costs(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<ApiSuccess<CostSummaryResponse>, ApiError> {
    let summary = state
        .ai_service()
        .user_cost_summary(auth.user_id)
        .await?;
    Ok(ApiSuccess::new(CostSummaryResponse::from(&summary)))
}

/// `GET /v1/projects/{projectId}/costs` — get cost summary for a project.
pub async fn get_project_costs(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(project_id): Path<Uuid>,
) -> Result<ApiSuccess<CostSummaryResponse>, ApiError> {
    state
        .project_service()
        .get_project(project_id, auth.user_id)
        .await?;

    let summary = state
        .ai_service()
        .project_cost_summary(project_id)
        .await?;
    Ok(ApiSuccess::new(CostSummaryResponse::from(&summary)))
}

/// `PUT /v1/projects/{projectId}/scenes/{sceneId}/summary` — upsert scene summary.
pub async fn upsert_scene_summary(
    State(state): State<AppState>,
    auth: AuthUser,
    Path((project_id, scene_id)): Path<(Uuid, Uuid)>,
    Json(body): Json<UpsertSceneSummaryRequest>,
) -> Result<ApiSuccess<SceneSummaryResponse>, ApiError> {
    state
        .project_service()
        .get_project(project_id, auth.user_id)
        .await?;
    verify_scene_ownership(&state, project_id, scene_id).await?;

    let summary = state
        .ai_service()
        .upsert_scene_summary(scene_id, body.draft_version, &body.summary_text, None)
        .await?;

    Ok(ApiSuccess::new(SceneSummaryResponse::from(&summary)))
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn map_sse_event(event: SseEvent) -> Event {
    match event {
        SseEvent::Token { text } => Event::default()
            .event("token")
            .data(serde_json::json!({"text": text}).to_string()),
        SseEvent::Completed { draft } => {
            let draft_resp = DraftResponse::from(&draft);
            Event::default()
                .event("completed")
                .data(serde_json::json!({"draft": draft_resp}).to_string())
        }
        SseEvent::Error { message } => Event::default()
            .event("error")
            .data(serde_json::json!({"message": message}).to_string()),
    }
}
