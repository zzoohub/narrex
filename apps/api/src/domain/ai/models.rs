use std::fmt;
use std::str::FromStr;

use chrono::{DateTime, Utc};
use uuid::Uuid;

use serde::{Deserialize, Deserializer};

use crate::domain::character::models::{Character, CharacterRelationship};
use crate::domain::project::models::Project;
use crate::domain::timeline::models::Scene;

/// Deserializes a value that might be `null` into `T::default()`.
/// Handles both missing fields (via `#[serde(default)]`) and explicit `null`.
fn null_as_default<'de, D, T>(deserializer: D) -> Result<T, D::Error>
where
    D: Deserializer<'de>,
    T: Default + Deserialize<'de>,
{
    Option::<T>::deserialize(deserializer).map(|o| o.unwrap_or_default())
}

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

// ---------------------------------------------------------------------------
// Quota
// ---------------------------------------------------------------------------

pub const MONTHLY_GENERATION_LIMIT: i64 = 10;
pub const MONTHLY_GENERATION_WARNING_THRESHOLD: i64 = 7;

#[derive(Debug, Clone)]
pub struct QuotaInfo {
    pub used: i64,
    pub limit: i64,
    pub remaining: i64,
    pub warning: bool,
    pub exceeded: bool,
    pub resets_at: DateTime<Utc>,
}

// ---------------------------------------------------------------------------
// StructuredOutput (LLM JSON response for project structuring)
// ---------------------------------------------------------------------------

/// LLM JSON output schema for project structuring.
/// All fields use lenient deserialization: `null` → default value.
#[derive(Debug, Clone, Deserialize)]
pub struct StructuredOutput {
    #[serde(default, deserialize_with = "null_as_default")]
    pub title: String,
    pub genre: Option<String>,
    pub theme: Option<String>,
    pub era_location: Option<String>,
    pub pov: Option<String>,
    pub tone: Option<String>,
    #[serde(default, deserialize_with = "null_as_default")]
    pub characters: Vec<StructuredCharacter>,
    #[serde(default, deserialize_with = "null_as_default")]
    pub relationships: Vec<StructuredRelationship>,
    #[serde(default, deserialize_with = "null_as_default")]
    pub tracks: Vec<StructuredTrack>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct StructuredCharacter {
    #[serde(default, deserialize_with = "null_as_default")]
    pub name: String,
    pub personality: Option<String>,
    pub appearance: Option<String>,
    pub secrets: Option<String>,
    pub motivation: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct StructuredRelationship {
    #[serde(default, deserialize_with = "null_as_default")]
    pub character_a: String,
    #[serde(default, deserialize_with = "null_as_default")]
    pub character_b: String,
    #[serde(default, deserialize_with = "null_as_default")]
    pub label: String,
    pub direction: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct StructuredTrack {
    pub label: Option<String>,
    #[serde(default, deserialize_with = "null_as_default")]
    pub scenes: Vec<StructuredScene>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct StructuredScene {
    #[serde(default, deserialize_with = "null_as_default")]
    pub title: String,
    pub plot_summary: Option<String>,
    pub location: Option<String>,
    pub mood_tags: Option<Vec<String>>,
    pub characters: Option<Vec<String>>,
}

/// Phase 1 output: world/setting metadata.
#[derive(Debug, Clone, Deserialize)]
pub struct WorldOutput {
    #[serde(default, deserialize_with = "null_as_default")]
    pub title: String,
    pub genre: Option<String>,
    pub theme: Option<String>,
    pub era_location: Option<String>,
    pub pov: Option<String>,
    pub tone: Option<String>,
}

/// Phase 2 output: characters + relationships.
#[derive(Debug, Clone, Deserialize)]
pub struct CharactersOutput {
    #[serde(default, deserialize_with = "null_as_default")]
    pub characters: Vec<StructuredCharacter>,
    #[serde(default, deserialize_with = "null_as_default")]
    pub relationships: Vec<StructuredRelationship>,
}

/// Phase 3 output: timeline tracks with scenes.
#[derive(Debug, Clone, Deserialize)]
pub struct TimelineOutput {
    #[serde(default, deserialize_with = "null_as_default")]
    pub tracks: Vec<StructuredTrack>,
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
        assert_eq!(
            "ai_generation".parse::<DraftSource>().unwrap(),
            DraftSource::AiGeneration
        );
        assert_eq!(
            "ai_edit".parse::<DraftSource>().unwrap(),
            DraftSource::AiEdit
        );
        assert_eq!(
            "manual".parse::<DraftSource>().unwrap(),
            DraftSource::Manual
        );
    }

    #[test]
    fn draft_source_from_str_unknown() {
        let err = "nope".parse::<DraftSource>().unwrap_err();
        assert!(err.contains("unknown draft source"));
    }

    #[test]
    fn draft_source_roundtrip() {
        for v in [
            DraftSource::AiGeneration,
            DraftSource::AiEdit,
            DraftSource::Manual,
        ] {
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
        assert_eq!(
            "scene".parse::<GenerationType>().unwrap(),
            GenerationType::Scene
        );
        assert_eq!(
            "summary".parse::<GenerationType>().unwrap(),
            GenerationType::Summary
        );
        assert_eq!(
            "structuring".parse::<GenerationType>().unwrap(),
            GenerationType::Structuring
        );
        assert_eq!(
            "edit".parse::<GenerationType>().unwrap(),
            GenerationType::Edit
        );
    }

    #[test]
    fn generation_type_from_str_unknown() {
        let err = "nope".parse::<GenerationType>().unwrap_err();
        assert!(err.contains("unknown generation type"));
    }

    #[test]
    fn generation_type_roundtrip() {
        for v in [
            GenerationType::Scene,
            GenerationType::Summary,
            GenerationType::Structuring,
            GenerationType::Edit,
        ] {
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
        assert_eq!(
            "success".parse::<GenerationStatus>().unwrap(),
            GenerationStatus::Success
        );
        assert_eq!(
            "failure".parse::<GenerationStatus>().unwrap(),
            GenerationStatus::Failure
        );
        assert_eq!(
            "partial".parse::<GenerationStatus>().unwrap(),
            GenerationStatus::Partial
        );
    }

    #[test]
    fn generation_status_from_str_unknown() {
        let err = "nope".parse::<GenerationStatus>().unwrap_err();
        assert!(err.contains("unknown generation status"));
    }

    #[test]
    fn generation_status_roundtrip() {
        for v in [
            GenerationStatus::Success,
            GenerationStatus::Failure,
            GenerationStatus::Partial,
        ] {
            assert_eq!(v.to_string().parse::<GenerationStatus>().unwrap(), v);
        }
    }

    // --- QuotaInfo ---

    #[test]
    fn quota_info_below_warning() {
        let info = QuotaInfo {
            used: 3,
            limit: MONTHLY_GENERATION_LIMIT,
            remaining: 7,
            warning: false,
            exceeded: false,
            resets_at: Utc::now(),
        };
        assert!(!info.warning);
        assert!(!info.exceeded);
        assert_eq!(info.remaining, 7);
    }

    #[test]
    fn quota_info_at_warning_threshold() {
        let info = QuotaInfo {
            used: MONTHLY_GENERATION_WARNING_THRESHOLD,
            limit: MONTHLY_GENERATION_LIMIT,
            remaining: 3,
            warning: true,
            exceeded: false,
            resets_at: Utc::now(),
        };
        assert!(info.warning);
        assert!(!info.exceeded);
    }

    #[test]
    fn quota_info_exceeded() {
        let info = QuotaInfo {
            used: MONTHLY_GENERATION_LIMIT,
            limit: MONTHLY_GENERATION_LIMIT,
            remaining: 0,
            warning: true,
            exceeded: true,
            resets_at: Utc::now(),
        };
        assert!(info.warning);
        assert!(info.exceeded);
        assert_eq!(info.remaining, 0);
    }

    #[test]
    fn quota_constants() {
        assert_eq!(MONTHLY_GENERATION_LIMIT, 10);
        assert_eq!(MONTHLY_GENERATION_WARNING_THRESHOLD, 7);
        assert!(MONTHLY_GENERATION_WARNING_THRESHOLD < MONTHLY_GENERATION_LIMIT);
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

    // --- StructuredOutput deserialization ---

    #[test]
    fn structured_output_deserialize_full() {
        let json = r#"{
            "title": "운명의 칼날",
            "genre": "판타지",
            "theme": "복수와 용서",
            "era_location": "중세 유럽",
            "pov": "third_limited",
            "tone": "어둡고 긴장감 있는",
            "characters": [
                {
                    "name": "이수현",
                    "personality": "냉정하지만 속은 따뜻한",
                    "appearance": "검은 머리, 날카로운 눈",
                    "secrets": "과거에 가족을 잃은 트라우마",
                    "motivation": "복수"
                }
            ],
            "relationships": [
                {
                    "character_a": "이수현",
                    "character_b": "박지훈",
                    "label": "라이벌",
                    "direction": "bidirectional"
                }
            ],
            "tracks": [
                {
                    "label": "메인 스토리",
                    "scenes": [
                        {
                            "title": "시작",
                            "plot_summary": "주인공이 모험을 시작한다",
                            "location": "마을 광장",
                            "mood_tags": ["긴장", "결의"],
                            "characters": ["이수현"]
                        }
                    ]
                }
            ]
        }"#;

        let output: StructuredOutput = serde_json::from_str(json).unwrap();
        assert_eq!(output.title, "운명의 칼날");
        assert_eq!(output.genre.as_deref(), Some("판타지"));
        assert_eq!(output.theme.as_deref(), Some("복수와 용서"));
        assert_eq!(output.era_location.as_deref(), Some("중세 유럽"));
        assert_eq!(output.pov.as_deref(), Some("third_limited"));
        assert_eq!(output.tone.as_deref(), Some("어둡고 긴장감 있는"));
        assert_eq!(output.characters.len(), 1);
        assert_eq!(output.characters[0].name, "이수현");
        assert_eq!(
            output.characters[0].personality.as_deref(),
            Some("냉정하지만 속은 따뜻한")
        );
        assert_eq!(output.relationships.len(), 1);
        assert_eq!(output.relationships[0].label, "라이벌");
        assert_eq!(output.tracks.len(), 1);
        assert_eq!(output.tracks[0].scenes.len(), 1);
        assert_eq!(output.tracks[0].scenes[0].title, "시작");
        assert_eq!(
            output.tracks[0].scenes[0].mood_tags.as_ref().unwrap().len(),
            2
        );
        assert_eq!(
            output.tracks[0].scenes[0].characters.as_ref().unwrap(),
            &vec!["이수현".to_string()]
        );
    }

    #[test]
    fn structured_output_deserialize_minimal() {
        let json = r#"{
            "title": "최소 프로젝트",
            "characters": [],
            "relationships": [],
            "tracks": []
        }"#;

        let output: StructuredOutput = serde_json::from_str(json).unwrap();
        assert_eq!(output.title, "최소 프로젝트");
        assert!(output.genre.is_none());
        assert!(output.theme.is_none());
        assert!(output.era_location.is_none());
        assert!(output.pov.is_none());
        assert!(output.tone.is_none());
        assert!(output.characters.is_empty());
        assert!(output.relationships.is_empty());
        assert!(output.tracks.is_empty());
    }

    #[test]
    fn structured_output_deserialize_null_fields() {
        let json = r#"{
            "title": null,
            "genre": null,
            "characters": [
                { "name": null, "personality": null }
            ],
            "relationships": [
                { "character_a": null, "character_b": null, "label": null }
            ],
            "tracks": [
                {
                    "label": null,
                    "scenes": [
                        { "title": null, "plot_summary": null, "characters": null }
                    ]
                }
            ]
        }"#;

        let output: StructuredOutput = serde_json::from_str(json).unwrap();
        assert_eq!(output.title, "");
        assert!(output.genre.is_none());
        assert_eq!(output.characters[0].name, "");
        assert!(output.characters[0].personality.is_none());
        assert_eq!(output.relationships[0].label, "");
        assert_eq!(output.tracks[0].scenes[0].title, "");
    }

    // --- WorldOutput deserialization ---

    #[test]
    fn world_output_deserialize() {
        let json = r#"{"title": "운명의 칼날", "genre": "판타지", "theme": "복수", "era_location": "중세", "pov": "third_limited", "tone": "어두운"}"#;
        let output: WorldOutput = serde_json::from_str(json).unwrap();
        assert_eq!(output.title, "운명의 칼날");
        assert_eq!(output.genre.as_deref(), Some("판타지"));
        assert_eq!(output.pov.as_deref(), Some("third_limited"));
    }

    #[test]
    fn world_output_minimal() {
        let json = r#"{"title": "최소"}"#;
        let output: WorldOutput = serde_json::from_str(json).unwrap();
        assert_eq!(output.title, "최소");
        assert!(output.genre.is_none());
    }

    // --- CharactersOutput deserialization ---

    #[test]
    fn characters_output_deserialize() {
        let json = r#"{
            "characters": [{"name": "이수현", "personality": "용감한"}],
            "relationships": [{"character_a": "이수현", "character_b": "박지훈", "label": "라이벌"}]
        }"#;
        let output: CharactersOutput = serde_json::from_str(json).unwrap();
        assert_eq!(output.characters.len(), 1);
        assert_eq!(output.relationships.len(), 1);
    }

    #[test]
    fn characters_output_minimal() {
        let json = r#"{"characters": [], "relationships": []}"#;
        let output: CharactersOutput = serde_json::from_str(json).unwrap();
        assert!(output.characters.is_empty());
    }

    // --- TimelineOutput deserialization ---

    #[test]
    fn timeline_output_deserialize() {
        let json = r#"{
            "tracks": [{"label": "메인", "scenes": [{"title": "시작", "plot_summary": "첫 장면", "characters": ["이수현"]}]}]
        }"#;
        let output: TimelineOutput = serde_json::from_str(json).unwrap();
        assert_eq!(output.tracks.len(), 1);
        assert_eq!(output.tracks[0].scenes.len(), 1);
        assert_eq!(output.tracks[0].scenes[0].title, "시작");
    }

    #[test]
    fn timeline_output_empty() {
        let json = r#"{"tracks": []}"#;
        let output: TimelineOutput = serde_json::from_str(json).unwrap();
        assert!(output.tracks.is_empty());
    }

    #[test]
    fn structured_output_deserialize_missing_optional_fields() {
        let json = r#"{
            "title": "테스트",
            "characters": [
                { "name": "캐릭터A" }
            ],
            "relationships": [
                { "character_a": "캐릭터A", "character_b": "캐릭터B", "label": "친구" }
            ],
            "tracks": [
                {
                    "scenes": [
                        { "title": "장면1" }
                    ]
                }
            ]
        }"#;

        let output: StructuredOutput = serde_json::from_str(json).unwrap();
        assert_eq!(output.title, "테스트");
        assert_eq!(output.characters[0].name, "캐릭터A");
        assert!(output.characters[0].personality.is_none());
        assert!(output.characters[0].appearance.is_none());
        assert!(output.characters[0].secrets.is_none());
        assert!(output.characters[0].motivation.is_none());
        assert!(output.relationships[0].direction.is_none());
        assert!(output.tracks[0].label.is_none());
        assert!(output.tracks[0].scenes[0].plot_summary.is_none());
        assert!(output.tracks[0].scenes[0].location.is_none());
        assert!(output.tracks[0].scenes[0].mood_tags.is_none());
        assert!(output.tracks[0].scenes[0].characters.is_none());
    }
}
