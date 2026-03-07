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
