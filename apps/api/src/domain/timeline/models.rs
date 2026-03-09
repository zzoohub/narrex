use std::fmt;
use std::str::FromStr;

use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::domain::ai::models::Draft;

// ---------------------------------------------------------------------------
// SceneStatus
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SceneStatus {
    Empty,
    AiDraft,
    Edited,
    NeedsRevision,
}

impl fmt::Display for SceneStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "empty"),
            Self::AiDraft => write!(f, "ai_draft"),
            Self::Edited => write!(f, "edited"),
            Self::NeedsRevision => write!(f, "needs_revision"),
        }
    }
}

impl FromStr for SceneStatus {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "empty" => Ok(Self::Empty),
            "ai_draft" => Ok(Self::AiDraft),
            "edited" => Ok(Self::Edited),
            "needs_revision" => Ok(Self::NeedsRevision),
            other => Err(format!("unknown scene status: {other}")),
        }
    }
}

// ---------------------------------------------------------------------------
// ConnectionType
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ConnectionType {
    Branch,
    Merge,
}

impl fmt::Display for ConnectionType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Branch => write!(f, "branch"),
            Self::Merge => write!(f, "merge"),
        }
    }
}

impl FromStr for ConnectionType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "branch" => Ok(Self::Branch),
            "merge" => Ok(Self::Merge),
            other => Err(format!("unknown connection type: {other}")),
        }
    }
}

// ---------------------------------------------------------------------------
// Track
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct Track {
    pub id: Uuid,
    pub project_id: Uuid,
    pub position: f64,
    pub label: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct CreateTrack {
    pub label: Option<String>,
    pub position: Option<f64>,
}

#[derive(Debug, Clone, Default)]
pub struct UpdateTrack {
    pub label: Option<Option<String>>,
    pub position: Option<f64>,
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct Scene {
    pub id: Uuid,
    pub track_id: Uuid,
    pub project_id: Uuid,
    pub start_position: f64,
    pub duration: f64,
    pub status: SceneStatus,
    pub title: String,
    pub plot_summary: Option<String>,
    pub location: Option<String>,
    pub mood_tags: Vec<String>,
    pub content: Option<String>,
    pub character_ids: Vec<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct SceneDetail {
    pub scene: Scene,
    pub latest_draft: Option<Draft>,
}

#[derive(Debug, Clone)]
pub struct CreateScene {
    pub track_id: Uuid,
    pub title: String,
    pub start_position: Option<f64>,
    pub duration: Option<f64>,
    pub plot_summary: Option<String>,
    pub location: Option<String>,
    pub mood_tags: Vec<String>,
    pub character_ids: Vec<Uuid>,
}

#[derive(Debug, Clone, Default)]
pub struct UpdateScene {
    pub track_id: Option<Uuid>,
    pub title: Option<String>,
    pub start_position: Option<f64>,
    pub duration: Option<f64>,
    pub plot_summary: Option<Option<String>>,
    pub location: Option<Option<String>>,
    pub mood_tags: Option<Vec<String>>,
    pub content: Option<Option<String>>,
    pub character_ids: Option<Vec<Uuid>>,
}

// ---------------------------------------------------------------------------
// SceneConnection
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct SceneConnection {
    pub id: Uuid,
    pub project_id: Uuid,
    pub source_scene_id: Uuid,
    pub target_scene_id: Uuid,
    pub connection_type: ConnectionType,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct CreateConnection {
    pub source_scene_id: Uuid,
    pub target_scene_id: Uuid,
    pub connection_type: ConnectionType,
}

#[cfg(test)]
mod tests {
    use super::*;

    // -- SceneStatus Display/FromStr --

    #[test]
    fn scene_status_display() {
        assert_eq!(SceneStatus::Empty.to_string(), "empty");
        assert_eq!(SceneStatus::AiDraft.to_string(), "ai_draft");
        assert_eq!(SceneStatus::Edited.to_string(), "edited");
        assert_eq!(SceneStatus::NeedsRevision.to_string(), "needs_revision");
    }

    #[test]
    fn scene_status_from_str_valid() {
        assert_eq!("empty".parse::<SceneStatus>().unwrap(), SceneStatus::Empty);
        assert_eq!("ai_draft".parse::<SceneStatus>().unwrap(), SceneStatus::AiDraft);
        assert_eq!("edited".parse::<SceneStatus>().unwrap(), SceneStatus::Edited);
        assert_eq!("needs_revision".parse::<SceneStatus>().unwrap(), SceneStatus::NeedsRevision);
    }

    #[test]
    fn scene_status_from_str_invalid() {
        let result = "invalid".parse::<SceneStatus>();
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("unknown scene status"));
    }

    #[test]
    fn scene_status_roundtrip() {
        for s in [SceneStatus::Empty, SceneStatus::AiDraft, SceneStatus::Edited, SceneStatus::NeedsRevision] {
            let str_val = s.to_string();
            let parsed: SceneStatus = str_val.parse().unwrap();
            assert_eq!(parsed, s);
        }
    }

    // -- ConnectionType Display/FromStr --

    #[test]
    fn connection_type_display() {
        assert_eq!(ConnectionType::Branch.to_string(), "branch");
        assert_eq!(ConnectionType::Merge.to_string(), "merge");
    }

    #[test]
    fn connection_type_from_str_valid() {
        assert_eq!("branch".parse::<ConnectionType>().unwrap(), ConnectionType::Branch);
        assert_eq!("merge".parse::<ConnectionType>().unwrap(), ConnectionType::Merge);
    }

    #[test]
    fn connection_type_from_str_invalid() {
        let result = "sequential".parse::<ConnectionType>();
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("unknown connection type"));
    }

    #[test]
    fn connection_type_roundtrip() {
        for ct in [ConnectionType::Branch, ConnectionType::Merge] {
            let s = ct.to_string();
            let parsed: ConnectionType = s.parse().unwrap();
            assert_eq!(parsed, ct);
        }
    }

    // -- UpdateTrack Default --

    #[test]
    fn update_track_default() {
        let ut = UpdateTrack::default();
        assert!(ut.label.is_none());
        assert!(ut.position.is_none());
    }

    // -- UpdateScene Default --

    #[test]
    fn update_scene_default() {
        let us = UpdateScene::default();
        assert!(us.track_id.is_none());
        assert!(us.title.is_none());
        assert!(us.start_position.is_none());
        assert!(us.duration.is_none());
        assert!(us.plot_summary.is_none());
        assert!(us.location.is_none());
        assert!(us.mood_tags.is_none());
        assert!(us.content.is_none());
        assert!(us.character_ids.is_none());
    }
}
