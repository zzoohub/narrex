use serde::Deserialize;
use uuid::Uuid;

use crate::domain::character::models::{
    CreateCharacter, CreateRelationship, RelationshipDirection, RelationshipVisual,
    UpdateCharacter, UpdateRelationship,
};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCharacterRequest {
    pub name: String,
    pub personality: Option<String>,
    pub appearance: Option<String>,
    pub secrets: Option<String>,
    pub motivation: Option<String>,
    pub profile_image_url: Option<String>,
    pub graph_x: Option<f64>,
    pub graph_y: Option<f64>,
}

impl From<CreateCharacterRequest> for CreateCharacter {
    fn from(r: CreateCharacterRequest) -> Self {
        Self {
            name: r.name,
            personality: r.personality,
            appearance: r.appearance,
            secrets: r.secrets,
            motivation: r.motivation,
            profile_image_url: r.profile_image_url,
            graph_x: r.graph_x,
            graph_y: r.graph_y,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCharacterRequest {
    pub name: Option<String>,
    pub personality: Option<Option<String>>,
    pub appearance: Option<Option<String>>,
    pub secrets: Option<Option<String>>,
    pub motivation: Option<Option<String>>,
    pub profile_image_url: Option<Option<String>>,
    pub graph_x: Option<Option<f64>>,
    pub graph_y: Option<Option<f64>>,
}

impl From<UpdateCharacterRequest> for UpdateCharacter {
    fn from(r: UpdateCharacterRequest) -> Self {
        Self {
            name: r.name,
            personality: r.personality,
            appearance: r.appearance,
            secrets: r.secrets,
            motivation: r.motivation,
            profile_image_url: r.profile_image_url,
            graph_x: r.graph_x,
            graph_y: r.graph_y,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRelationshipRequest {
    pub character_a_id: Uuid,
    pub character_b_id: Uuid,
    pub label: String,
    pub visual_type: String,
    pub direction: String,
}

impl TryFrom<CreateRelationshipRequest> for CreateRelationship {
    type Error = String;

    fn try_from(r: CreateRelationshipRequest) -> Result<Self, Self::Error> {
        let visual_type: RelationshipVisual = r.visual_type.parse()?;
        let direction: RelationshipDirection = r.direction.parse()?;
        Ok(Self {
            character_a_id: r.character_a_id,
            character_b_id: r.character_b_id,
            label: r.label,
            visual_type,
            direction,
        })
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRelationshipRequest {
    pub label: Option<String>,
    pub visual_type: Option<String>,
    pub direction: Option<String>,
}

impl TryFrom<UpdateRelationshipRequest> for UpdateRelationship {
    type Error = String;

    fn try_from(r: UpdateRelationshipRequest) -> Result<Self, Self::Error> {
        let visual_type = r
            .visual_type
            .map(|v| v.parse::<RelationshipVisual>())
            .transpose()?;
        let direction = r
            .direction
            .map(|d| d.parse::<RelationshipDirection>())
            .transpose()?;
        Ok(Self {
            label: r.label,
            visual_type,
            direction,
        })
    }
}
