use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use uuid::Uuid;

use crate::inbound::http::error::ApiError;
use crate::inbound::http::middleware::auth::AuthUser;
use crate::inbound::http::response::{ApiSuccess, Created};
use crate::inbound::http::server::AppState;

use super::request::{
    CreateConnectionRequest, CreateSceneRequest, CreateTrackRequest, UpdateSceneRequest,
    UpdateTrackRequest,
};
use super::response::{
    ConnectionResponse, SceneDetailResponse, SceneResponse, TrackResponse,
};

// ---------------------------------------------------------------------------
// Tracks
// ---------------------------------------------------------------------------

/// `POST /v1/projects/{projectId}/tracks` — create a timeline track.
pub async fn create_track(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(project_id): Path<Uuid>,
    Json(body): Json<CreateTrackRequest>,
) -> Result<Created<TrackResponse>, ApiError> {
    // Verify project ownership.
    state
        .project_service()
        .get_project(project_id, auth.user_id)
        .await?;

    let input = body.into();
    let track = state
        .timeline_service()
        .create_track(project_id, &input)
        .await?;

    Ok(Created::new(TrackResponse::from(&track)))
}

/// `PATCH /v1/projects/{projectId}/tracks/{trackId}` — update a track.
pub async fn update_track(
    State(state): State<AppState>,
    auth: AuthUser,
    Path((project_id, track_id)): Path<(Uuid, Uuid)>,
    Json(body): Json<UpdateTrackRequest>,
) -> Result<ApiSuccess<TrackResponse>, ApiError> {
    state
        .project_service()
        .get_project(project_id, auth.user_id)
        .await?;

    let update = body.into();
    let track = state
        .timeline_service()
        .update_track(track_id, &update)
        .await?;

    Ok(ApiSuccess::new(TrackResponse::from(&track)))
}

/// `DELETE /v1/projects/{projectId}/tracks/{trackId}` — delete a track.
pub async fn delete_track(
    State(state): State<AppState>,
    auth: AuthUser,
    Path((project_id, track_id)): Path<(Uuid, Uuid)>,
) -> Result<StatusCode, ApiError> {
    state
        .project_service()
        .get_project(project_id, auth.user_id)
        .await?;

    state.timeline_service().delete_track(track_id).await?;

    Ok(StatusCode::NO_CONTENT)
}

// ---------------------------------------------------------------------------
// Scenes
// ---------------------------------------------------------------------------

/// `POST /v1/projects/{projectId}/scenes` — create a scene on a track.
pub async fn create_scene(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(project_id): Path<Uuid>,
    Json(body): Json<CreateSceneRequest>,
) -> Result<Created<SceneResponse>, ApiError> {
    state
        .project_service()
        .get_project(project_id, auth.user_id)
        .await?;

    let input = body.into();
    let scene = state
        .timeline_service()
        .create_scene(project_id, &input)
        .await?;

    Ok(Created::new(SceneResponse::from(&scene)))
}

/// `GET /v1/projects/{projectId}/scenes/{sceneId}` — get scene with latest draft.
pub async fn get_scene(
    State(state): State<AppState>,
    auth: AuthUser,
    Path((project_id, scene_id)): Path<(Uuid, Uuid)>,
) -> Result<ApiSuccess<SceneDetailResponse>, ApiError> {
    state
        .project_service()
        .get_project(project_id, auth.user_id)
        .await?;

    let detail = state.timeline_service().get_scene_detail(scene_id).await?;

    Ok(ApiSuccess::new(SceneDetailResponse::from(&detail)))
}

/// `PATCH /v1/projects/{projectId}/scenes/{sceneId}` — update scene metadata.
pub async fn update_scene(
    State(state): State<AppState>,
    auth: AuthUser,
    Path((project_id, scene_id)): Path<(Uuid, Uuid)>,
    Json(body): Json<UpdateSceneRequest>,
) -> Result<ApiSuccess<SceneResponse>, ApiError> {
    state
        .project_service()
        .get_project(project_id, auth.user_id)
        .await?;

    let update = body.into();
    let scene = state
        .timeline_service()
        .update_scene(scene_id, &update)
        .await?;

    Ok(ApiSuccess::new(SceneResponse::from(&scene)))
}

/// `DELETE /v1/projects/{projectId}/scenes/{sceneId}` — delete a scene.
pub async fn delete_scene(
    State(state): State<AppState>,
    auth: AuthUser,
    Path((project_id, scene_id)): Path<(Uuid, Uuid)>,
) -> Result<StatusCode, ApiError> {
    state
        .project_service()
        .get_project(project_id, auth.user_id)
        .await?;

    state.timeline_service().delete_scene(scene_id).await?;

    Ok(StatusCode::NO_CONTENT)
}

// ---------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------

/// `POST /v1/projects/{projectId}/connections` — create a connection.
pub async fn create_connection(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(project_id): Path<Uuid>,
    Json(body): Json<CreateConnectionRequest>,
) -> Result<Created<ConnectionResponse>, ApiError> {
    state
        .project_service()
        .get_project(project_id, auth.user_id)
        .await?;

    let input = body
        .try_into()
        .map_err(|e: String| ApiError::UnprocessableEntity(e))?;

    let connection = state
        .timeline_service()
        .create_connection(project_id, &input)
        .await?;

    Ok(Created::new(ConnectionResponse::from(&connection)))
}

/// `DELETE /v1/projects/{projectId}/connections/{connectionId}` — delete a connection.
pub async fn delete_connection(
    State(state): State<AppState>,
    auth: AuthUser,
    Path((project_id, connection_id)): Path<(Uuid, Uuid)>,
) -> Result<StatusCode, ApiError> {
    state
        .project_service()
        .get_project(project_id, auth.user_id)
        .await?;

    state
        .timeline_service()
        .delete_connection(connection_id)
        .await?;

    Ok(StatusCode::NO_CONTENT)
}
