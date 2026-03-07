use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

use crate::domain::ai::models::Draft;
use crate::domain::timeline::models::{Scene, SceneConnection, SceneDetail, Track};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackResponse {
    pub id: Uuid,
    pub project_id: Uuid,
    pub position: f64,
    pub label: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<&Track> for TrackResponse {
    fn from(t: &Track) -> Self {
        Self {
            id: t.id,
            project_id: t.project_id,
            position: t.position,
            label: t.label.clone(),
            created_at: t.created_at,
            updated_at: t.updated_at,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SceneResponse {
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
    pub character_ids: Vec<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<&Scene> for SceneResponse {
    fn from(s: &Scene) -> Self {
        Self {
            id: s.id,
            track_id: s.track_id,
            project_id: s.project_id,
            start_position: s.start_position,
            duration: s.duration,
            status: s.status.to_string(),
            title: s.title.clone(),
            plot_summary: s.plot_summary.clone(),
            location: s.location.clone(),
            mood_tags: s.mood_tags.clone(),
            character_ids: s.character_ids.clone(),
            created_at: s.created_at,
            updated_at: s.updated_at,
        }
    }
}

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
pub struct SceneDetailResponse {
    #[serde(flatten)]
    pub scene: SceneResponse,
    pub latest_draft: Option<DraftResponse>,
}

impl From<&SceneDetail> for SceneDetailResponse {
    fn from(sd: &SceneDetail) -> Self {
        Self {
            scene: SceneResponse::from(&sd.scene),
            latest_draft: sd.latest_draft.as_ref().map(DraftResponse::from),
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionResponse {
    pub id: Uuid,
    pub project_id: Uuid,
    pub source_scene_id: Uuid,
    pub target_scene_id: Uuid,
    pub connection_type: String,
    pub created_at: DateTime<Utc>,
}

impl From<&SceneConnection> for ConnectionResponse {
    fn from(c: &SceneConnection) -> Self {
        Self {
            id: c.id,
            project_id: c.project_id,
            source_scene_id: c.source_scene_id,
            target_scene_id: c.target_scene_id,
            connection_type: c.connection_type.to_string(),
            created_at: c.created_at,
        }
    }
}
