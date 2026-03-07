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
