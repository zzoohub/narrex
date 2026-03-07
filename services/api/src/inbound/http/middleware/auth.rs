use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use jsonwebtoken::{decode, DecodingKey, Validation};
use uuid::Uuid;

use crate::inbound::http::error::ApiError;
use crate::inbound::http::server::AppState;
use crate::outbound::jwt::Claims;

/// Authenticated user extracted from the `Authorization: Bearer <token>` header.
///
/// Implements `FromRequestParts` so it can be used as an extractor in handlers.
/// Any route that includes `AuthUser` in its arguments requires a valid JWT.
#[derive(Debug, Clone)]
pub struct AuthUser {
    pub user_id: Uuid,
}

impl FromRequestParts<AppState> for AuthUser {
    type Rejection = ApiError;

    fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> impl std::future::Future<Output = Result<Self, Self::Rejection>> + Send {
        async move {
            let header = parts
                .headers
                .get(axum::http::header::AUTHORIZATION)
                .and_then(|v| v.to_str().ok())
                .ok_or_else(|| ApiError::Unauthorized("missing Authorization header".into()))?;

            let token = header
                .strip_prefix("Bearer ")
                .ok_or_else(|| ApiError::Unauthorized("invalid Authorization scheme".into()))?;

            let decoding_key = DecodingKey::from_secret(state.jwt_secret.as_bytes());
            let mut validation = Validation::default();
            validation.validate_exp = true;

            let token_data = decode::<Claims>(token, &decoding_key, &validation).map_err(
                |e| match e.kind() {
                    jsonwebtoken::errors::ErrorKind::ExpiredSignature => {
                        ApiError::Unauthorized("token expired".into())
                    }
                    _ => ApiError::Unauthorized(format!("invalid token: {e}")),
                },
            )?;

            if token_data.claims.kind != "access" {
                return Err(ApiError::Unauthorized("not an access token".into()));
            }

            let user_id = token_data
                .claims
                .sub
                .parse::<Uuid>()
                .map_err(|_| ApiError::Unauthorized("invalid user_id in token".into()))?;

            Ok(AuthUser { user_id })
        }
    }
}
