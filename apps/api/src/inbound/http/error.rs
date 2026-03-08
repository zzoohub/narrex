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

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::to_bytes;

    // ---- ProblemDetail status & type ----

    fn assert_problem(err: ApiError, expected_status: u16, expected_slug: &str) {
        let (status, pd) = err.to_problem_detail();
        assert_eq!(status.as_u16(), expected_status);
        assert_eq!(pd.status, expected_status);
        assert_eq!(pd.type_uri, format!("https://api.narrex.app/errors/{expected_slug}"));
    }

    #[test]
    fn problem_detail_bad_request() {
        assert_problem(ApiError::BadRequest("x".into()), 400, "bad-request");
    }

    #[test]
    fn problem_detail_unauthorized() {
        assert_problem(ApiError::Unauthorized("x".into()), 401, "unauthorized");
    }

    #[test]
    fn problem_detail_forbidden() {
        assert_problem(ApiError::Forbidden, 403, "forbidden");
    }

    #[test]
    fn problem_detail_not_found() {
        assert_problem(ApiError::NotFound("x".into()), 404, "not-found");
    }

    #[test]
    fn problem_detail_conflict() {
        assert_problem(ApiError::Conflict("x".into()), 409, "conflict");
    }

    #[test]
    fn problem_detail_unprocessable() {
        assert_problem(ApiError::UnprocessableEntity("x".into()), 422, "validation-failed");
    }

    #[test]
    fn problem_detail_too_many_requests() {
        assert_problem(ApiError::TooManyRequests, 429, "rate-limited");
    }

    #[test]
    fn problem_detail_internal() {
        assert_problem(ApiError::Internal("x".into()), 500, "internal-error");
    }

    #[test]
    fn problem_detail_internal_hides_message() {
        let (_, pd) = ApiError::Internal("secret db error".into()).to_problem_detail();
        assert!(pd.detail.is_none());
    }

    #[test]
    fn problem_detail_bad_request_shows_message() {
        let (_, pd) = ApiError::BadRequest("missing field".into()).to_problem_detail();
        assert_eq!(pd.detail.as_deref(), Some("missing field"));
    }

    #[test]
    fn problem_detail_forbidden_no_detail() {
        let (_, pd) = ApiError::Forbidden.to_problem_detail();
        assert!(pd.detail.is_none());
    }

    // ---- IntoResponse content type ----

    #[tokio::test]
    async fn into_response_sets_problem_json_content_type() {
        let resp = ApiError::NotFound("x".into()).into_response();
        assert_eq!(resp.status(), StatusCode::NOT_FOUND);
        let ct = resp.headers().get("content-type").unwrap().to_str().unwrap();
        assert_eq!(ct, "application/problem+json");
    }

    #[tokio::test]
    async fn into_response_body_is_valid_json() {
        let resp = ApiError::BadRequest("test".into()).into_response();
        let body = to_bytes(resp.into_body(), 10240).await.unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["title"], "Bad Request");
        assert_eq!(json["status"], 400);
        assert_eq!(json["detail"], "test");
        assert_eq!(json["type"], "https://api.narrex.app/errors/bad-request");
    }

    // ---- From<AuthError> ----

    #[test]
    fn from_auth_invalid_token() {
        let err: ApiError = AuthError::InvalidToken("bad".into()).into();
        assert!(matches!(err, ApiError::Unauthorized(_)));
    }

    #[test]
    fn from_auth_token_expired() {
        let err: ApiError = AuthError::TokenExpired.into();
        assert!(matches!(err, ApiError::Unauthorized(_)));
    }

    #[test]
    fn from_auth_user_not_found() {
        let err: ApiError = AuthError::UserNotFound.into();
        assert!(matches!(err, ApiError::NotFound(_)));
    }

    #[test]
    fn from_auth_oauth_failed() {
        let err: ApiError = AuthError::OAuthFailed("nope".into()).into();
        assert!(matches!(err, ApiError::BadRequest(_)));
    }

    // ---- From<ProjectError> ----

    #[test]
    fn from_project_not_found() {
        let err: ApiError = ProjectError::NotFound.into();
        assert!(matches!(err, ApiError::NotFound(_)));
    }

    #[test]
    fn from_project_forbidden() {
        let err: ApiError = ProjectError::Forbidden.into();
        assert!(matches!(err, ApiError::Forbidden));
    }

    // ---- From<TimelineError> ----

    #[test]
    fn from_timeline_track_not_found() {
        let err: ApiError = TimelineError::TrackNotFound.into();
        assert!(matches!(err, ApiError::NotFound(_)));
    }

    #[test]
    fn from_timeline_track_has_scenes() {
        let err: ApiError = TimelineError::TrackHasScenes.into();
        assert!(matches!(err, ApiError::Conflict(_)));
    }

    #[test]
    fn from_timeline_connection_exists() {
        let err: ApiError = TimelineError::ConnectionExists.into();
        assert!(matches!(err, ApiError::Conflict(_)));
    }

    #[test]
    fn from_timeline_invalid_position() {
        let err: ApiError = TimelineError::InvalidPosition("bad".into()).into();
        assert!(matches!(err, ApiError::UnprocessableEntity(_)));
    }

    // ---- From<CharacterError> ----

    #[test]
    fn from_character_not_found() {
        let err: ApiError = CharacterError::NotFound.into();
        assert!(matches!(err, ApiError::NotFound(_)));
    }

    #[test]
    fn from_character_relationship_exists() {
        let err: ApiError = CharacterError::RelationshipExists.into();
        assert!(matches!(err, ApiError::Conflict(_)));
    }

    // ---- From<AiError> ----

    #[test]
    fn from_ai_rate_limited() {
        let err: ApiError = AiError::RateLimited.into();
        assert!(matches!(err, ApiError::TooManyRequests));
    }

    #[test]
    fn from_ai_generation_failed() {
        let err: ApiError = AiError::GenerationFailed("timeout".into()).into();
        assert!(matches!(err, ApiError::Internal(_)));
    }

    #[test]
    fn from_ai_draft_not_found() {
        let err: ApiError = AiError::DraftNotFound.into();
        assert!(matches!(err, ApiError::NotFound(_)));
    }

    // ---- Display ----

    #[test]
    fn display_all_variants() {
        assert_eq!(ApiError::BadRequest("x".into()).to_string(), "bad request: x");
        assert_eq!(ApiError::Unauthorized("x".into()).to_string(), "unauthorized: x");
        assert_eq!(ApiError::Forbidden.to_string(), "forbidden");
        assert_eq!(ApiError::NotFound("x".into()).to_string(), "not found: x");
        assert_eq!(ApiError::Conflict("x".into()).to_string(), "conflict: x");
        assert_eq!(ApiError::UnprocessableEntity("x".into()).to_string(), "unprocessable entity: x");
        assert_eq!(ApiError::TooManyRequests.to_string(), "too many requests");
        assert_eq!(ApiError::Internal("x".into()).to_string(), "internal server error: x");
    }
}
