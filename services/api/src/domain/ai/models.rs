use std::fmt;
use std::str::FromStr;

use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::domain::character::models::{Character, CharacterRelationship};
use crate::domain::project::models::Project;
use crate::domain::timeline::models::Scene;

// ---------------------------------------------------------------------------
// DraftSource
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DraftSource {
    AiGeneration,
    AiEdit,
    Manual,
}

impl fmt::Display for DraftSource {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::AiGeneration => write!(f, "ai_generation"),
            Self::AiEdit => write!(f, "ai_edit"),
            Self::Manual => write!(f, "manual"),
        }
    }
}

impl FromStr for DraftSource {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "ai_generation" => Ok(Self::AiGeneration),
            "ai_edit" => Ok(Self::AiEdit),
            "manual" => Ok(Self::Manual),
            other => Err(format!("unknown draft source: {other}")),
        }
    }
}

// ---------------------------------------------------------------------------
// GenerationType
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum GenerationType {
    Scene,
    Summary,
    Structuring,
    Edit,
}

impl fmt::Display for GenerationType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Scene => write!(f, "scene"),
            Self::Summary => write!(f, "summary"),
            Self::Structuring => write!(f, "structuring"),
            Self::Edit => write!(f, "edit"),
        }
    }
}

impl FromStr for GenerationType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "scene" => Ok(Self::Scene),
            "summary" => Ok(Self::Summary),
            "structuring" => Ok(Self::Structuring),
            "edit" => Ok(Self::Edit),
            other => Err(format!("unknown generation type: {other}")),
        }
    }
}

// ---------------------------------------------------------------------------
// GenerationStatus
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum GenerationStatus {
    Success,
    Failure,
    Partial,
}

impl fmt::Display for GenerationStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Success => write!(f, "success"),
            Self::Failure => write!(f, "failure"),
            Self::Partial => write!(f, "partial"),
        }
    }
}

impl FromStr for GenerationStatus {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "success" => Ok(Self::Success),
            "failure" => Ok(Self::Failure),
            "partial" => Ok(Self::Partial),
            other => Err(format!("unknown generation status: {other}")),
        }
    }
}

// ---------------------------------------------------------------------------
// Draft
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct Draft {
    pub id: Uuid,
    pub scene_id: Uuid,
    pub version: i32,
    pub content: String,
    pub char_count: i32,
    pub source: DraftSource,
    pub edit_direction: Option<String>,
    pub model: Option<String>,
    pub provider: Option<String>,
    pub token_count_input: Option<i32>,
    pub token_count_output: Option<i32>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct DraftSummary {
    pub id: Uuid,
    pub version: i32,
    pub char_count: i32,
    pub source: DraftSource,
    pub edit_direction: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct CreateManualDraft {
    pub content: String,
}

#[derive(Debug, Clone)]
pub struct CreateDraftParams {
    pub scene_id: Uuid,
    pub version: i32,
    pub content: String,
    pub source: DraftSource,
    pub edit_direction: Option<String>,
    pub model: Option<String>,
    pub provider: Option<String>,
    pub tokens_in: Option<i32>,
    pub tokens_out: Option<i32>,
    pub cost: Option<f64>,
}

#[derive(Debug, Clone)]
pub struct EditDraftRequest {
    pub content: String,
    pub selected_text: Option<String>,
    pub direction: String,
}

// ---------------------------------------------------------------------------
// SceneSummary
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct SceneSummary {
    pub scene_id: Uuid,
    pub draft_version: i32,
    pub summary_text: String,
    pub model: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ---------------------------------------------------------------------------
// GenerationContext
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct GenerationContext {
    pub project: Project,
    pub scene: Scene,
    pub characters: Vec<Character>,
    pub relationships: Vec<CharacterRelationship>,
    pub preceding_summaries: Vec<SceneSummary>,
    pub simultaneous_scenes: Vec<Scene>,
    pub next_scene: Option<Scene>,
}

// ---------------------------------------------------------------------------
// GenerationLog
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct GenerationLog {
    pub id: Uuid,
    pub user_id: Uuid,
    pub project_id: Option<Uuid>,
    pub scene_id: Option<Uuid>,
    pub generation_type: GenerationType,
    pub status: GenerationStatus,
    pub model: String,
    pub provider: String,
    pub duration_ms: i32,
    pub token_count_input: i32,
    pub token_count_output: i32,
    pub cost_usd: f64,
    pub error_message: Option<String>,
    pub created_at: DateTime<Utc>,
}

// ---------------------------------------------------------------------------
// CostSummary (analytics)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct CostSummary {
    pub total_generations: i64,
    pub total_tokens_input: i64,
    pub total_tokens_output: i64,
    pub total_cost_usd: f64,
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- DraftSource ---

    #[test]
    fn draft_source_display() {
        assert_eq!(DraftSource::AiGeneration.to_string(), "ai_generation");
        assert_eq!(DraftSource::AiEdit.to_string(), "ai_edit");
        assert_eq!(DraftSource::Manual.to_string(), "manual");
    }

    #[test]
    fn draft_source_from_str() {
        assert_eq!("ai_generation".parse::<DraftSource>().unwrap(), DraftSource::AiGeneration);
        assert_eq!("ai_edit".parse::<DraftSource>().unwrap(), DraftSource::AiEdit);
        assert_eq!("manual".parse::<DraftSource>().unwrap(), DraftSource::Manual);
    }

    #[test]
    fn draft_source_from_str_unknown() {
        let err = "nope".parse::<DraftSource>().unwrap_err();
        assert!(err.contains("unknown draft source"));
    }

    #[test]
    fn draft_source_roundtrip() {
        for v in [DraftSource::AiGeneration, DraftSource::AiEdit, DraftSource::Manual] {
            assert_eq!(v.to_string().parse::<DraftSource>().unwrap(), v);
        }
    }

    // --- GenerationType ---

    #[test]
    fn generation_type_display() {
        assert_eq!(GenerationType::Scene.to_string(), "scene");
        assert_eq!(GenerationType::Summary.to_string(), "summary");
        assert_eq!(GenerationType::Structuring.to_string(), "structuring");
        assert_eq!(GenerationType::Edit.to_string(), "edit");
    }

    #[test]
    fn generation_type_from_str() {
        assert_eq!("scene".parse::<GenerationType>().unwrap(), GenerationType::Scene);
        assert_eq!("summary".parse::<GenerationType>().unwrap(), GenerationType::Summary);
        assert_eq!("structuring".parse::<GenerationType>().unwrap(), GenerationType::Structuring);
        assert_eq!("edit".parse::<GenerationType>().unwrap(), GenerationType::Edit);
    }

    #[test]
    fn generation_type_from_str_unknown() {
        let err = "nope".parse::<GenerationType>().unwrap_err();
        assert!(err.contains("unknown generation type"));
    }

    #[test]
    fn generation_type_roundtrip() {
        for v in [GenerationType::Scene, GenerationType::Summary, GenerationType::Structuring, GenerationType::Edit] {
            assert_eq!(v.to_string().parse::<GenerationType>().unwrap(), v);
        }
    }

    // --- GenerationStatus ---

    #[test]
    fn generation_status_display() {
        assert_eq!(GenerationStatus::Success.to_string(), "success");
        assert_eq!(GenerationStatus::Failure.to_string(), "failure");
        assert_eq!(GenerationStatus::Partial.to_string(), "partial");
    }

    #[test]
    fn generation_status_from_str() {
        assert_eq!("success".parse::<GenerationStatus>().unwrap(), GenerationStatus::Success);
        assert_eq!("failure".parse::<GenerationStatus>().unwrap(), GenerationStatus::Failure);
        assert_eq!("partial".parse::<GenerationStatus>().unwrap(), GenerationStatus::Partial);
    }

    #[test]
    fn generation_status_from_str_unknown() {
        let err = "nope".parse::<GenerationStatus>().unwrap_err();
        assert!(err.contains("unknown generation status"));
    }

    #[test]
    fn generation_status_roundtrip() {
        for v in [GenerationStatus::Success, GenerationStatus::Failure, GenerationStatus::Partial] {
            assert_eq!(v.to_string().parse::<GenerationStatus>().unwrap(), v);
        }
    }

    // --- CostSummary ---

    #[test]
    fn cost_summary_defaults_to_zero() {
        let cs = CostSummary {
            total_generations: 0,
            total_tokens_input: 0,
            total_tokens_output: 0,
            total_cost_usd: 0.0,
        };
        assert_eq!(cs.total_generations, 0);
        assert_eq!(cs.total_cost_usd, 0.0);
    }
}
