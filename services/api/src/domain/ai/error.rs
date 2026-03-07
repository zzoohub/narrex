use std::fmt;

#[derive(Debug)]
pub enum AiError {
    SceneNotFound,
    ProjectNotFound,
    DraftNotFound,
    GenerationFailed(String),
    RateLimited,
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
