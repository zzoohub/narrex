use std::fmt;

#[derive(Debug)]
pub enum AuthError {
    InvalidToken(String),
    TokenExpired,
    UserNotFound,
    OAuthFailed(String),
    Unknown(anyhow::Error),
}

impl fmt::Display for AuthError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidToken(msg) => write!(f, "invalid token: {msg}"),
            Self::TokenExpired => write!(f, "token expired"),
            Self::UserNotFound => write!(f, "user not found"),
            Self::OAuthFailed(msg) => write!(f, "oauth failed: {msg}"),
            Self::Unknown(err) => write!(f, "unknown auth error: {err}"),
        }
    }
}

impl std::error::Error for AuthError {
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
    fn display_invalid_token() {
        let err = AuthError::InvalidToken("bad jwt".into());
        assert_eq!(err.to_string(), "invalid token: bad jwt");
    }

    #[test]
    fn display_token_expired() {
        let err = AuthError::TokenExpired;
        assert_eq!(err.to_string(), "token expired");
    }

    #[test]
    fn display_user_not_found() {
        let err = AuthError::UserNotFound;
        assert_eq!(err.to_string(), "user not found");
    }

    #[test]
    fn display_oauth_failed() {
        let err = AuthError::OAuthFailed("invalid code".into());
        assert_eq!(err.to_string(), "oauth failed: invalid code");
    }

    #[test]
    fn display_unknown() {
        let err = AuthError::Unknown(anyhow::anyhow!("something broke"));
        assert_eq!(err.to_string(), "unknown auth error: something broke");
    }

    #[test]
    fn source_returns_none_for_non_unknown() {
        use std::error::Error;
        let err = AuthError::InvalidToken("x".into());
        assert!(err.source().is_none());
    }

    #[test]
    fn source_returns_some_for_unknown() {
        use std::error::Error;
        let err = AuthError::Unknown(anyhow::anyhow!("inner"));
        assert!(err.source().is_some());
    }
}
