use serde::Deserialize;
use uuid::Uuid;

use crate::domain::timeline::models::{
    ConnectionType, CreateConnection, CreateScene, CreateTrack, SceneStatus, UpdateScene,
    UpdateTrack,
};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTrackRequest {
    pub label: Option<String>,
    pub position: Option<f64>,
}

impl From<CreateTrackRequest> for CreateTrack {
    fn from(r: CreateTrackRequest) -> Self {
        Self {
            label: r.label,
            position: r.position,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTrackRequest {
    pub label: Option<Option<String>>,
    pub position: Option<f64>,
}

impl From<UpdateTrackRequest> for UpdateTrack {
    fn from(r: UpdateTrackRequest) -> Self {
        Self {
            label: r.label,
            position: r.position,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSceneRequest {
    pub track_id: Uuid,
    pub title: String,
    pub start_position: Option<f64>,
    pub duration: Option<f64>,
    pub plot_summary: Option<String>,
    pub location: Option<String>,
    pub mood_tags: Option<Vec<String>>,
    pub character_ids: Option<Vec<Uuid>>,
}

impl From<CreateSceneRequest> for CreateScene {
    fn from(r: CreateSceneRequest) -> Self {
        Self {
            track_id: r.track_id,
            title: r.title,
            start_position: r.start_position,
            duration: r.duration,
            plot_summary: r.plot_summary,
            location: r.location,
            mood_tags: r.mood_tags.unwrap_or_default(),
            character_ids: r.character_ids.unwrap_or_default(),
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSceneRequest {
    pub track_id: Option<Uuid>,
    pub title: Option<String>,
    pub start_position: Option<f64>,
    pub duration: Option<f64>,
    pub plot_summary: Option<Option<String>>,
    pub location: Option<Option<String>>,
    pub mood_tags: Option<Vec<String>>,
    pub content: Option<Option<String>>,
    pub character_ids: Option<Vec<Uuid>>,
    pub status: Option<String>,
}

impl From<UpdateSceneRequest> for UpdateScene {
    fn from(r: UpdateSceneRequest) -> Self {
        Self {
            track_id: r.track_id,
            title: r.title,
            start_position: r.start_position,
            duration: r.duration,
            plot_summary: r.plot_summary,
            location: r.location,
            mood_tags: r.mood_tags,
            content: r.content,
            character_ids: r.character_ids,
            status: r.status.and_then(|s| s.parse::<SceneStatus>().ok()),
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateConnectionRequest {
    pub source_scene_id: Uuid,
    pub target_scene_id: Uuid,
    pub connection_type: String,
}

impl TryFrom<CreateConnectionRequest> for CreateConnection {
    type Error = String;

    fn try_from(r: CreateConnectionRequest) -> Result<Self, Self::Error> {
        let connection_type: ConnectionType = r.connection_type.parse()?;
        Ok(Self {
            source_scene_id: r.source_scene_id,
            target_scene_id: r.target_scene_id,
            connection_type,
        })
    }
}
