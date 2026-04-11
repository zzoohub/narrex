use chrono::{DateTime, Utc};
use sqlx::FromRow;
use uuid::Uuid;

use crate::domain::character::models::{
    Character, CharacterRelationship, RelationshipDirection, RelationshipVisual,
};
use crate::domain::project::models::{PovType, Project, SourceType};
use crate::domain::timeline::models::{Scene, SceneStatus};

// ---------------------------------------------------------------------------
// Shared row types for Postgres adapters
// ---------------------------------------------------------------------------

#[derive(FromRow)]
pub(super) struct ProjectRow {
    pub id: Uuid,
    pub user_id: Uuid,
    pub title: String,
    pub genre: Option<String>,
    pub theme: Option<String>,
    pub era_location: Option<String>,
    pub pov: Option<String>,
    pub tone: Option<String>,
    pub source_type: Option<String>,
    pub source_input: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl ProjectRow {
    pub(super) fn into_domain(self) -> Project {
        Project {
            id: self.id,
            user_id: self.user_id,
            title: self.title,
            genre: self.genre,
            theme: self.theme,
            era_location: self.era_location,
            pov: self.pov.and_then(|s| s.parse::<PovType>().ok()),
            tone: self.tone,
            source_type: self.source_type.and_then(|s| s.parse::<SourceType>().ok()),
            source_input: self.source_input,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

#[derive(FromRow)]
pub(super) struct CharacterRow {
    pub id: Uuid,
    pub project_id: Uuid,
    pub name: String,
    pub personality: Option<String>,
    pub appearance: Option<String>,
    pub secrets: Option<String>,
    pub motivation: Option<String>,
    pub profile_image_url: Option<String>,
    pub graph_x: Option<f64>,
    pub graph_y: Option<f64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl CharacterRow {
    pub(super) fn into_domain(self) -> Character {
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
pub(super) struct RelationshipRow {
    pub id: Uuid,
    pub project_id: Uuid,
    pub character_a_id: Uuid,
    pub character_b_id: Uuid,
    pub label: String,
    pub visual_type: String,
    pub direction: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl RelationshipRow {
    pub(super) fn into_domain(self) -> CharacterRelationship {
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
pub(super) struct SceneRow {
    pub id: Uuid,
    pub track_id: Uuid,
    pub project_id: Uuid,
    pub start_position: f64,
    pub duration: f64,
    pub status: String,
    pub title: String,
    pub plot_summary: Option<String>,
    pub location: Option<String>,
    pub mood_tags: Vec<String>,
    pub content: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl SceneRow {
    pub(super) fn into_domain(self, character_ids: Vec<Uuid>) -> Scene {
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
            content: self.content,
            character_ids,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}
