use serde::Deserialize;

use crate::domain::project::models::{CreateProjectFromText, PovType, UpdateProject};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProjectTextRequest {
    pub source_input: String,
    pub clarification_answers: Option<Vec<String>>,
    pub locale: Option<String>,
}

impl From<CreateProjectTextRequest> for CreateProjectFromText {
    fn from(r: CreateProjectTextRequest) -> Self {
        Self {
            source_input: r.source_input,
            clarification_answers: r.clarification_answers,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProjectDirectRequest {
    pub title: String,
    pub genre: Option<String>,
    pub theme: Option<String>,
    pub era_location: Option<String>,
    pub pov: Option<String>,
    pub tone: Option<String>,
    pub source_input: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProjectRequest {
    pub title: Option<String>,
    pub genre: Option<Option<String>>,
    pub theme: Option<Option<String>>,
    pub era_location: Option<Option<String>>,
    pub pov: Option<Option<String>>,
    pub tone: Option<Option<String>>,
}

impl TryFrom<UpdateProjectRequest> for UpdateProject {
    type Error = String;

    fn try_from(r: UpdateProjectRequest) -> Result<Self, Self::Error> {
        let pov = match r.pov {
            None => None,
            Some(None) => Some(None),
            Some(Some(s)) => {
                let parsed: PovType = s.parse().map_err(|e: String| e)?;
                Some(Some(parsed))
            }
        };

        Ok(Self {
            title: r.title,
            genre: r.genre,
            theme: r.theme,
            era_location: r.era_location,
            pov,
            tone: r.tone,
        })
    }
}

/// Query parameters for project list pagination.
#[derive(Debug, Deserialize)]
pub struct ListProjectsQuery {
    pub cursor: Option<String>,
    pub limit: Option<i64>,
}
