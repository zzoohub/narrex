use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

use crate::domain::character::models::{Character, CharacterRelationship};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CharacterResponse {
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

impl From<&Character> for CharacterResponse {
    fn from(c: &Character) -> Self {
        Self {
            id: c.id,
            project_id: c.project_id,
            name: c.name.clone(),
            personality: c.personality.clone(),
            appearance: c.appearance.clone(),
            secrets: c.secrets.clone(),
            motivation: c.motivation.clone(),
            profile_image_url: c.profile_image_url.clone(),
            graph_x: c.graph_x,
            graph_y: c.graph_y,
            created_at: c.created_at,
            updated_at: c.updated_at,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RelationshipResponse {
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

impl From<&CharacterRelationship> for RelationshipResponse {
    fn from(r: &CharacterRelationship) -> Self {
        Self {
            id: r.id,
            project_id: r.project_id,
            character_a_id: r.character_a_id,
            character_b_id: r.character_b_id,
            label: r.label.clone(),
            visual_type: r.visual_type.to_string(),
            direction: r.direction.to_string(),
            created_at: r.created_at,
            updated_at: r.updated_at,
        }
    }
}
