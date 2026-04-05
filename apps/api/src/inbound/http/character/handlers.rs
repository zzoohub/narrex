use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use uuid::Uuid;

use crate::inbound::http::error::ApiError;
use crate::inbound::http::middleware::auth::AuthUser;
use crate::inbound::http::response::{ApiSuccess, Created};
use crate::inbound::http::server::AppState;

use super::request::{
    CreateCharacterRequest, CreateRelationshipRequest, UpdateCharacterRequest,
    UpdateRelationshipRequest,
};
use super::response::{CharacterResponse, RelationshipResponse};

// ---------------------------------------------------------------------------
// Characters
// ---------------------------------------------------------------------------

/// `GET /v1/projects/{projectId}/characters` — list characters.
pub async fn list_characters(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(project_id): Path<Uuid>,
) -> Result<ApiSuccess<Vec<CharacterResponse>>, ApiError> {
    state
        .project_service()
        .get_project(project_id, auth.user_id)
        .await?;

    let characters = state
        .character_service()
        .list_characters(project_id)
        .await?;

    let resp: Vec<CharacterResponse> = characters.iter().map(CharacterResponse::from).collect();
    Ok(ApiSuccess::new(resp))
}

/// `POST /v1/projects/{projectId}/characters` — create a character.
pub async fn create_character(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(project_id): Path<Uuid>,
    Json(body): Json<CreateCharacterRequest>,
) -> Result<Created<CharacterResponse>, ApiError> {
    state
        .project_service()
        .get_project(project_id, auth.user_id)
        .await?;

    let input = body.into();
    let character = state
        .character_service()
        .create_character(project_id, &input)
        .await?;

    Ok(Created::new(CharacterResponse::from(&character)))
}

/// `GET /v1/projects/{projectId}/characters/{characterId}` — get character.
pub async fn get_character(
    State(state): State<AppState>,
    auth: AuthUser,
    Path((project_id, character_id)): Path<(Uuid, Uuid)>,
) -> Result<ApiSuccess<CharacterResponse>, ApiError> {
    state
        .project_service()
        .get_project(project_id, auth.user_id)
        .await?;

    let character = state
        .character_service()
        .get_character(character_id)
        .await?;

    Ok(ApiSuccess::new(CharacterResponse::from(&character)))
}

/// `PATCH /v1/projects/{projectId}/characters/{characterId}` — update character.
pub async fn update_character(
    State(state): State<AppState>,
    auth: AuthUser,
    Path((project_id, character_id)): Path<(Uuid, Uuid)>,
    Json(body): Json<UpdateCharacterRequest>,
) -> Result<ApiSuccess<CharacterResponse>, ApiError> {
    state
        .project_service()
        .get_project(project_id, auth.user_id)
        .await?;

    let update = body.into();
    let character = state
        .character_service()
        .update_character(character_id, &update)
        .await?;

    Ok(ApiSuccess::new(CharacterResponse::from(&character)))
}

/// `DELETE /v1/projects/{projectId}/characters/{characterId}` — delete character.
pub async fn delete_character(
    State(state): State<AppState>,
    auth: AuthUser,
    Path((project_id, character_id)): Path<(Uuid, Uuid)>,
) -> Result<StatusCode, ApiError> {
    state
        .project_service()
        .get_project(project_id, auth.user_id)
        .await?;

    state
        .character_service()
        .delete_character(character_id)
        .await?;

    Ok(StatusCode::NO_CONTENT)
}

// ---------------------------------------------------------------------------
// Relationships
// ---------------------------------------------------------------------------

/// `POST /v1/projects/{projectId}/relationships` — create a relationship.
pub async fn create_relationship(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(project_id): Path<Uuid>,
    Json(body): Json<CreateRelationshipRequest>,
) -> Result<Created<RelationshipResponse>, ApiError> {
    state
        .project_service()
        .get_project(project_id, auth.user_id)
        .await?;

    let input = body
        .try_into()
        .map_err(ApiError::UnprocessableEntity)?;

    let relationship = state
        .character_service()
        .create_relationship(project_id, &input)
        .await?;

    Ok(Created::new(RelationshipResponse::from(&relationship)))
}

/// `PATCH /v1/projects/{projectId}/relationships/{relationshipId}` — update.
pub async fn update_relationship(
    State(state): State<AppState>,
    auth: AuthUser,
    Path((project_id, relationship_id)): Path<(Uuid, Uuid)>,
    Json(body): Json<UpdateRelationshipRequest>,
) -> Result<ApiSuccess<RelationshipResponse>, ApiError> {
    state
        .project_service()
        .get_project(project_id, auth.user_id)
        .await?;

    let update = body
        .try_into()
        .map_err(ApiError::UnprocessableEntity)?;

    let relationship = state
        .character_service()
        .update_relationship(relationship_id, &update)
        .await?;

    Ok(ApiSuccess::new(RelationshipResponse::from(&relationship)))
}

/// `DELETE /v1/projects/{projectId}/relationships/{relationshipId}` — delete.
pub async fn delete_relationship(
    State(state): State<AppState>,
    auth: AuthUser,
    Path((project_id, relationship_id)): Path<(Uuid, Uuid)>,
) -> Result<StatusCode, ApiError> {
    state
        .project_service()
        .get_project(project_id, auth.user_id)
        .await?;

    state
        .character_service()
        .delete_relationship(relationship_id)
        .await?;

    Ok(StatusCode::NO_CONTENT)
}
