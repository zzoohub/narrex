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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn display_track_not_found() {
        assert_eq!(TimelineError::TrackNotFound.to_string(), "track not found");
    }

    #[test]
    fn display_scene_not_found() {
        assert_eq!(TimelineError::SceneNotFound.to_string(), "scene not found");
    }

    #[test]
    fn display_connection_not_found() {
        assert_eq!(TimelineError::ConnectionNotFound.to_string(), "connection not found");
    }

    #[test]
    fn display_track_has_scenes() {
        assert_eq!(
            TimelineError::TrackHasScenes.to_string(),
            "track has scenes and cannot be deleted"
        );
    }

    #[test]
    fn display_connection_exists() {
        assert_eq!(TimelineError::ConnectionExists.to_string(), "connection already exists");
    }

    #[test]
    fn display_invalid_position() {
        let err = TimelineError::InvalidPosition("negative value".into());
        assert_eq!(err.to_string(), "invalid position: negative value");
    }

    #[test]
    fn display_forbidden() {
        assert_eq!(TimelineError::Forbidden.to_string(), "forbidden");
    }

    #[test]
    fn display_unknown() {
        let err = TimelineError::Unknown(anyhow::anyhow!("db error"));
        assert_eq!(err.to_string(), "unknown timeline error: db error");
    }

    #[test]
    fn source_non_unknown() {
        use std::error::Error;
        assert!(TimelineError::TrackNotFound.source().is_none());
        assert!(TimelineError::SceneNotFound.source().is_none());
        assert!(TimelineError::ConnectionNotFound.source().is_none());
        assert!(TimelineError::TrackHasScenes.source().is_none());
        assert!(TimelineError::ConnectionExists.source().is_none());
        assert!(TimelineError::Forbidden.source().is_none());
    }

    #[test]
    fn source_unknown() {
        use std::error::Error;
        let err = TimelineError::Unknown(anyhow::anyhow!("inner"));
        assert!(err.source().is_some());
    }
}
