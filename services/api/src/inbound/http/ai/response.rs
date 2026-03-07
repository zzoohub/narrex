use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

use crate::domain::ai::models::{Draft, DraftSummary};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DraftResponse {
    pub id: Uuid,
    pub scene_id: Uuid,
    pub version: i32,
    pub content: String,
    pub char_count: i32,
    pub source: String,
    pub edit_direction: Option<String>,
    pub model: Option<String>,
    pub provider: Option<String>,
    pub token_count_input: Option<i32>,
    pub token_count_output: Option<i32>,
    pub created_at: DateTime<Utc>,
}

impl From<&Draft> for DraftResponse {
    fn from(d: &Draft) -> Self {
        Self {
            id: d.id,
            scene_id: d.scene_id,
            version: d.version,
            content: d.content.clone(),
            char_count: d.char_count,
            source: d.source.to_string(),
            edit_direction: d.edit_direction.clone(),
            model: d.model.clone(),
            provider: d.provider.clone(),
            token_count_input: d.token_count_input,
            token_count_output: d.token_count_output,
            created_at: d.created_at,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DraftSummaryResponse {
    pub id: Uuid,
    pub version: i32,
    pub char_count: i32,
    pub source: String,
    pub edit_direction: Option<String>,
    pub created_at: DateTime<Utc>,
}

impl From<&DraftSummary> for DraftSummaryResponse {
    fn from(d: &DraftSummary) -> Self {
        Self {
            id: d.id,
            version: d.version,
            char_count: d.char_count,
            source: d.source.to_string(),
            edit_direction: d.edit_direction.clone(),
            created_at: d.created_at,
        }
    }
}
