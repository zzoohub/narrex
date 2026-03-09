use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

use crate::domain::ai::models::{CostSummary, Draft, DraftSummary, QuotaInfo, SceneSummary};

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

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SceneSummaryResponse {
    pub scene_id: Uuid,
    pub draft_version: i32,
    pub summary_text: String,
    pub model: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<&SceneSummary> for SceneSummaryResponse {
    fn from(s: &SceneSummary) -> Self {
        Self {
            scene_id: s.scene_id,
            draft_version: s.draft_version,
            summary_text: s.summary_text.clone(),
            model: s.model.clone(),
            created_at: s.created_at,
            updated_at: s.updated_at,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CostSummaryResponse {
    pub total_generations: i64,
    pub total_tokens_input: i64,
    pub total_tokens_output: i64,
    pub total_cost_usd: f64,
}

impl From<&CostSummary> for CostSummaryResponse {
    fn from(c: &CostSummary) -> Self {
        Self {
            total_generations: c.total_generations,
            total_tokens_input: c.total_tokens_input,
            total_tokens_output: c.total_tokens_output,
            total_cost_usd: c.total_cost_usd,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuotaInfoResponse {
    pub used: i64,
    pub limit: i64,
    pub remaining: i64,
    pub warning: bool,
    pub exceeded: bool,
    pub resets_at: DateTime<Utc>,
}

impl From<&QuotaInfo> for QuotaInfoResponse {
    fn from(q: &QuotaInfo) -> Self {
        Self {
            used: q.used,
            limit: q.limit,
            remaining: q.remaining,
            warning: q.warning,
            exceeded: q.exceeded,
            resets_at: q.resets_at,
        }
    }
}
