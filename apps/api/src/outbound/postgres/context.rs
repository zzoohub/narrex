use chrono::{DateTime, Utc};
use sqlx::FromRow;
use uuid::Uuid;

use crate::domain::ai::error::AiError;
use crate::domain::ai::models::{GenerationContext, SceneSummary};
use crate::domain::ai::ports::ContextAssemblyRepository;
use crate::domain::character::models::{
    Character, CharacterRelationship, RelationshipDirection, RelationshipVisual,
};
use crate::domain::project::models::{PovType, Project, SourceType};
use crate::domain::timeline::models::{Scene, SceneStatus};

use super::Postgres;

// ---------------------------------------------------------------------------
// Row types for context assembly
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
struct SceneWithCharsRow {
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
    character_ids: Option<Vec<Uuid>>,
}

impl SceneWithCharsRow {
    fn into_domain(self) -> Scene {
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
            content: None,
            character_ids: self.character_ids.unwrap_or_default(),
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

#[derive(FromRow)]
struct SimpleSceneRow {
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

impl SimpleSceneRow {
    fn into_domain(self) -> Scene {
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
            content: None,
            character_ids: Vec::new(),
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
struct SceneSummaryRow {
    scene_id: Uuid,
    draft_version: i32,
    summary_text: String,
    model: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

impl SceneSummaryRow {
    fn into_domain(self) -> SceneSummary {
        SceneSummary {
            scene_id: self.scene_id,
            draft_version: self.draft_version,
            summary_text: self.summary_text,
            model: self.model,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

// ---------------------------------------------------------------------------
// ContextAssemblyRepository impl
// ---------------------------------------------------------------------------

#[async_trait::async_trait]
impl ContextAssemblyRepository for Postgres {
    async fn assemble_context(
        &self,
        project_id: Uuid,
        scene_id: Uuid,
    ) -> Result<GenerationContext, AiError> {
        // 1. Global config (project).
        let project_row = sqlx::query_as::<_, ProjectRow>(
            "SELECT id, user_id, title, genre, theme, era_location, pov::text, tone, source_type, source_input, created_at, updated_at \
             FROM project WHERE id = $1 AND deleted_at IS NULL",
        )
        .bind(project_id)
        .fetch_optional(self.pool())
        .await
        .map_err(|e| AiError::Unknown(e.into()))?
        .ok_or(AiError::ProjectNotFound)?;

        let project = project_row.into_domain();

        // 2. Current scene + involved character IDs.
        let scene_row = sqlx::query_as::<_, SceneWithCharsRow>(
            "SELECT s.id, s.track_id, s.project_id, s.start_position, s.duration, s.status::text, \
                    s.title, s.plot_summary, s.location, s.mood_tags, s.created_at, s.updated_at, \
                    array_agg(sc.character_id) FILTER (WHERE sc.character_id IS NOT NULL) AS character_ids \
             FROM scene s \
             LEFT JOIN scene_character sc ON sc.scene_id = s.id \
             WHERE s.id = $1 \
             GROUP BY s.id",
        )
        .bind(scene_id)
        .fetch_optional(self.pool())
        .await
        .map_err(|e| AiError::Unknown(e.into()))?
        .ok_or(AiError::SceneNotFound)?;

        let scene = scene_row.into_domain();
        let character_ids = scene.character_ids.clone();

        // 3. Character cards for involved characters.
        let characters = if character_ids.is_empty() {
            Vec::new()
        } else {
            sqlx::query_as::<_, CharacterRow>(
                "SELECT id, project_id, name, personality, appearance, secrets, motivation, \
                        profile_image_url, graph_x, graph_y, created_at, updated_at \
                 FROM character WHERE id = ANY($1)",
            )
            .bind(&character_ids)
            .fetch_all(self.pool())
            .await
            .map_err(|e| AiError::Unknown(e.into()))?
            .into_iter()
            .map(CharacterRow::into_domain)
            .collect()
        };

        // 4. Relationships for involved characters.
        let relationships = if character_ids.is_empty() {
            Vec::new()
        } else {
            sqlx::query_as::<_, RelationshipRow>(
                "SELECT id, project_id, character_a_id, character_b_id, label, visual_type::text, direction::text, created_at, updated_at \
                 FROM character_relationship \
                 WHERE project_id = $1 \
                   AND (character_a_id = ANY($2) OR character_b_id = ANY($2))",
            )
            .bind(project_id)
            .bind(&character_ids)
            .fetch_all(self.pool())
            .await
            .map_err(|e| AiError::Unknown(e.into()))?
            .into_iter()
            .map(RelationshipRow::into_domain)
            .collect()
        };

        // 5. Preceding scene summaries (ordered by position).
        let preceding_summaries = sqlx::query_as::<_, SceneSummaryRow>(
            "SELECT ss.scene_id, ss.draft_version, ss.summary_text, ss.model, ss.created_at, ss.updated_at \
             FROM scene_summary ss \
             JOIN scene s ON s.id = ss.scene_id \
             WHERE s.project_id = $1 AND s.start_position < $2 \
             ORDER BY s.start_position",
        )
        .bind(project_id)
        .bind(scene.start_position)
        .fetch_all(self.pool())
        .await
        .map_err(|e| AiError::Unknown(e.into()))?
        .into_iter()
        .map(SceneSummaryRow::into_domain)
        .collect();

        // 6. Simultaneous scenes (overlapping ranges on other tracks).
        let simultaneous_scenes = sqlx::query_as::<_, SimpleSceneRow>(
            "SELECT id, track_id, project_id, start_position, duration, status::text, title, plot_summary, location, mood_tags, created_at, updated_at \
             FROM scene \
             WHERE project_id = $1 \
               AND track_id != $2 \
               AND start_position < ($3 + $4) \
               AND (start_position + duration) > $3",
        )
        .bind(project_id)
        .bind(scene.track_id)
        .bind(scene.start_position)
        .bind(scene.duration)
        .fetch_all(self.pool())
        .await
        .map_err(|e| AiError::Unknown(e.into()))?
        .into_iter()
        .map(SimpleSceneRow::into_domain)
        .collect();

        // 7. Next scene (by position).
        let next_scene = sqlx::query_as::<_, SimpleSceneRow>(
            "SELECT id, track_id, project_id, start_position, duration, status::text, title, plot_summary, location, mood_tags, created_at, updated_at \
             FROM scene \
             WHERE project_id = $1 AND start_position > $2 \
             ORDER BY start_position LIMIT 1",
        )
        .bind(project_id)
        .bind(scene.start_position)
        .fetch_optional(self.pool())
        .await
        .map_err(|e| AiError::Unknown(e.into()))?
        .map(SimpleSceneRow::into_domain);

        Ok(GenerationContext {
            project,
            scene,
            characters,
            relationships,
            preceding_summaries,
            simultaneous_scenes,
            next_scene,
        })
    }
}
