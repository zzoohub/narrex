use std::fmt;

#[derive(Debug)]
pub enum CharacterError {
    NotFound,
    RelationshipNotFound,
    RelationshipExists,
    Forbidden,
    Unknown(anyhow::Error),
}

impl fmt::Display for CharacterError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NotFound => write!(f, "character not found"),
            Self::RelationshipNotFound => write!(f, "relationship not found"),
            Self::RelationshipExists => write!(f, "relationship already exists"),
            Self::Forbidden => write!(f, "forbidden"),
            Self::Unknown(err) => write!(f, "unknown character error: {err}"),
        }
    }
}

impl std::error::Error for CharacterError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Unknown(err) => Some(err.as_ref()),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::error::Error;

    #[test]
    fn display_not_found() {
        assert_eq!(CharacterError::NotFound.to_string(), "character not found");
    }

    #[test]
    fn display_relationship_not_found() {
        assert_eq!(CharacterError::RelationshipNotFound.to_string(), "relationship not found");
    }

    #[test]
    fn display_relationship_exists() {
        assert_eq!(CharacterError::RelationshipExists.to_string(), "relationship already exists");
    }

    #[test]
    fn display_forbidden() {
        assert_eq!(CharacterError::Forbidden.to_string(), "forbidden");
    }

    #[test]
    fn display_unknown() {
        let err = CharacterError::Unknown(anyhow::anyhow!("db down"));
        assert_eq!(err.to_string(), "unknown character error: db down");
    }

    #[test]
    fn source_unknown_returns_some() {
        let err = CharacterError::Unknown(anyhow::anyhow!("inner"));
        assert!(err.source().is_some());
    }

    #[test]
    fn source_not_found_returns_none() {
        assert!(CharacterError::NotFound.source().is_none());
    }
}
