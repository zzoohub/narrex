use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::domain::character::models::{
    Character, CharacterRelationship, RelationshipDirection, RelationshipVisual,
};
use crate::domain::project::models::Project;
use crate::domain::timeline::models::{SceneConnection, Track};

mod en;
mod ko;

/// All entities for a sample project, ready for atomic insertion.
pub struct SampleProjectData {
    pub project: Project,
    pub tracks: Vec<Track>,
    pub characters: Vec<Character>,
    pub scenes: Vec<SampleScene>,
    pub relationships: Vec<CharacterRelationship>,
    pub connections: Vec<SceneConnection>,
}

/// Scene with character IDs for junction table insertion.
/// Wraps the domain Scene to include character assignments.
pub struct SampleScene {
    pub id: Uuid,
    pub track_id: Uuid,
    pub project_id: Uuid,
    pub start_position: f64,
    pub duration: f64,
    pub status: crate::domain::timeline::models::SceneStatus,
    pub title: String,
    pub plot_summary: Option<String>,
    pub location: Option<String>,
    pub mood_tags: Vec<String>,
    pub content: Option<String>,
    pub character_ids: Vec<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Build a complete sample project for a newly signed-up user.
///
/// Dispatches to locale-specific builders. Defaults to English for unknown locales.
pub fn build_sample_project(user_id: Uuid, locale: &str) -> SampleProjectData {
    match locale {
        "ko" => ko::build(user_id),
        _ => en::build(user_id),
    }
}

/// Build relationships with correct UUID ordering (a_id < b_id).
///
/// Shared by all locale builders. The DB constraint `character_a_id < character_b_id`
/// requires sorting UUIDs and flipping direction when needed.
pub(super) fn build_relationships(
    project_id: Uuid,
    now: DateTime<Utc>,
    defs: Vec<(Uuid, Uuid, &str, RelationshipVisual, RelationshipDirection)>,
) -> Vec<CharacterRelationship> {
    defs.into_iter()
        .map(|(a, b, label, visual, dir)| {
            let (ordered_a, ordered_b, ordered_dir) = if a < b {
                (a, b, dir)
            } else {
                let flipped = match dir {
                    RelationshipDirection::AToB => RelationshipDirection::BToA,
                    RelationshipDirection::BToA => RelationshipDirection::AToB,
                    d => d,
                };
                (b, a, flipped)
            };
            CharacterRelationship {
                id: Uuid::new_v4(),
                project_id,
                character_a_id: ordered_a,
                character_b_id: ordered_b,
                label: label.into(),
                visual_type: visual,
                direction: ordered_dir,
                created_at: now,
                updated_at: now,
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::project::models::SourceType;
    use crate::domain::timeline::models::{ConnectionType, SceneStatus};

    // Run structural assertions for any locale's seed data.
    fn assert_seed_structure(data: &SampleProjectData) {
        assert_eq!(data.tracks.len(), 2, "2 tracks");
        assert_eq!(data.scenes.len(), 9, "9 scenes");
        assert_eq!(data.characters.len(), 5, "5 characters");
        assert_eq!(data.relationships.len(), 6, "6 relationships");
        assert_eq!(data.connections.len(), 2, "2 connections");
    }

    fn assert_seed_statuses(data: &SampleProjectData) {
        let edited = data
            .scenes
            .iter()
            .filter(|s| s.status == SceneStatus::Edited)
            .count();
        let ai_draft = data
            .scenes
            .iter()
            .filter(|s| s.status == SceneStatus::AiDraft)
            .count();
        let empty = data
            .scenes
            .iter()
            .filter(|s| s.status == SceneStatus::Empty)
            .count();
        assert_eq!(edited, 1, "1 edited scene");
        assert_eq!(ai_draft, 1, "1 ai_draft scene");
        assert_eq!(empty, 7, "7 empty scenes");
    }

    fn assert_seed_content(data: &SampleProjectData) {
        for scene in &data.scenes {
            match scene.status {
                SceneStatus::Edited | SceneStatus::AiDraft => {
                    assert!(
                        scene.content.is_some(),
                        "scene '{}' should have content",
                        scene.title
                    );
                    assert!(!scene.content.as_ref().unwrap().is_empty());
                }
                _ => {
                    assert!(
                        scene.content.is_none(),
                        "scene '{}' should have no content",
                        scene.title
                    );
                }
            }
        }
    }

    fn assert_seed_integrity(data: &SampleProjectData) {
        // All scenes belong to project
        for scene in &data.scenes {
            assert_eq!(scene.project_id, data.project.id);
        }
        // All characters belong to project
        for ch in &data.characters {
            assert_eq!(ch.project_id, data.project.id);
        }
        // Every scene has at least one character
        for scene in &data.scenes {
            assert!(
                !scene.character_ids.is_empty(),
                "scene '{}' needs characters",
                scene.title
            );
        }
        // All character refs are valid
        let char_ids: std::collections::HashSet<Uuid> =
            data.characters.iter().map(|c| c.id).collect();
        for scene in &data.scenes {
            for cid in &scene.character_ids {
                assert!(
                    char_ids.contains(cid),
                    "scene '{}' refs unknown char {}",
                    scene.title,
                    cid
                );
            }
        }
        // UUID ordering on relationships
        for rel in &data.relationships {
            assert!(
                rel.character_a_id < rel.character_b_id,
                "rel '{}': a < b",
                rel.label
            );
        }
        // Both connection types present
        assert!(data
            .connections
            .iter()
            .any(|c| c.connection_type == ConnectionType::Branch));
        assert!(data
            .connections
            .iter()
            .any(|c| c.connection_type == ConnectionType::Merge));
    }

    // ── Korean locale ────────────────────────────────────────────────

    #[test]
    fn ko_seed_structure() {
        assert_seed_structure(&build_sample_project(Uuid::new_v4(), "ko"));
    }

    #[test]
    fn ko_seed_statuses() {
        assert_seed_statuses(&build_sample_project(Uuid::new_v4(), "ko"));
    }

    #[test]
    fn ko_seed_content() {
        assert_seed_content(&build_sample_project(Uuid::new_v4(), "ko"));
    }

    #[test]
    fn ko_seed_integrity() {
        assert_seed_integrity(&build_sample_project(Uuid::new_v4(), "ko"));
    }

    #[test]
    fn ko_seed_is_korean() {
        let data = build_sample_project(Uuid::new_v4(), "ko");
        assert!(
            data.project
                .title
                .chars()
                .any(|c| ('\u{AC00}'..='\u{D7AF}').contains(&c)),
            "Korean title should contain Hangul"
        );
    }

    // ── English locale ───────────────────────────────────────────────

    #[test]
    fn en_seed_structure() {
        assert_seed_structure(&build_sample_project(Uuid::new_v4(), "en"));
    }

    #[test]
    fn en_seed_statuses() {
        assert_seed_statuses(&build_sample_project(Uuid::new_v4(), "en"));
    }

    #[test]
    fn en_seed_content() {
        assert_seed_content(&build_sample_project(Uuid::new_v4(), "en"));
    }

    #[test]
    fn en_seed_integrity() {
        assert_seed_integrity(&build_sample_project(Uuid::new_v4(), "en"));
    }

    #[test]
    fn en_seed_is_english() {
        let data = build_sample_project(Uuid::new_v4(), "en");
        assert!(
            data.project.title.is_ascii(),
            "English title should be ASCII"
        );
    }

    // ── Shared ───────────────────────────────────────────────────────

    #[test]
    fn unknown_locale_defaults_to_english() {
        let en = build_sample_project(Uuid::new_v4(), "en");
        let fr = build_sample_project(Uuid::new_v4(), "fr");
        assert_eq!(en.project.title, fr.project.title);
    }

    #[test]
    fn both_locales_are_sample_type() {
        let ko = build_sample_project(Uuid::new_v4(), "ko");
        let en = build_sample_project(Uuid::new_v4(), "en");
        assert_eq!(ko.project.source_type, Some(SourceType::Sample));
        assert_eq!(en.project.source_type, Some(SourceType::Sample));
    }

    #[test]
    fn fresh_uuids_per_call() {
        let d1 = build_sample_project(Uuid::new_v4(), "ko");
        let d2 = build_sample_project(Uuid::new_v4(), "ko");
        assert_ne!(d1.project.id, d2.project.id);
    }
}
