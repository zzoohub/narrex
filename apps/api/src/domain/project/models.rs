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
    Sample,
}

impl fmt::Display for SourceType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::FreeText => write!(f, "free_text"),
            Self::FileImport => write!(f, "file_import"),
            Self::Template => write!(f, "template"),
            Self::Sample => write!(f, "sample"),
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
            "sample" => Ok(Self::Sample),
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
    pub source_type: Option<SourceType>,
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

#[cfg(test)]
mod tests {
    use super::*;

    // -- PovType Display/FromStr --

    #[test]
    fn pov_type_display() {
        assert_eq!(PovType::FirstPerson.to_string(), "first_person");
        assert_eq!(PovType::ThirdLimited.to_string(), "third_limited");
        assert_eq!(PovType::ThirdOmniscient.to_string(), "third_omniscient");
    }

    #[test]
    fn pov_type_from_str_valid() {
        assert_eq!("first_person".parse::<PovType>().unwrap(), PovType::FirstPerson);
        assert_eq!("third_limited".parse::<PovType>().unwrap(), PovType::ThirdLimited);
        assert_eq!("third_omniscient".parse::<PovType>().unwrap(), PovType::ThirdOmniscient);
    }

    #[test]
    fn pov_type_from_str_invalid() {
        let result = "invalid_pov".parse::<PovType>();
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("unknown pov type"));
    }

    #[test]
    fn pov_type_roundtrip() {
        for pov in [PovType::FirstPerson, PovType::ThirdLimited, PovType::ThirdOmniscient] {
            let s = pov.to_string();
            let parsed: PovType = s.parse().unwrap();
            assert_eq!(parsed, pov);
        }
    }

    // -- SourceType Display/FromStr --

    #[test]
    fn source_type_display() {
        assert_eq!(SourceType::FreeText.to_string(), "free_text");
        assert_eq!(SourceType::FileImport.to_string(), "file_import");
        assert_eq!(SourceType::Template.to_string(), "template");
        assert_eq!(SourceType::Sample.to_string(), "sample");
    }

    #[test]
    fn source_type_from_str_valid() {
        assert_eq!("free_text".parse::<SourceType>().unwrap(), SourceType::FreeText);
        assert_eq!("file_import".parse::<SourceType>().unwrap(), SourceType::FileImport);
        assert_eq!("template".parse::<SourceType>().unwrap(), SourceType::Template);
        assert_eq!("sample".parse::<SourceType>().unwrap(), SourceType::Sample);
    }

    #[test]
    fn source_type_from_str_invalid() {
        let result = "invalid_source".parse::<SourceType>();
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("unknown source type"));
    }

    #[test]
    fn source_type_roundtrip() {
        for st in [SourceType::FreeText, SourceType::FileImport, SourceType::Template, SourceType::Sample] {
            let s = st.to_string();
            let parsed: SourceType = s.parse().unwrap();
            assert_eq!(parsed, st);
        }
    }

    // -- UpdateProject Default --

    #[test]
    fn update_project_default_is_all_none() {
        let up = UpdateProject::default();
        assert!(up.title.is_none());
        assert!(up.genre.is_none());
        assert!(up.theme.is_none());
        assert!(up.era_location.is_none());
        assert!(up.pov.is_none());
        assert!(up.tone.is_none());
    }

    // -- PaginationParams --

    #[test]
    fn pagination_params_with_cursor() {
        let pp = PaginationParams {
            cursor: Some("abc".into()),
            limit: 20,
        };
        assert_eq!(pp.cursor.as_deref(), Some("abc"));
        assert_eq!(pp.limit, 20);
    }

    #[test]
    fn pagination_params_without_cursor() {
        let pp = PaginationParams {
            cursor: None,
            limit: 10,
        };
        assert!(pp.cursor.is_none());
    }
}
