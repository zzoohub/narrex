use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

use crate::domain::project::models::{Project, ProjectSummary, Workspace};
use crate::inbound::http::character::response::{CharacterResponse, RelationshipResponse};
use crate::inbound::http::timeline::response::{ConnectionResponse, SceneResponse, TrackResponse};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectResponse {
    pub id: Uuid,
    pub title: String,
    pub genre: Option<String>,
    pub theme: Option<String>,
    pub era_location: Option<String>,
    pub pov: Option<String>,
    pub tone: Option<String>,
    pub source_type: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<&Project> for ProjectResponse {
    fn from(p: &Project) -> Self {
        Self {
            id: p.id,
            title: p.title.clone(),
            genre: p.genre.clone(),
            theme: p.theme.clone(),
            era_location: p.era_location.clone(),
            pov: p.pov.as_ref().map(|v| v.to_string()),
            tone: p.tone.clone(),
            source_type: p.source_type.as_ref().map(|v| v.to_string()),
            created_at: p.created_at,
            updated_at: p.updated_at,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSummaryResponse {
    pub id: Uuid,
    pub title: String,
    pub genre: Option<String>,
    pub source_type: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<&ProjectSummary> for ProjectSummaryResponse {
    fn from(p: &ProjectSummary) -> Self {
        Self {
            id: p.id,
            title: p.title.clone(),
            genre: p.genre.clone(),
            source_type: p.source_type.as_ref().map(|v| v.to_string()),
            created_at: p.created_at,
            updated_at: p.updated_at,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceResponse {
    pub project: ProjectResponse,
    pub tracks: Vec<TrackResponse>,
    pub scenes: Vec<SceneResponse>,
    pub characters: Vec<CharacterResponse>,
    pub relationships: Vec<RelationshipResponse>,
    pub connections: Vec<ConnectionResponse>,
}

impl From<&Workspace> for WorkspaceResponse {
    fn from(w: &Workspace) -> Self {
        Self {
            project: ProjectResponse::from(&w.project),
            tracks: w.tracks.iter().map(TrackResponse::from).collect(),
            scenes: w.scenes.iter().map(SceneResponse::from).collect(),
            characters: w.characters.iter().map(CharacterResponse::from).collect(),
            relationships: w
                .relationships
                .iter()
                .map(RelationshipResponse::from)
                .collect(),
            connections: w.connections.iter().map(ConnectionResponse::from).collect(),
        }
    }
}
