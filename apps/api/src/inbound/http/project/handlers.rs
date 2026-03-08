use std::convert::Infallible;

use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::sse::{Event, Sse};
use axum::Json;
use uuid::Uuid;

use crate::domain::ai::models::{GenerationLog, GenerationStatus, GenerationType};
use crate::domain::character::models::{
    CreateCharacter, CreateRelationship, RelationshipDirection, RelationshipVisual,
};
use crate::domain::project::models::{PaginationParams, PovType, Project, SourceType};
use crate::domain::timeline::models::{CreateScene, CreateTrack};
use crate::inbound::http::error::ApiError;
use crate::inbound::http::middleware::auth::AuthUser;
use crate::inbound::http::response::{ApiSuccess, Created, PaginatedResponse};
use crate::inbound::http::server::AppState;

use super::request::{
    CreateProjectDirectRequest, CreateProjectTextRequest, ListProjectsQuery, UpdateProjectRequest,
};
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

/// `POST /v1/projects/structure` — AI-powered project structuring (SSE).
pub async fn structure_project(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(body): Json<CreateProjectTextRequest>,
) -> Result<Sse<impl futures::Stream<Item = Result<Event, Infallible>>>, ApiError> {
    tracing::info!(user_id = %auth.user_id, input_len = body.source_input.len(), "structure_project: started");
    let source_input = body.source_input.clone();
    let clarification_answers = body.clarification_answers.clone();
    let user = state.auth_service().get_user(auth.user_id).await.map_err(|_| {
        ApiError::Unauthorized("user not found".into())
    })?;
    let locale = user.language_preference;

    let stream = async_stream::stream! {
        use std::time::Instant;
        let start = Instant::now();

        // 1. Progress: analyzing
        yield Ok(Event::default()
            .event("progress")
            .data(serde_json::json!({"message": "등장인물과 관계를 찾는 중"}).to_string()));

        // 2. Call LLM
        let answers_ref = clarification_answers.as_deref();
        let result = state.ai_service().generate_structure(&source_input, answers_ref, &locale).await;

        let (output, model, provider, tokens_in, tokens_out) = match result {
            Ok(v) => {
                tracing::info!(model = %v.1, provider = %v.2, tokens_in = v.3, tokens_out = v.4, "structure_project: LLM succeeded");
                v
            }
            Err(e) => {
                tracing::error!(error = %e, "structure_project: LLM failed");
                yield Ok(Event::default()
                    .event("error")
                    .data(serde_json::json!({"message": e.to_string()}).to_string()));
                return;
            }
        };

        // 3. Progress: creating project
        yield Ok(Event::default()
            .event("progress")
            .data(serde_json::json!({"message": "줄거리를 타임라인으로 정리하는 중"}).to_string()));

        // 4. Create project
        let pov = output.pov.as_deref().and_then(|s| s.parse().ok());
        let project = Project {
            id: uuid::Uuid::new_v4(),
            user_id: auth.user_id,
            title: output.title.clone(),
            genre: output.genre.clone(),
            theme: output.theme.clone(),
            era_location: output.era_location.clone(),
            pov,
            tone: output.tone.clone(),
            source_type: Some(SourceType::FreeText),
            source_input: Some(source_input.clone()),
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };

        let project = match state.project_service().create_project(&project, auth.user_id).await {
            Ok(p) => p,
            Err(e) => {
                yield Ok(Event::default()
                    .event("error")
                    .data(serde_json::json!({"message": e.to_string()}).to_string()));
                return;
            }
        };
        let project_id = project.id;

        // 5. Create characters (collect name -> id mapping)
        let mut char_name_to_id = std::collections::HashMap::new();
        for ch in &output.characters {
            let input = CreateCharacter {
                name: ch.name.clone(),
                personality: ch.personality.clone(),
                appearance: ch.appearance.clone(),
                secrets: ch.secrets.clone(),
                motivation: ch.motivation.clone(),
                profile_image_url: None,
                graph_x: None,
                graph_y: None,
            };
            match state.character_service().create_character(project_id, &input).await {
                Ok(created) => { char_name_to_id.insert(ch.name.clone(), created.id); }
                Err(e) => {
                    tracing::warn!("failed to create character {}: {e}", ch.name);
                }
            }
        }

        // 6. Create relationships
        for rel in &output.relationships {
            let a_id = char_name_to_id.get(&rel.character_a);
            let b_id = char_name_to_id.get(&rel.character_b);
            if let (Some(&a), Some(&b)) = (a_id, b_id) {
                // Enforce a < b ordering
                let (ordered_a, ordered_b, direction) = if a < b {
                    let dir = rel.direction.as_deref()
                        .and_then(|s| s.parse::<RelationshipDirection>().ok())
                        .unwrap_or(RelationshipDirection::Bidirectional);
                    (a, b, dir)
                } else {
                    // Flip a_to_b / b_to_a when swapping
                    let dir = match rel.direction.as_deref()
                        .and_then(|s| s.parse::<RelationshipDirection>().ok())
                        .unwrap_or(RelationshipDirection::Bidirectional)
                    {
                        RelationshipDirection::AToB => RelationshipDirection::BToA,
                        RelationshipDirection::BToA => RelationshipDirection::AToB,
                        d => d,
                    };
                    (b, a, dir)
                };
                let input = CreateRelationship {
                    character_a_id: ordered_a,
                    character_b_id: ordered_b,
                    label: rel.label.clone(),
                    visual_type: RelationshipVisual::Solid,
                    direction,
                };
                let _ = state.character_service().create_relationship(project_id, &input).await;
            }
        }

        // 7. Progress: world building
        yield Ok(Event::default()
            .event("progress")
            .data(serde_json::json!({"message": "작품 세계를 설정하는 중"}).to_string()));

        // 8. Create tracks and scenes
        for (track_idx, track_data) in output.tracks.iter().enumerate() {
            let track_input = CreateTrack {
                label: track_data.label.clone(),
                position: Some((track_idx as f64 + 1.0) * 1024.0),
            };
            let track = match state.timeline_service().create_track(project_id, &track_input).await {
                Ok(t) => t,
                Err(e) => {
                    tracing::warn!("failed to create track: {e}");
                    continue;
                }
            };

            for (scene_idx, scene_data) in track_data.scenes.iter().enumerate() {
                let character_ids: Vec<uuid::Uuid> = scene_data
                    .characters
                    .as_deref()
                    .unwrap_or(&[])
                    .iter()
                    .filter_map(|name| char_name_to_id.get(name).copied())
                    .collect();

                let scene_input = CreateScene {
                    track_id: track.id,
                    title: scene_data.title.clone(),
                    start_position: Some(scene_idx as f64 * 1024.0),
                    duration: Some(1.0),
                    plot_summary: scene_data.plot_summary.clone(),
                    location: scene_data.location.clone(),
                    mood_tags: scene_data.mood_tags.clone().unwrap_or_default(),
                    character_ids,
                };
                let _ = state
                    .timeline_service()
                    .create_scene(project_id, &scene_input)
                    .await;
            }
        }

        // 9. Log generation
        let elapsed = start.elapsed().as_millis() as i32;
        let log = GenerationLog {
            id: uuid::Uuid::new_v4(),
            user_id: auth.user_id,
            project_id: Some(project_id),
            scene_id: None,
            generation_type: GenerationType::Structuring,
            status: GenerationStatus::Success,
            model: model.clone(),
            provider: provider.clone(),
            duration_ms: elapsed,
            token_count_input: tokens_in as i32,
            token_count_output: tokens_out as i32,
            cost_usd: 0.0,
            error_message: None,
            created_at: chrono::Utc::now(),
        };
        let _ = state.ai_service().log_generation(&log).await;

        // 10. Load workspace and send completed
        match state.project_service().get_workspace(project_id, auth.user_id).await {
            Ok(workspace) => {
                let _ws_resp = WorkspaceResponse::from(&workspace);
                yield Ok(Event::default()
                    .event("completed")
                    .data(serde_json::json!({"data": {"project": {"id": project_id}}}).to_string()));
            }
            Err(e) => {
                yield Ok(Event::default()
                    .event("error")
                    .data(serde_json::json!({"message": e.to_string()}).to_string()));
            }
        }
    };

    Ok(Sse::new(stream))
}
