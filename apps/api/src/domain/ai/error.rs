use std::fmt;

use chrono::{DateTime, Utc};

#[derive(Debug)]
pub enum AiError {
    SceneNotFound,
    ProjectNotFound,
    DraftNotFound,
    GenerationFailed(String),
    RateLimited,
    QuotaExceeded {
        used: i64,
        limit: i64,
        resets_at: DateTime<Utc>,
    },
    Unknown(anyhow::Error),
}

impl fmt::Display for AiError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::SceneNotFound => write!(f, "scene not found"),
            Self::ProjectNotFound => write!(f, "project not found"),
            Self::DraftNotFound => write!(f, "draft not found"),
            Self::GenerationFailed(msg) => write!(f, "generation failed: {msg}"),
            Self::RateLimited => write!(f, "rate limited"),
            Self::QuotaExceeded {
                used,
                limit,
                resets_at,
            } => write!(
                f,
                "monthly generation quota exceeded ({used}/{limit}), resets at {resets_at}"
            ),
            Self::Unknown(err) => write!(f, "unknown AI error: {err}"),
        }
    }
}

impl std::error::Error for AiError {
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
    fn display_scene_not_found() {
        assert_eq!(AiError::SceneNotFound.to_string(), "scene not found");
    }

    #[test]
    fn display_project_not_found() {
        assert_eq!(AiError::ProjectNotFound.to_string(), "project not found");
    }

    #[test]
    fn display_draft_not_found() {
        assert_eq!(AiError::DraftNotFound.to_string(), "draft not found");
    }

    #[test]
    fn display_generation_failed() {
        let err = AiError::GenerationFailed("timeout".into());
        assert_eq!(err.to_string(), "generation failed: timeout");
    }

    #[test]
    fn display_rate_limited() {
        assert_eq!(AiError::RateLimited.to_string(), "rate limited");
    }

    #[test]
    fn display_unknown() {
        let err = AiError::Unknown(anyhow::anyhow!("db"));
        assert_eq!(err.to_string(), "unknown AI error: db");
    }

    #[test]
    fn source_unknown_returns_some() {
        let err = AiError::Unknown(anyhow::anyhow!("inner"));
        assert!(err.source().is_some());
    }

    #[test]
    fn source_draft_not_found_returns_none() {
        assert!(AiError::DraftNotFound.source().is_none());
    }

    #[test]
    fn display_quota_exceeded() {
        let err = AiError::QuotaExceeded {
            used: 50,
            limit: 50,
            resets_at: chrono::Utc::now(),
        };
        let msg = err.to_string();
        assert!(msg.contains("monthly generation quota exceeded"));
        assert!(msg.contains("50/50"));
        assert!(msg.contains("resets at"));
    }

    #[test]
    fn source_quota_exceeded_returns_none() {
        let err = AiError::QuotaExceeded {
            used: 50,
            limit: 50,
            resets_at: chrono::Utc::now(),
        };
        assert!(err.source().is_none());
    }
}
