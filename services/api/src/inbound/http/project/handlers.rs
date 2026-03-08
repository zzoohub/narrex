use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::Json;
use uuid::Uuid;

use crate::domain::project::models::{PaginationParams, PovType, Project, SourceType};
use crate::inbound::http::error::ApiError;
use crate::inbound::http::middleware::auth::AuthUser;
use crate::inbound::http::response::{ApiSuccess, Created, PaginatedResponse};
use crate::inbound::http::server::AppState;

use super::request::{CreateProjectDirectRequest, ListProjectsQuery, UpdateProjectRequest};
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

/// `POST /v1/projects` — create a project directly.
pub async fn create_project(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(body): Json<CreateProjectDirectRequest>,
) -> Result<Created<ProjectResponse>, ApiError> {
    let pov = body
        .pov
        .as_deref()
        .map(|s| s.parse::<PovType>())
        .transpose()
        .map_err(ApiError::UnprocessableEntity)?;

    let project = Project {
        id: Uuid::new_v4(),
        user_id: auth.user_id,
        title: body.title,
        genre: body.genre,
        theme: body.theme,
        era_location: body.era_location,
        pov,
        tone: body.tone,
        source_type: Some(SourceType::FreeText),
        source_input: body.source_input,
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
    };

    let created = state
        .project_service()
        .create_project(&project, auth.user_id)
        .await?;

    Ok(Created::new(ProjectResponse::from(&created)))
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
        .map_err(ApiError::UnprocessableEntity)?;

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
