use uuid::Uuid;

use super::error::AuthError;
use super::models::{AuthTokens, GoogleUserInfo, UpdateProfile, User};

#[async_trait::async_trait]
pub trait UserRepository: Clone + Send + Sync + 'static {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, AuthError>;
    async fn find_by_google_id(&self, google_id: &str) -> Result<Option<User>, AuthError>;
    async fn upsert_from_google(&self, info: &GoogleUserInfo) -> Result<User, AuthError>;
    async fn update_profile(&self, id: Uuid, update: &UpdateProfile) -> Result<User, AuthError>;
    async fn delete_user(&self, id: Uuid) -> Result<(), AuthError>;
}

#[async_trait::async_trait]
pub trait TokenService: Clone + Send + Sync + 'static {
    async fn create_tokens(&self, user_id: Uuid) -> Result<AuthTokens, AuthError>;
    async fn verify_access_token(&self, token: &str) -> Result<Uuid, AuthError>;
    async fn create_refresh_token(&self, user_id: Uuid) -> Result<String, AuthError>;
    async fn verify_refresh_token(&self, token: &str) -> Result<Uuid, AuthError>;
}
