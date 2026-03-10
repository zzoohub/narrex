use uuid::Uuid;

use super::error::AuthError;
use super::models::{AuthTokens, GoogleUserInfo, UpdateProfile, User};

#[async_trait::async_trait]
pub trait UserRepository: Clone + Send + Sync + 'static {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, AuthError>;
    async fn find_by_google_id(&self, google_id: &str) -> Result<Option<User>, AuthError>;
    async fn upsert_from_google(&self, info: &GoogleUserInfo, preferred_locale: &str) -> Result<User, AuthError>;
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

#[async_trait::async_trait]
pub trait AvatarStorage: Clone + Send + Sync + 'static {
    async fn upload_avatar(
        &self,
        user_id: Uuid,
        content_type: &str,
        data: Vec<u8>,
    ) -> Result<String, AuthError>;

    /// Delete all avatar files for a user (best-effort, ignores missing files).
    async fn delete_avatar(&self, user_id: Uuid) -> Result<(), AuthError>;
}

// ---------------------------------------------------------------------------
// Inbound port: AuthService (used by HTTP handlers)
// ---------------------------------------------------------------------------

#[async_trait::async_trait]
pub trait AuthService: Send + Sync {
    async fn google_callback(&self, google_info: GoogleUserInfo, preferred_locale: &str) -> Result<(User, AuthTokens, String), AuthError>;
    async fn refresh_tokens(&self, refresh_token: &str) -> Result<(AuthTokens, String), AuthError>;
    async fn verify_token(&self, token: &str) -> Result<Uuid, AuthError>;
    async fn get_user(&self, user_id: Uuid) -> Result<User, AuthError>;
    async fn update_profile(&self, user_id: Uuid, update: &UpdateProfile) -> Result<User, AuthError>;
    async fn delete_account(&self, user_id: Uuid) -> Result<(), AuthError>;
    async fn upload_avatar(&self, user_id: Uuid, content_type: &str, data: Vec<u8>) -> Result<User, AuthError>;
    async fn test_login(&self, email: &str, name: Option<&str>) -> Result<(User, AuthTokens, String), AuthError>;
}
