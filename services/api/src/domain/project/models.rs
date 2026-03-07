use std::fmt;
use std::str::FromStr;

use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::domain::character::models::{Character, CharacterRelationship};
use crate::domain::timeline::models::{Scene, SceneConnection, Track};

// ---------------------------------------------------------------------------
// PovType
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PovType {
    FirstPerson,
    ThirdLimited,
    ThirdOmniscient,
}

impl fmt::Display for PovType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::FirstPerson => write!(f, "first_person"),
            Self::ThirdLimited => write!(f, "third_limited"),
            Self::ThirdOmniscient => write!(f, "third_omniscient"),
        }
    }
}

impl FromStr for PovType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "first_person" => Ok(Self::FirstPerson),
            "third_limited" => Ok(Self::ThirdLimited),
            "third_omniscient" => Ok(Self::ThirdOmniscient),
            other => Err(format!("unknown pov type: {other}")),
        }
    }
}

// ---------------------------------------------------------------------------
// SourceType
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SourceType {
    FreeText,
    FileImport,
    Template,
}

impl fmt::Display for SourceType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::FreeText => write!(f, "free_text"),
            Self::FileImport => write!(f, "file_import"),
            Self::Template => write!(f, "template"),
        }
    }
}

impl FromStr for SourceType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "free_text" => Ok(Self::FreeText),
            "file_import" => Ok(Self::FileImport),
            "template" => Ok(Self::Template),
            other => Err(format!("unknown source type: {other}")),
        }
    }
}

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct Project {
    pub id: Uuid,
    pub user_id: Uuid,
    pub title: String,
    pub genre: Option<String>,
    pub theme: Option<String>,
    pub era_location: Option<String>,
    pub pov: Option<PovType>,
    pub tone: Option<String>,
    pub source_type: Option<SourceType>,
    pub source_input: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ---------------------------------------------------------------------------
// ProjectSummary (for list view)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct ProjectSummary {
    pub id: Uuid,
    pub title: String,
    pub genre: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ---------------------------------------------------------------------------
// CreateProjectFromText
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct CreateProjectFromText {
    pub source_input: String,
    pub clarification_answers: Option<Vec<String>>,
}

// ---------------------------------------------------------------------------
// UpdateProject
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Default)]
pub struct UpdateProject {
    pub title: Option<String>,
    pub genre: Option<Option<String>>,
    pub theme: Option<Option<String>>,
    pub era_location: Option<Option<String>>,
    pub pov: Option<Option<PovType>>,
    pub tone: Option<Option<String>>,
}

// ---------------------------------------------------------------------------
// Workspace (full project load)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct Workspace {
    pub project: Project,
    pub tracks: Vec<Track>,
    pub scenes: Vec<Scene>,
    pub characters: Vec<Character>,
    pub relationships: Vec<CharacterRelationship>,
    pub connections: Vec<SceneConnection>,
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct PaginationParams {
    pub cursor: Option<String>,
    pub limit: i64,
}

#[derive(Debug, Clone)]
pub struct PaginatedResult<T> {
    pub data: Vec<T>,
    pub next_cursor: Option<String>,
    pub has_more: bool,
}
