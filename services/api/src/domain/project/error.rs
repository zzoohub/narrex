use std::fmt;

#[derive(Debug)]
pub enum ProjectError {
    NotFound,
    Forbidden,
    Unknown(anyhow::Error),
}

impl fmt::Display for ProjectError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NotFound => write!(f, "project not found"),
            Self::Forbidden => write!(f, "forbidden"),
            Self::Unknown(err) => write!(f, "unknown project error: {err}"),
        }
    }
}

impl std::error::Error for ProjectError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Unknown(err) => Some(err.as_ref()),
            _ => None,
        }
    }
}
