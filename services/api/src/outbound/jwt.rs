use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::domain::auth::error::AuthError;
use crate::domain::auth::models::AuthTokens;
use crate::domain::auth::ports::TokenService;

/// JWT claims embedded in access and refresh tokens.
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    /// Subject: the user ID.
    pub sub: String,
    /// Expiration time (Unix timestamp).
    pub exp: usize,
    /// Issued at (Unix timestamp).
    pub iat: usize,
    /// Token kind: `access` or `refresh`.
    pub kind: String,
}

/// Concrete implementation of `TokenService` using the `jsonwebtoken` crate.
#[derive(Clone)]
pub struct JwtTokenService {
    secret: String,
}

impl JwtTokenService {
    pub fn new(secret: &str) -> Self {
        Self {
            secret: secret.to_string(),
        }
    }

    fn encoding_key(&self) -> EncodingKey {
        EncodingKey::from_secret(self.secret.as_bytes())
    }

    fn decoding_key(&self) -> DecodingKey {
        DecodingKey::from_secret(self.secret.as_bytes())
    }

    fn encode_token(&self, user_id: Uuid, kind: &str, ttl: Duration) -> Result<String, AuthError> {
        let now = Utc::now();
        let exp = (now + ttl).timestamp() as usize;
        let iat = now.timestamp() as usize;

        let claims = Claims {
            sub: user_id.to_string(),
            exp,
            iat,
            kind: kind.to_string(),
        };

        encode(&Header::default(), &claims, &self.encoding_key())
            .map_err(|e| AuthError::Unknown(anyhow::anyhow!("failed to encode JWT: {e}")))
    }

    fn verify_token(&self, token: &str, expected_kind: &str) -> Result<Uuid, AuthError> {
        let mut validation = Validation::default();
        validation.validate_exp = true;

        let token_data = decode::<Claims>(token, &self.decoding_key(), &validation)
            .map_err(|e| match e.kind() {
                jsonwebtoken::errors::ErrorKind::ExpiredSignature => AuthError::TokenExpired,
                _ => AuthError::InvalidToken(e.to_string()),
            })?;

        if token_data.claims.kind != expected_kind {
            return Err(AuthError::InvalidToken(format!(
                "expected {} token, got {}",
                expected_kind, token_data.claims.kind
            )));
        }

        token_data
            .claims
            .sub
            .parse::<Uuid>()
            .map_err(|e| AuthError::InvalidToken(format!("invalid user_id in token: {e}")))
    }
}

/// Access token lifetime: 15 minutes.
const ACCESS_TOKEN_TTL: Duration = Duration::minutes(15);
/// Refresh token lifetime: 30 days.
const REFRESH_TOKEN_TTL: Duration = Duration::days(30);

#[async_trait::async_trait]
impl TokenService for JwtTokenService {
    async fn create_tokens(&self, user_id: Uuid) -> Result<AuthTokens, AuthError> {
        let access_token = self.encode_token(user_id, "access", ACCESS_TOKEN_TTL)?;
        Ok(AuthTokens {
            access_token,
            expires_in: ACCESS_TOKEN_TTL.num_seconds(),
        })
    }

    async fn verify_access_token(&self, token: &str) -> Result<Uuid, AuthError> {
        self.verify_token(token, "access")
    }

    async fn create_refresh_token(&self, user_id: Uuid) -> Result<String, AuthError> {
        self.encode_token(user_id, "refresh", REFRESH_TOKEN_TTL)
    }

    async fn verify_refresh_token(&self, token: &str) -> Result<Uuid, AuthError> {
        self.verify_token(token, "refresh")
    }
}
