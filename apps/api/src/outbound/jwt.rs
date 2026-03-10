use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
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
        let mut validation = Validation::new(Algorithm::HS256);
        validation.validate_exp = true;

        let token_data =
            decode::<Claims>(token, &self.decoding_key(), &validation).map_err(|e| {
                match e.kind() {
                    jsonwebtoken::errors::ErrorKind::ExpiredSignature => AuthError::TokenExpired,
                    _ => AuthError::InvalidToken(e.to_string()),
                }
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

#[cfg(test)]
mod tests {
    use super::*;

    const TEST_SECRET: &str = "test-secret-key-for-jwt-testing-1234";

    fn svc() -> JwtTokenService {
        JwtTokenService::new(TEST_SECRET)
    }

    // ---- Access token roundtrip ----

    #[tokio::test]
    async fn create_and_verify_access_token() {
        let s = svc();
        let user_id = Uuid::new_v4();
        let tokens = s.create_tokens(user_id).await.unwrap();
        assert_eq!(tokens.expires_in, 900); // 15 min = 900s
        let verified = s.verify_access_token(&tokens.access_token).await.unwrap();
        assert_eq!(verified, user_id);
    }

    // ---- Refresh token roundtrip ----

    #[tokio::test]
    async fn create_and_verify_refresh_token() {
        let s = svc();
        let user_id = Uuid::new_v4();
        let token = s.create_refresh_token(user_id).await.unwrap();
        let verified = s.verify_refresh_token(&token).await.unwrap();
        assert_eq!(verified, user_id);
    }

    // ---- Wrong kind rejection ----

    #[tokio::test]
    async fn access_token_rejected_as_refresh() {
        let s = svc();
        let tokens = s.create_tokens(Uuid::new_v4()).await.unwrap();
        let err = s
            .verify_refresh_token(&tokens.access_token)
            .await
            .unwrap_err();
        assert!(matches!(err, AuthError::InvalidToken(_)));
        assert!(err
            .to_string()
            .contains("expected refresh token, got access"));
    }

    #[tokio::test]
    async fn refresh_token_rejected_as_access() {
        let s = svc();
        let token = s.create_refresh_token(Uuid::new_v4()).await.unwrap();
        let err = s.verify_access_token(&token).await.unwrap_err();
        assert!(matches!(err, AuthError::InvalidToken(_)));
        assert!(err
            .to_string()
            .contains("expected access token, got refresh"));
    }

    // ---- Invalid token ----

    #[tokio::test]
    async fn garbage_token_rejected() {
        let s = svc();
        let err = s.verify_access_token("not.a.jwt").await.unwrap_err();
        assert!(matches!(err, AuthError::InvalidToken(_)));
    }

    // ---- Wrong secret ----

    #[tokio::test]
    async fn wrong_secret_rejected() {
        let s1 = JwtTokenService::new("secret-one");
        let s2 = JwtTokenService::new("secret-two");
        let tokens = s1.create_tokens(Uuid::new_v4()).await.unwrap();
        let err = s2
            .verify_access_token(&tokens.access_token)
            .await
            .unwrap_err();
        assert!(matches!(err, AuthError::InvalidToken(_)));
    }

    // ---- Expired token ----

    #[test]
    fn expired_token_rejected() {
        let s = svc();
        let user_id = Uuid::new_v4();
        // Create token with negative TTL past the 60s leeway -> already expired
        let token = s
            .encode_token(user_id, "access", Duration::seconds(-120))
            .unwrap();
        let err = s.verify_token(&token, "access").unwrap_err();
        assert!(matches!(err, AuthError::TokenExpired));
    }

    // ---- Claims encoding ----

    #[test]
    fn claims_contain_correct_kind() {
        let s = svc();
        let user_id = Uuid::new_v4();
        let token = s
            .encode_token(user_id, "access", Duration::minutes(5))
            .unwrap();

        let mut validation = Validation::default();
        validation.insecure_disable_signature_validation();
        validation.validate_exp = false;
        let data = decode::<Claims>(&token, &DecodingKey::from_secret(b""), &validation).unwrap();
        assert_eq!(data.claims.kind, "access");
        assert_eq!(data.claims.sub, user_id.to_string());
    }
}
