use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::Response;
use axum::Json;
use uuid::Uuid;

use crate::domain::project::models::PaginationParams;
use crate::inbound::http::error::ApiError;
use crate::inbound::http::middleware::auth::AuthUser;
use crate::inbound::http::response::{ApiSuccess, PaginatedResponse};
use crate::inbound::http::server::AppState;

use super::request::{CreateProjectTextRequest, ListProjectsQuery, UpdateProjectRequest};
use super::response::{ProjectResponse, ProjectSummaryResponse, WorkspaceResponse};

/// `GET /v1/projects` — list user's projects with cursor pagination.
pub async fn list_projects(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<ListProjectsQuery>,
) -> Result<PaginatedResponse<ProjectSummaryResponse>, ApiError> {
    let params = PaginationParams {
        cursor: query.cursor,
        limit: query.limit.unwrap_or(20).clamp(1, 100),
    };

    let result = state
        .project_service()
        .list_projects(auth.user_id, &params)
        .await?;

    let data: Vec<ProjectSummaryResponse> =
        result.data.iter().map(ProjectSummaryResponse::from).collect();

    Ok(PaginatedResponse::new(
        data,
        params.limit,
        result.next_cursor,
        result.has_more,
    ))
}

/// `POST /v1/projects` — create a project with AI auto-structuring.
///
/// Phase 1 stub: returns a regular JSON response (SSE streaming deferred).
pub async fn create_project(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(body): Json<CreateProjectTextRequest>,
) -> Result<Response, ApiError> {
    let _ = (state, auth, body);
    // TODO: Implement SSE streaming project creation.
    // For Phase 1, return 501 to signal not yet implemented.
    Err(ApiError::Internal(
        "project creation with AI structuring not yet implemented".into(),
    ))
}

/// `GET /v1/projects/{projectId}` — get project details.
pub async fn get_project(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(project_id): Path<Uuid>,
) -> Result<ApiSuccess<ProjectResponse>, ApiError> {
    let project = state
        .project_service()
        .get_project(project_id, auth.user_id)
        .await?;

    Ok(ApiSuccess::new(ProjectResponse::from(&project)))
}

/// `PATCH /v1/projects/{projectId}` — update project config.
pub async fn update_project(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(project_id): Path<Uuid>,
    Json(body): Json<UpdateProjectRequest>,
) -> Result<ApiSuccess<ProjectResponse>, ApiError> {
    let update = body
        .try_into()
        .map_err(|e: String| ApiError::UnprocessableEntity(e))?;

    let project = state
        .project_service()
        .update_project(project_id, auth.user_id, &update)
        .await?;

    // Mark scenes as needs_revision when config changes affect generation context.
    // The timeline service handles this via the scene repository.
    let _ = state
        .timeline_service()
        .mark_scenes_needs_revision(project_id)
        .await;

    Ok(ApiSuccess::new(ProjectResponse::from(&project)))
}

/// `DELETE /v1/projects/{projectId}` — soft-delete a project.
pub async fn delete_project(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(project_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    state
        .project_service()
        .delete_project(project_id, auth.user_id)
        .await?;

    Ok(StatusCode::NO_CONTENT)
}

/// `GET /v1/projects/{projectId}/workspace` — get full workspace data.
pub async fn get_workspace(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(project_id): Path<Uuid>,
) -> Result<ApiSuccess<WorkspaceResponse>, ApiError> {
    let workspace = state
        .project_service()
        .get_workspace(project_id, auth.user_id)
        .await?;

    Ok(ApiSuccess::new(WorkspaceResponse::from(&workspace)))
}
