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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn display_not_found() {
        assert_eq!(ProjectError::NotFound.to_string(), "project not found");
    }

    #[test]
    fn display_forbidden() {
        assert_eq!(ProjectError::Forbidden.to_string(), "forbidden");
    }

    #[test]
    fn display_unknown() {
        let err = ProjectError::Unknown(anyhow::anyhow!("db error"));
        assert_eq!(err.to_string(), "unknown project error: db error");
    }

    #[test]
    fn source_returns_none_for_not_found() {
        use std::error::Error;
        assert!(ProjectError::NotFound.source().is_none());
    }

    #[test]
    fn source_returns_some_for_unknown() {
        use std::error::Error;
        let err = ProjectError::Unknown(anyhow::anyhow!("inner"));
        assert!(err.source().is_some());
    }
}
