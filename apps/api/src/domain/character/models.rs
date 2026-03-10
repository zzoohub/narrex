use std::fmt;
use std::str::FromStr;

use chrono::{DateTime, Utc};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// RelationshipVisual
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RelationshipVisual {
    Solid,
    Dashed,
    Arrowed,
}

impl fmt::Display for RelationshipVisual {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Solid => write!(f, "solid"),
            Self::Dashed => write!(f, "dashed"),
            Self::Arrowed => write!(f, "arrowed"),
        }
    }
}

impl FromStr for RelationshipVisual {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "solid" => Ok(Self::Solid),
            "dashed" => Ok(Self::Dashed),
            "arrowed" => Ok(Self::Arrowed),
            other => Err(format!("unknown relationship visual: {other}")),
        }
    }
}

// ---------------------------------------------------------------------------
// RelationshipDirection
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RelationshipDirection {
    Bidirectional,
    AToB,
    BToA,
}

impl fmt::Display for RelationshipDirection {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Bidirectional => write!(f, "bidirectional"),
            Self::AToB => write!(f, "a_to_b"),
            Self::BToA => write!(f, "b_to_a"),
        }
    }
}

impl FromStr for RelationshipDirection {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "bidirectional" => Ok(Self::Bidirectional),
            "a_to_b" => Ok(Self::AToB),
            "b_to_a" => Ok(Self::BToA),
            other => Err(format!("unknown relationship direction: {other}")),
        }
    }
}

// ---------------------------------------------------------------------------
// Character
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct Character {
    pub id: Uuid,
    pub project_id: Uuid,
    pub name: String,
    pub personality: Option<String>,
    pub appearance: Option<String>,
    pub secrets: Option<String>,
    pub motivation: Option<String>,
    pub profile_image_url: Option<String>,
    pub graph_x: Option<f64>,
    pub graph_y: Option<f64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct CreateCharacter {
    pub name: String,
    pub personality: Option<String>,
    pub appearance: Option<String>,
    pub secrets: Option<String>,
    pub motivation: Option<String>,
    pub profile_image_url: Option<String>,
    pub graph_x: Option<f64>,
    pub graph_y: Option<f64>,
}

#[derive(Debug, Clone, Default)]
pub struct UpdateCharacter {
    pub name: Option<String>,
    pub personality: Option<Option<String>>,
    pub appearance: Option<Option<String>>,
    pub secrets: Option<Option<String>>,
    pub motivation: Option<Option<String>>,
    pub profile_image_url: Option<Option<String>>,
    pub graph_x: Option<Option<f64>>,
    pub graph_y: Option<Option<f64>>,
}

// ---------------------------------------------------------------------------
// CharacterRelationship
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct CharacterRelationship {
    pub id: Uuid,
    pub project_id: Uuid,
    pub character_a_id: Uuid,
    pub character_b_id: Uuid,
    pub label: String,
    pub visual_type: RelationshipVisual,
    pub direction: RelationshipDirection,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct CreateRelationship {
    pub character_a_id: Uuid,
    pub character_b_id: Uuid,
    pub label: String,
    pub visual_type: RelationshipVisual,
    pub direction: RelationshipDirection,
}

#[derive(Debug, Clone, Default)]
pub struct UpdateRelationship {
    pub label: Option<String>,
    pub visual_type: Option<RelationshipVisual>,
    pub direction: Option<RelationshipDirection>,
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- RelationshipVisual ---

    #[test]
    fn relationship_visual_display() {
        assert_eq!(RelationshipVisual::Solid.to_string(), "solid");
        assert_eq!(RelationshipVisual::Dashed.to_string(), "dashed");
        assert_eq!(RelationshipVisual::Arrowed.to_string(), "arrowed");
    }

    #[test]
    fn relationship_visual_from_str() {
        assert_eq!(
            "solid".parse::<RelationshipVisual>().unwrap(),
            RelationshipVisual::Solid
        );
        assert_eq!(
            "dashed".parse::<RelationshipVisual>().unwrap(),
            RelationshipVisual::Dashed
        );
        assert_eq!(
            "arrowed".parse::<RelationshipVisual>().unwrap(),
            RelationshipVisual::Arrowed
        );
    }

    #[test]
    fn relationship_visual_from_str_unknown() {
        let err = "nope".parse::<RelationshipVisual>().unwrap_err();
        assert!(err.contains("unknown relationship visual"));
    }

    #[test]
    fn relationship_visual_roundtrip() {
        for v in [
            RelationshipVisual::Solid,
            RelationshipVisual::Dashed,
            RelationshipVisual::Arrowed,
        ] {
            assert_eq!(v.to_string().parse::<RelationshipVisual>().unwrap(), v);
        }
    }

    // --- RelationshipDirection ---

    #[test]
    fn relationship_direction_display() {
        assert_eq!(
            RelationshipDirection::Bidirectional.to_string(),
            "bidirectional"
        );
        assert_eq!(RelationshipDirection::AToB.to_string(), "a_to_b");
        assert_eq!(RelationshipDirection::BToA.to_string(), "b_to_a");
    }

    #[test]
    fn relationship_direction_from_str() {
        assert_eq!(
            "bidirectional".parse::<RelationshipDirection>().unwrap(),
            RelationshipDirection::Bidirectional
        );
        assert_eq!(
            "a_to_b".parse::<RelationshipDirection>().unwrap(),
            RelationshipDirection::AToB
        );
        assert_eq!(
            "b_to_a".parse::<RelationshipDirection>().unwrap(),
            RelationshipDirection::BToA
        );
    }

    #[test]
    fn relationship_direction_from_str_unknown() {
        let err = "nope".parse::<RelationshipDirection>().unwrap_err();
        assert!(err.contains("unknown relationship direction"));
    }

    #[test]
    fn relationship_direction_roundtrip() {
        for d in [
            RelationshipDirection::Bidirectional,
            RelationshipDirection::AToB,
            RelationshipDirection::BToA,
        ] {
            assert_eq!(d.to_string().parse::<RelationshipDirection>().unwrap(), d);
        }
    }

    // --- UpdateCharacter default ---

    #[test]
    fn update_character_default_all_none() {
        let u = UpdateCharacter::default();
        assert!(u.name.is_none());
        assert!(u.personality.is_none());
        assert!(u.appearance.is_none());
        assert!(u.secrets.is_none());
        assert!(u.motivation.is_none());
        assert!(u.profile_image_url.is_none());
        assert!(u.graph_x.is_none());
        assert!(u.graph_y.is_none());
    }

    // --- UpdateRelationship default ---

    #[test]
    fn update_relationship_default_all_none() {
        let u = UpdateRelationship::default();
        assert!(u.label.is_none());
        assert!(u.visual_type.is_none());
        assert!(u.direction.is_none());
    }
}
