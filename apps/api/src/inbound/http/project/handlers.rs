use std::convert::Infallible;

use axum::extract::{Multipart, Path, Query, State};
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
///
/// Three-phase streaming: World → Characters → Timeline, each streamed
/// token-by-token with previous outputs chained as context.
pub async fn structure_project(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(body): Json<CreateProjectTextRequest>,
) -> Result<Sse<impl futures::Stream<Item = Result<Event, Infallible>>>, ApiError> {
    // Check quota before starting generation.
    state.ai_service().check_quota(auth.user_id).await?;

    tracing::info!(user_id = %auth.user_id, input_len = body.source_input.len(), "structure_project: started");
    let source_input = body.source_input.clone();
    let clarification_answers = body.clarification_answers.clone();
    let user = state.auth_service().get_user(auth.user_id).await.map_err(|_| {
        ApiError::Unauthorized("user not found".into())
    })?;
    let locale = user.language_preference;

    let stream = async_stream::stream! {
        use std::time::Instant;
        use futures::StreamExt;
        use crate::domain::ai::service::{parse_world_output, parse_characters_output, parse_timeline_output};

        let start = Instant::now();
        let mut total_model = String::new();
        let mut total_provider = String::new();
        let mut total_tokens_in: u32 = 0;
        let mut total_tokens_out: u32 = 0;

        // ── Phase 1: World ──────────────────────────────────────────
        yield Ok(Event::default()
            .event("progress")
            .data(serde_json::json!({"message": "작품 세계를 설정하는 중"}).to_string()));

        let answers_ref = clarification_answers.as_deref();
        let world_stream = match state.ai_service().stream_world(&source_input, answers_ref, &locale).await {
            Ok(s) => s,
            Err(e) => {
                tracing::error!(error = %e, "structure_project: world stream failed");
                yield Ok(Event::default().event("error")
                    .data(serde_json::json!({"message": e.to_string()}).to_string()));
                return;
            }
        };

        let mut world_buffer = String::new();
        let mut world_stream = Box::pin(world_stream);
        while let Some(result) = world_stream.next().await {
            match result {
                Ok(chunk) => {
                    if chunk.done {
                        if let Some(ref usage) = chunk.usage {
                            total_model = usage.model.clone();
                            total_provider = usage.provider.clone();
                            total_tokens_in += usage.token_count_input;
                            total_tokens_out += usage.token_count_output;
                        }
                    } else {
                        world_buffer.push_str(&chunk.text);
                        yield Ok(Event::default().event("token")
                            .data(serde_json::json!({"text": chunk.text}).to_string()));
                    }
                }
                Err(e) => {
                    tracing::error!(error = %e, "structure_project: world stream error");
                    yield Ok(Event::default().event("error")
                        .data(serde_json::json!({"message": e.to_string()}).to_string()));
                    return;
                }
            }
        }

        tracing::info!(model = %total_model, provider = %total_provider, "structure_project: Phase 1 (world) done");

        let world_output = match parse_world_output(&world_buffer) {
            Ok(o) => o,
            Err(e) => {
                tracing::error!(error = %e, "structure_project: world parse failed");
                yield Ok(Event::default().event("error")
                    .data(serde_json::json!({"message": e.to_string()}).to_string()));
                return;
            }
        };

        // Create project from world output
        let pov = world_output.pov.as_deref().and_then(|s| s.parse().ok());
        let project = Project {
            id: uuid::Uuid::new_v4(),
            user_id: auth.user_id,
            title: world_output.title.clone(),
            genre: world_output.genre.clone(),
            theme: world_output.theme.clone(),
            era_location: world_output.era_location.clone(),
            pov,
            tone: world_output.tone.clone(),
            source_type: Some(SourceType::FreeText),
            source_input: Some(source_input.clone()),
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };

        let project = match state.project_service().create_project(&project, auth.user_id).await {
            Ok(p) => p,
            Err(e) => {
                yield Ok(Event::default().event("error")
                    .data(serde_json::json!({"message": e.to_string()}).to_string()));
                return;
            }
        };
        let project_id = project.id;

        // Extract JSON for context chaining
        let world_json_for_context = crate::domain::ai::service::extract_json_from_raw(&world_buffer)
            .unwrap_or_else(|| world_buffer.clone());

        // ── Phase 2: Characters ─────────────────────────────────────
        yield Ok(Event::default()
            .event("progress")
            .data(serde_json::json!({"message": "등장인물과 관계를 찾는 중"}).to_string()));

        let char_stream = match state.ai_service().stream_characters(&source_input, &world_json_for_context, &locale).await {
            Ok(s) => s,
            Err(e) => {
                tracing::error!(error = %e, "structure_project: characters stream failed");
                yield Ok(Event::default().event("error")
                    .data(serde_json::json!({"message": e.to_string()}).to_string()));
                return;
            }
        };

        let mut char_buffer = String::new();
        let mut char_stream = Box::pin(char_stream);
        while let Some(result) = char_stream.next().await {
            match result {
                Ok(chunk) => {
                    if chunk.done {
                        if let Some(ref usage) = chunk.usage {
                            total_model = usage.model.clone();
                            total_provider = usage.provider.clone();
                            total_tokens_in += usage.token_count_input;
                            total_tokens_out += usage.token_count_output;
                        }
                    } else {
                        char_buffer.push_str(&chunk.text);
                        yield Ok(Event::default().event("token")
                            .data(serde_json::json!({"text": chunk.text}).to_string()));
                    }
                }
                Err(e) => {
                    tracing::error!(error = %e, "structure_project: characters stream error");
                    yield Ok(Event::default().event("error")
                        .data(serde_json::json!({"message": e.to_string()}).to_string()));
                    return;
                }
            }
        }

        tracing::info!(model = %total_model, provider = %total_provider, "structure_project: Phase 2 (characters) done");

        let char_output = match parse_characters_output(&char_buffer) {
            Ok(o) => o,
            Err(e) => {
                tracing::error!(error = %e, "structure_project: characters parse failed");
                yield Ok(Event::default().event("error")
                    .data(serde_json::json!({"message": e.to_string()}).to_string()));
                return;
            }
        };

        // Create characters
        let mut char_name_to_id = std::collections::HashMap::new();
        for ch in &char_output.characters {
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
                Err(e) => { tracing::warn!("failed to create character {}: {e}", ch.name); }
            }
        }

        // Create relationships
        for rel in &char_output.relationships {
            let a_id = char_name_to_id.get(&rel.character_a);
            let b_id = char_name_to_id.get(&rel.character_b);
            if let (Some(&a), Some(&b)) = (a_id, b_id) {
                let (ordered_a, ordered_b, direction) = if a < b {
                    let dir = rel.direction.as_deref()
                        .and_then(|s| s.parse::<RelationshipDirection>().ok())
                        .unwrap_or(RelationshipDirection::Bidirectional);
                    (a, b, dir)
                } else {
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

        // Extract characters JSON for context chaining
        let char_json_for_context = crate::domain::ai::service::extract_json_from_raw(&char_buffer)
            .unwrap_or_else(|| char_buffer.clone());

        // ── Phase 3: Timeline ───────────────────────────────────────
        yield Ok(Event::default()
            .event("progress")
            .data(serde_json::json!({"message": "줄거리를 타임라인으로 정리하는 중"}).to_string()));

        let timeline_stream = match state.ai_service().stream_timeline(&source_input, &world_json_for_context, &char_json_for_context, &locale).await {
            Ok(s) => s,
            Err(e) => {
                tracing::error!(error = %e, "structure_project: timeline stream failed");
                yield Ok(Event::default().event("error")
                    .data(serde_json::json!({"message": e.to_string()}).to_string()));
                return;
            }
        };

        let mut timeline_buffer = String::new();
        let mut timeline_stream = Box::pin(timeline_stream);
        while let Some(result) = timeline_stream.next().await {
            match result {
                Ok(chunk) => {
                    if chunk.done {
                        if let Some(ref usage) = chunk.usage {
                            total_model = usage.model.clone();
                            total_provider = usage.provider.clone();
                            total_tokens_in += usage.token_count_input;
                            total_tokens_out += usage.token_count_output;
                        }
                    } else {
                        timeline_buffer.push_str(&chunk.text);
                        yield Ok(Event::default().event("token")
                            .data(serde_json::json!({"text": chunk.text}).to_string()));
                    }
                }
                Err(e) => {
                    tracing::error!(error = %e, "structure_project: timeline stream error");
                    yield Ok(Event::default().event("error")
                        .data(serde_json::json!({"message": e.to_string()}).to_string()));
                    return;
                }
            }
        }

        tracing::info!(model = %total_model, provider = %total_provider, "structure_project: Phase 3 (timeline) done");

        let timeline_output = match parse_timeline_output(&timeline_buffer) {
            Ok(o) => o,
            Err(e) => {
                tracing::error!(error = %e, "structure_project: timeline parse failed");
                yield Ok(Event::default().event("error")
                    .data(serde_json::json!({"message": e.to_string()}).to_string()));
                return;
            }
        };

        // Create tracks and scenes
        for (track_idx, track_data) in timeline_output.tracks.iter().enumerate() {
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

        // Log generation
        let elapsed = start.elapsed().as_millis() as i32;
        let log = GenerationLog {
            id: uuid::Uuid::new_v4(),
            user_id: auth.user_id,
            project_id: Some(project_id),
            scene_id: None,
            generation_type: GenerationType::Structuring,
            status: GenerationStatus::Success,
            model: total_model.clone(),
            provider: total_provider.clone(),
            duration_ms: elapsed,
            token_count_input: total_tokens_in as i32,
            token_count_output: total_tokens_out as i32,
            cost_usd: 0.0,
            error_message: None,
            created_at: chrono::Utc::now(),
        };
        let _ = state.ai_service().log_generation(&log).await;

        // Send completed
        yield Ok(Event::default()
            .event("completed")
            .data(serde_json::json!({"data": {"project": {"id": project_id}}}).to_string()));
    };

    Ok(Sse::new(stream))
}

/// `POST /v1/projects/import` — import a file and structure it (SSE).
///
/// Accepts multipart form data with a single file field.
/// Supported formats: .txt, .md (Markdown).
/// Extracts text content and feeds it to the same structuring pipeline.
pub async fn import_project(
    State(state): State<AppState>,
    auth: AuthUser,
    mut multipart: Multipart,
) -> Result<Sse<impl futures::Stream<Item = Result<Event, Infallible>>>, ApiError> {
    // Check quota before starting.
    state.ai_service().check_quota(auth.user_id).await?;

    // Extract file from multipart.
    let mut file_data: Option<(String, Vec<u8>)> = None;
    while let Ok(Some(field)) = multipart.next_field().await {
        let file_name = field
            .file_name()
            .map(|s| s.to_string())
            .unwrap_or_default();
        let data = field
            .bytes()
            .await
            .map_err(|e| ApiError::BadRequest(format!("failed to read file: {e}")))?;
        file_data = Some((file_name, data.to_vec()));
        break; // Only process the first file.
    }

    let (file_name, data) = file_data.ok_or_else(|| ApiError::BadRequest("no file provided".into()))?;

    // Parse file content.
    let source_input = extract_text_from_file(&file_name, &data)
        .map_err(|e| ApiError::BadRequest(e))?;

    if source_input.trim().is_empty() {
        return Err(ApiError::BadRequest("file contains no text content".into()));
    }

    tracing::info!(
        user_id = %auth.user_id,
        file_name = %file_name,
        content_len = source_input.len(),
        "import_project: file parsed"
    );

    // Feed to the same structuring pipeline as structure_project.
    let body = CreateProjectTextRequest {
        source_input,
        clarification_answers: None,
    };

    // Delegate to structure_project logic via JSON body.
    structure_project(State(state), auth, Json(body)).await
}

// ---------------------------------------------------------------------------
// File parsing
// ---------------------------------------------------------------------------

/// Max file size: 5 MB.
const MAX_IMPORT_FILE_SIZE: usize = 5 * 1024 * 1024;

/// Extract text content from an uploaded file based on its extension.
fn extract_text_from_file(file_name: &str, data: &[u8]) -> Result<String, String> {
    if data.len() > MAX_IMPORT_FILE_SIZE {
        return Err(format!(
            "file too large: {} bytes (max {} bytes)",
            data.len(),
            MAX_IMPORT_FILE_SIZE
        ));
    }

    let ext = file_name
        .rsplit('.')
        .next()
        .unwrap_or("")
        .to_lowercase();

    match ext.as_str() {
        "txt" | "md" | "markdown" => {
            String::from_utf8(data.to_vec())
                .map_err(|_| "file is not valid UTF-8 text".to_string())
        }
        _ => Err(format!(
            "unsupported file format: .{ext}. Supported: .txt, .md"
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_txt_file() {
        let content = "This is a story about a knight.";
        let result = extract_text_from_file("story.txt", content.as_bytes());
        assert_eq!(result.unwrap(), content);
    }

    #[test]
    fn extract_md_file() {
        let content = "# Chapter 1\n\nThe knight rode into battle.";
        let result = extract_text_from_file("notes.md", content.as_bytes());
        assert_eq!(result.unwrap(), content);
    }

    #[test]
    fn extract_markdown_extension() {
        let content = "Some text";
        let result = extract_text_from_file("doc.markdown", content.as_bytes());
        assert_eq!(result.unwrap(), content);
    }

    #[test]
    fn reject_unsupported_format() {
        let result = extract_text_from_file("image.png", b"binary data");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("unsupported file format"));
    }

    #[test]
    fn reject_too_large_file() {
        let data = vec![0u8; MAX_IMPORT_FILE_SIZE + 1];
        let result = extract_text_from_file("big.txt", &data);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("file too large"));
    }

    #[test]
    fn reject_invalid_utf8() {
        let data = vec![0xFF, 0xFE, 0xFD];
        let result = extract_text_from_file("bad.txt", &data);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("UTF-8"));
    }
}
