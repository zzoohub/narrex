use chrono::{DateTime, Utc};
use sqlx::FromRow;
use uuid::Uuid;

use crate::domain::character::models::{
    Character, CharacterRelationship, RelationshipDirection, RelationshipVisual,
};
use crate::domain::project::error::ProjectError;
use crate::domain::project::models::{
    PaginatedResult, PaginationParams, PovType, Project, ProjectSummary, SourceType, UpdateProject,
    Workspace,
};
use crate::domain::project::ports::ProjectRepository;
use crate::domain::timeline::models::{
    ConnectionType, Scene, SceneConnection, SceneStatus, Track,
};

use super::Postgres;

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

#[derive(FromRow)]
struct ProjectRow {
    id: Uuid,
    user_id: Uuid,
    title: String,
    genre: Option<String>,
    theme: Option<String>,
    era_location: Option<String>,
    pov: Option<String>,
    tone: Option<String>,
    source_type: Option<String>,
    source_input: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

impl ProjectRow {
    fn into_domain(self) -> Project {
        Project {
            id: self.id,
            user_id: self.user_id,
            title: self.title,
            genre: self.genre,
            theme: self.theme,
            era_location: self.era_location,
            pov: self.pov.and_then(|s| s.parse::<PovType>().ok()),
            tone: self.tone,
            source_type: self
                .source_type
                .and_then(|s| s.parse::<SourceType>().ok()),
            source_input: self.source_input,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

#[derive(FromRow)]
struct ProjectSummaryRow {
    id: Uuid,
    title: String,
    genre: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

impl ProjectSummaryRow {
    fn into_domain(self) -> ProjectSummary {
        ProjectSummary {
            id: self.id,
            title: self.title,
            genre: self.genre,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

#[derive(FromRow)]
struct TrackRow {
    id: Uuid,
    project_id: Uuid,
    position: f64,
    label: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

impl TrackRow {
    fn into_domain(self) -> Track {
        Track {
            id: self.id,
            project_id: self.project_id,
            position: self.position,
            label: self.label,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

#[derive(FromRow)]
struct SceneRow {
    id: Uuid,
    track_id: Uuid,
    project_id: Uuid,
    start_position: f64,
    duration: f64,
    status: String,
    title: String,
    plot_summary: Option<String>,
    location: Option<String>,
    mood_tags: Vec<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

impl SceneRow {
    fn into_domain(self, character_ids: Vec<Uuid>) -> Scene {
        Scene {
            id: self.id,
            track_id: self.track_id,
            project_id: self.project_id,
            start_position: self.start_position,
            duration: self.duration,
            status: self
                .status
                .parse::<SceneStatus>()
                .unwrap_or(SceneStatus::Empty),
            title: self.title,
            plot_summary: self.plot_summary,
            location: self.location,
            mood_tags: self.mood_tags,
            character_ids,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

#[derive(FromRow)]
struct CharacterRow {
    id: Uuid,
    project_id: Uuid,
    name: String,
    personality: Option<String>,
    appearance: Option<String>,
    secrets: Option<String>,
    motivation: Option<String>,
    profile_image_url: Option<String>,
    graph_x: Option<f64>,
    graph_y: Option<f64>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

impl CharacterRow {
    fn into_domain(self) -> Character {
        Character {
            id: self.id,
            project_id: self.project_id,
            name: self.name,
            personality: self.personality,
            appearance: self.appearance,
            secrets: self.secrets,
            motivation: self.motivation,
            profile_image_url: self.profile_image_url,
            graph_x: self.graph_x,
            graph_y: self.graph_y,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

#[derive(FromRow)]
struct RelationshipRow {
    id: Uuid,
    project_id: Uuid,
    character_a_id: Uuid,
    character_b_id: Uuid,
    label: String,
    visual_type: String,
    direction: String,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

impl RelationshipRow {
    fn into_domain(self) -> CharacterRelationship {
        CharacterRelationship {
            id: self.id,
            project_id: self.project_id,
            character_a_id: self.character_a_id,
            character_b_id: self.character_b_id,
            label: self.label,
            visual_type: self
                .visual_type
                .parse::<RelationshipVisual>()
                .unwrap_or(RelationshipVisual::Solid),
            direction: self
                .direction
                .parse::<RelationshipDirection>()
                .unwrap_or(RelationshipDirection::Bidirectional),
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

#[derive(FromRow)]
struct ConnectionRow {
    id: Uuid,
    project_id: Uuid,
    source_scene_id: Uuid,
    target_scene_id: Uuid,
    connection_type: String,
    created_at: DateTime<Utc>,
}

impl ConnectionRow {
    fn into_domain(self) -> SceneConnection {
        SceneConnection {
            id: self.id,
            project_id: self.project_id,
            source_scene_id: self.source_scene_id,
            target_scene_id: self.target_scene_id,
            connection_type: self
                .connection_type
                .parse::<ConnectionType>()
                .unwrap_or(ConnectionType::Branch),
            created_at: self.created_at,
        }
    }
}

#[derive(FromRow)]
struct SceneCharacterJoin {
    scene_id: Uuid,
    character_id: Uuid,
}

// ---------------------------------------------------------------------------
// Cursor helpers
// ---------------------------------------------------------------------------

/// Composite cursor: `{updated_at_rfc3339}|{id}`
fn encode_cursor(updated_at: &DateTime<Utc>, id: &Uuid) -> String {
    format!("{}|{}", updated_at.to_rfc3339(), id)
}

fn decode_cursor(cursor: &str) -> Option<(DateTime<Utc>, Uuid)> {
    let parts: Vec<&str> = cursor.splitn(2, '|').collect();
    if parts.len() != 2 {
        return None;
    }
    let updated_at = parts[0].parse::<DateTime<Utc>>().ok()?;
    let id = parts[1].parse::<Uuid>().ok()?;
    Some((updated_at, id))
}

// ---------------------------------------------------------------------------
// ProjectRepository impl
// ---------------------------------------------------------------------------

#[async_trait::async_trait]
impl ProjectRepository for Postgres {
    async fn create(&self, project: &Project) -> Result<Project, ProjectError> {
        let pov_str = project.pov.as_ref().map(|p| p.to_string());
        let source_type_str = project.source_type.as_ref().map(|s| s.to_string());

        let row = sqlx::query_as::<_, ProjectRow>(
            "INSERT INTO project (id, user_id, title, genre, theme, era_location, pov, tone, source_type, source_input) \
             VALUES ($1, $2, $3, $4, $5, $6, $7::pov_type, $8, $9, $10) \
             RETURNING id, user_id, title, genre, theme, era_location, pov::text, tone, source_type, source_input, created_at, updated_at",
        )
        .bind(project.id)
        .bind(project.user_id)
        .bind(&project.title)
        .bind(&project.genre)
        .bind(&project.theme)
        .bind(&project.era_location)
        .bind(&pov_str)
        .bind(&project.tone)
        .bind(&source_type_str)
        .bind(&project.source_input)
        .fetch_one(self.pool())
        .await
        .map_err(|e| ProjectError::Unknown(e.into()))?;

        Ok(row.into_domain())
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Option<Project>, ProjectError> {
        let row = sqlx::query_as::<_, ProjectRow>(
            "SELECT id, user_id, title, genre, theme, era_location, pov::text, tone, source_type, source_input, created_at, updated_at \
             FROM project \
             WHERE id = $1 AND deleted_at IS NULL",
        )
        .bind(id)
        .fetch_optional(self.pool())
        .await
        .map_err(|e| ProjectError::Unknown(e.into()))?;

        Ok(row.map(ProjectRow::into_domain))
    }

    async fn find_by_user_id(
        &self,
        user_id: Uuid,
        params: &PaginationParams,
    ) -> Result<PaginatedResult<ProjectSummary>, ProjectError> {
        let limit = params.limit.clamp(1, 100);
        let fetch_limit = limit + 1; // fetch one extra to determine has_more

        let rows = if let Some(ref cursor) = params.cursor {
            let (cursor_updated_at, cursor_id) =
                decode_cursor(cursor).ok_or_else(|| {
                    ProjectError::Unknown(anyhow::anyhow!("invalid cursor"))
                })?;

            sqlx::query_as::<_, ProjectSummaryRow>(
                "SELECT id, title, genre, created_at, updated_at \
                 FROM project \
                 WHERE user_id = $1 AND deleted_at IS NULL \
                   AND (updated_at, id) < ($2, $3) \
                 ORDER BY updated_at DESC, id DESC \
                 LIMIT $4",
            )
            .bind(user_id)
            .bind(cursor_updated_at)
            .bind(cursor_id)
            .bind(fetch_limit)
            .fetch_all(self.pool())
            .await
            .map_err(|e| ProjectError::Unknown(e.into()))?
        } else {
            sqlx::query_as::<_, ProjectSummaryRow>(
                "SELECT id, title, genre, created_at, updated_at \
                 FROM project \
                 WHERE user_id = $1 AND deleted_at IS NULL \
                 ORDER BY updated_at DESC, id DESC \
                 LIMIT $2",
            )
            .bind(user_id)
            .bind(fetch_limit)
            .fetch_all(self.pool())
            .await
            .map_err(|e| ProjectError::Unknown(e.into()))?
        };

        let has_more = rows.len() as i64 > limit;
        let data: Vec<ProjectSummary> = rows
            .into_iter()
            .take(limit as usize)
            .map(ProjectSummaryRow::into_domain)
            .collect();

        let next_cursor = if has_more {
            data.last()
                .map(|last| encode_cursor(&last.updated_at, &last.id))
        } else {
            None
        };

        Ok(PaginatedResult {
            data,
            next_cursor,
            has_more,
        })
    }

    async fn update(&self, id: Uuid, update: &UpdateProject) -> Result<Project, ProjectError> {
        let row = sqlx::query_as::<_, ProjectRow>(
            "UPDATE project SET \
                title = COALESCE($2, title), \
                genre = CASE WHEN $3 THEN $4 ELSE genre END, \
                theme = CASE WHEN $5 THEN $6 ELSE theme END, \
                era_location = CASE WHEN $7 THEN $8 ELSE era_location END, \
                pov = CASE WHEN $9 THEN $10::pov_type ELSE pov END, \
                tone = CASE WHEN $11 THEN $12 ELSE tone END \
             WHERE id = $1 AND deleted_at IS NULL \
             RETURNING id, user_id, title, genre, theme, era_location, pov::text, tone, source_type, source_input, created_at, updated_at",
        )
        .bind(id)
        // title
        .bind(update.title.as_deref())
        // genre: $3 = should_update, $4 = new value
        .bind(update.genre.is_some())
        .bind(update.genre.as_ref().and_then(|v| v.as_deref()))
        // theme
        .bind(update.theme.is_some())
        .bind(update.theme.as_ref().and_then(|v| v.as_deref()))
        // era_location
        .bind(update.era_location.is_some())
        .bind(update.era_location.as_ref().and_then(|v| v.as_deref()))
        // pov
        .bind(update.pov.is_some())
        .bind(update.pov.as_ref().and_then(|v| v.as_ref().map(|p| p.to_string())))
        // tone
        .bind(update.tone.is_some())
        .bind(update.tone.as_ref().and_then(|v| v.as_deref()))
        .fetch_one(self.pool())
        .await
        .map_err(|e| ProjectError::Unknown(e.into()))?;

        Ok(row.into_domain())
    }

    async fn soft_delete(&self, id: Uuid) -> Result<(), ProjectError> {
        sqlx::query("UPDATE project SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL")
            .bind(id)
            .execute(self.pool())
            .await
            .map_err(|e| ProjectError::Unknown(e.into()))?;

        Ok(())
    }

    async fn get_workspace(&self, id: Uuid) -> Result<Option<Workspace>, ProjectError> {
        // Load project first.
        let project_row = sqlx::query_as::<_, ProjectRow>(
            "SELECT id, user_id, title, genre, theme, era_location, pov::text, tone, source_type, source_input, created_at, updated_at \
             FROM project \
             WHERE id = $1 AND deleted_at IS NULL",
        )
        .bind(id)
        .fetch_optional(self.pool())
        .await
        .map_err(|e| ProjectError::Unknown(e.into()))?;

        let project_row = match project_row {
            Some(r) => r,
            None => return Ok(None),
        };
        let project = project_row.into_domain();

        // Parallel queries for workspace data.
        let (tracks_result, scenes_result, characters_result, relationships_result, connections_result) = tokio::join!(
            sqlx::query_as::<_, TrackRow>(
                "SELECT id, project_id, position, label, created_at, updated_at \
                 FROM track WHERE project_id = $1 ORDER BY position"
            )
            .bind(id)
            .fetch_all(self.pool()),

            sqlx::query_as::<_, SceneRow>(
                "SELECT id, track_id, project_id, start_position, duration, status::text, title, plot_summary, location, mood_tags, created_at, updated_at \
                 FROM scene WHERE project_id = $1 ORDER BY start_position"
            )
            .bind(id)
            .fetch_all(self.pool()),

            sqlx::query_as::<_, CharacterRow>(
                "SELECT id, project_id, name, personality, appearance, secrets, motivation, profile_image_url, graph_x, graph_y, created_at, updated_at \
                 FROM character WHERE project_id = $1"
            )
            .bind(id)
            .fetch_all(self.pool()),

            sqlx::query_as::<_, RelationshipRow>(
                "SELECT id, project_id, character_a_id, character_b_id, label, visual_type::text, direction::text, created_at, updated_at \
                 FROM character_relationship WHERE project_id = $1"
            )
            .bind(id)
            .fetch_all(self.pool()),

            sqlx::query_as::<_, ConnectionRow>(
                "SELECT id, project_id, source_scene_id, target_scene_id, connection_type::text, created_at \
                 FROM scene_connection WHERE project_id = $1"
            )
            .bind(id)
            .fetch_all(self.pool()),
        );

        let tracks: Vec<Track> = tracks_result
            .map_err(|e| ProjectError::Unknown(e.into()))?
            .into_iter()
            .map(TrackRow::into_domain)
            .collect();

        let scene_rows: Vec<SceneRow> = scenes_result
            .map_err(|e| ProjectError::Unknown(e.into()))?;

        // Load scene_character assignments for all scenes.
        let scene_ids: Vec<Uuid> = scene_rows.iter().map(|s| s.id).collect();
        let scene_char_rows = if scene_ids.is_empty() {
            Vec::new()
        } else {
            sqlx::query_as::<_, SceneCharacterJoin>(
                "SELECT scene_id, character_id FROM scene_character WHERE scene_id = ANY($1)",
            )
            .bind(&scene_ids)
            .fetch_all(self.pool())
            .await
            .map_err(|e| ProjectError::Unknown(e.into()))?
        };

        // Group character_ids by scene_id.
        let mut scene_chars: std::collections::HashMap<Uuid, Vec<Uuid>> =
            std::collections::HashMap::new();
        for sc in scene_char_rows {
            scene_chars
                .entry(sc.scene_id)
                .or_default()
                .push(sc.character_id);
        }

        let scenes: Vec<Scene> = scene_rows
            .into_iter()
            .map(|row| {
                let char_ids = scene_chars.remove(&row.id).unwrap_or_default();
                row.into_domain(char_ids)
            })
            .collect();

        let characters: Vec<Character> = characters_result
            .map_err(|e| ProjectError::Unknown(e.into()))?
            .into_iter()
            .map(CharacterRow::into_domain)
            .collect();

        let relationships: Vec<CharacterRelationship> = relationships_result
            .map_err(|e| ProjectError::Unknown(e.into()))?
            .into_iter()
            .map(RelationshipRow::into_domain)
            .collect();

        let connections: Vec<SceneConnection> = connections_result
            .map_err(|e| ProjectError::Unknown(e.into()))?
            .into_iter()
            .map(ConnectionRow::into_domain)
            .collect();

        Ok(Some(Workspace {
            project,
            tracks,
            scenes,
            characters,
            relationships,
            connections,
        }))
    }
}
