use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;

use crate::domain::ai::error::AiError;
use crate::domain::auth::error::AuthError;
use crate::domain::character::error::CharacterError;
use crate::domain::project::error::ProjectError;
use crate::domain::timeline::error::TimelineError;

// ---------------------------------------------------------------------------
// ApiError
// ---------------------------------------------------------------------------

#[derive(Debug)]
pub enum ApiError {
    BadRequest(String),
    Unauthorized(String),
    Forbidden,
    NotFound(String),
    Conflict(String),
    UnprocessableEntity(String),
    TooManyRequests,
    Internal(String),
}

impl std::fmt::Display for ApiError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::BadRequest(msg) => write!(f, "bad request: {msg}"),
            Self::Unauthorized(msg) => write!(f, "unauthorized: {msg}"),
            Self::Forbidden => write!(f, "forbidden"),
            Self::NotFound(msg) => write!(f, "not found: {msg}"),
            Self::Conflict(msg) => write!(f, "conflict: {msg}"),
            Self::UnprocessableEntity(msg) => write!(f, "unprocessable entity: {msg}"),
            Self::TooManyRequests => write!(f, "too many requests"),
            Self::Internal(msg) => write!(f, "internal server error: {msg}"),
        }
    }
}

// ---------------------------------------------------------------------------
// RFC 9457 ProblemDetail
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProblemDetail {
    #[serde(rename = "type")]
    type_uri: String,
    title: String,
    status: u16,
    #[serde(skip_serializing_if = "Option::is_none")]
    detail: Option<String>,
}

impl ApiError {
    fn to_problem_detail(&self) -> (StatusCode, ProblemDetail) {
        let (status, type_slug, title, detail) = match self {
            Self::BadRequest(msg) => (
                StatusCode::BAD_REQUEST,
                "bad-request",
                "Bad Request",
                Some(msg.clone()),
            ),
            Self::Unauthorized(msg) => (
                StatusCode::UNAUTHORIZED,
                "unauthorized",
                "Unauthorized",
                Some(msg.clone()),
            ),
            Self::Forbidden => (
                StatusCode::FORBIDDEN,
                "forbidden",
                "Forbidden",
                None,
            ),
            Self::NotFound(msg) => (
                StatusCode::NOT_FOUND,
                "not-found",
                "Not Found",
                Some(msg.clone()),
            ),
            Self::Conflict(msg) => (
                StatusCode::CONFLICT,
                "conflict",
                "Conflict",
                Some(msg.clone()),
            ),
            Self::UnprocessableEntity(msg) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                "validation-failed",
                "Validation Failed",
                Some(msg.clone()),
            ),
            Self::TooManyRequests => (
                StatusCode::TOO_MANY_REQUESTS,
                "rate-limited",
                "Too Many Requests",
                None,
            ),
            Self::Internal(msg) => {
                tracing::error!(error = %msg, "internal server error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "internal-error",
                    "Internal Server Error",
                    None, // Don't leak internal details.
                )
            }
        };

        let pd = ProblemDetail {
            type_uri: format!("https://api.narrex.app/errors/{type_slug}"),
            title: title.to_string(),
            status: status.as_u16(),
            detail,
        };

        (status, pd)
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, pd) = self.to_problem_detail();
        let mut response = (status, Json(pd)).into_response();
        response.headers_mut().insert(
            axum::http::header::CONTENT_TYPE,
            "application/problem+json"
                .parse()
                .expect("valid header value"),
        );
        response
    }
}

// ---------------------------------------------------------------------------
// From<DomainError> for ApiError
// ---------------------------------------------------------------------------

impl From<AuthError> for ApiError {
    fn from(err: AuthError) -> Self {
        match err {
            AuthError::InvalidToken(msg) => Self::Unauthorized(msg),
            AuthError::TokenExpired => Self::Unauthorized("token expired".into()),
            AuthError::UserNotFound => Self::NotFound("user not found".into()),
            AuthError::OAuthFailed(msg) => Self::BadRequest(msg),
            AuthError::Unknown(err) => Self::Internal(err.to_string()),
        }
    }
}

impl From<ProjectError> for ApiError {
    fn from(err: ProjectError) -> Self {
        match err {
            ProjectError::NotFound => Self::NotFound("project not found".into()),
            ProjectError::Forbidden => Self::Forbidden,
            ProjectError::Unknown(err) => Self::Internal(err.to_string()),
        }
    }
}

impl From<TimelineError> for ApiError {
    fn from(err: TimelineError) -> Self {
        match err {
            TimelineError::TrackNotFound => Self::NotFound("track not found".into()),
            TimelineError::SceneNotFound => Self::NotFound("scene not found".into()),
            TimelineError::ConnectionNotFound => Self::NotFound("connection not found".into()),
            TimelineError::TrackHasScenes => {
                Self::Conflict("track has scenes; delete or move them first".into())
            }
            TimelineError::ConnectionExists => {
                Self::Conflict("connection already exists".into())
            }
            TimelineError::InvalidPosition(msg) => Self::UnprocessableEntity(msg),
            TimelineError::Forbidden => Self::Forbidden,
            TimelineError::Unknown(err) => Self::Internal(err.to_string()),
        }
    }
}

impl From<CharacterError> for ApiError {
    fn from(err: CharacterError) -> Self {
        match err {
            CharacterError::NotFound => Self::NotFound("character not found".into()),
            CharacterError::RelationshipNotFound => {
                Self::NotFound("relationship not found".into())
            }
            CharacterError::RelationshipExists => {
                Self::Conflict("relationship already exists".into())
            }
            CharacterError::Forbidden => Self::Forbidden,
            CharacterError::Unknown(err) => Self::Internal(err.to_string()),
        }
    }
}

impl From<AiError> for ApiError {
    fn from(err: AiError) -> Self {
        match err {
            AiError::SceneNotFound => Self::NotFound("scene not found".into()),
            AiError::ProjectNotFound => Self::NotFound("project not found".into()),
            AiError::DraftNotFound => Self::NotFound("draft not found".into()),
            AiError::GenerationFailed(msg) => Self::Internal(msg),
            AiError::RateLimited => Self::TooManyRequests,
            AiError::Unknown(err) => Self::Internal(err.to_string()),
        }
    }
}
