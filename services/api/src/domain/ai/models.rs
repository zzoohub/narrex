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
