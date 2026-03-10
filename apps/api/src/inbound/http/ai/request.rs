use serde::Deserialize;

use crate::domain::ai::models::{CreateManualDraft, EditDraftRequest};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EditDraftHttpRequest {
    pub content: String,
    pub selected_text: Option<String>,
    pub direction: String,
}

impl From<EditDraftHttpRequest> for EditDraftRequest {
    fn from(r: EditDraftHttpRequest) -> Self {
        Self {
            content: r.content,
            selected_text: r.selected_text,
            direction: r.direction,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveDraftRequest {
    pub content: String,
}

impl From<SaveDraftRequest> for CreateManualDraft {
    fn from(r: SaveDraftRequest) -> Self {
        Self { content: r.content }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsertSceneSummaryRequest {
    pub draft_version: i32,
    pub summary_text: String,
}
