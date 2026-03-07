use std::fmt;

#[derive(Debug)]
pub enum TimelineError {
    TrackNotFound,
    SceneNotFound,
    ConnectionNotFound,
    TrackHasScenes,
    ConnectionExists,
    InvalidPosition(String),
    Forbidden,
    Unknown(anyhow::Error),
}

impl fmt::Display for TimelineError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::TrackNotFound => write!(f, "track not found"),
            Self::SceneNotFound => write!(f, "scene not found"),
            Self::ConnectionNotFound => write!(f, "connection not found"),
            Self::TrackHasScenes => write!(f, "track has scenes and cannot be deleted"),
            Self::ConnectionExists => write!(f, "connection already exists"),
            Self::InvalidPosition(msg) => write!(f, "invalid position: {msg}"),
            Self::Forbidden => write!(f, "forbidden"),
            Self::Unknown(err) => write!(f, "unknown timeline error: {err}"),
        }
    }
}

impl std::error::Error for TimelineError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Unknown(err) => Some(err.as_ref()),
            _ => None,
        }
    }
}
