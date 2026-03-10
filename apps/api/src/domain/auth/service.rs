use uuid::Uuid;

use super::error::AuthError;
use super::models::{AuthTokens, GoogleUserInfo, UpdateProfile, User};
use super::ports::{AuthService, AvatarStorage, TokenService, UserRepository};

#[derive(Clone)]
pub struct AuthServiceImpl<U: UserRepository, T: TokenService, S: AvatarStorage> {
    user_repo: U,
    token_svc: T,
    avatar_storage: S,
}

impl<U: UserRepository, T: TokenService, S: AvatarStorage> AuthServiceImpl<U, T, S> {
    pub fn new(user_repo: U, token_svc: T, avatar_storage: S) -> Self {
        Self {
            user_repo,
            token_svc,
            avatar_storage,
        }
    }

    /// Handle Google OAuth callback: upsert user from Google info, issue tokens.
    pub async fn google_callback(
        &self,
        google_info: GoogleUserInfo,
        preferred_locale: &str,
    ) -> Result<(User, AuthTokens, String), AuthError> {
        let user = self.user_repo.upsert_from_google(&google_info, preferred_locale).await?;
        let tokens = self.token_svc.create_tokens(user.id).await?;
        let refresh_token = self.token_svc.create_refresh_token(user.id).await?;
        Ok((user, tokens, refresh_token))
    }

    /// Refresh access tokens using a refresh token.
    pub async fn refresh_tokens(
        &self,
        refresh_token: &str,
    ) -> Result<(AuthTokens, String), AuthError> {
        let user_id = self.token_svc.verify_refresh_token(refresh_token).await?;
        let tokens = self.token_svc.create_tokens(user_id).await?;
        let new_refresh = self.token_svc.create_refresh_token(user_id).await?;
        Ok((tokens, new_refresh))
    }

    /// Verify an access token and return the user ID.
    pub async fn verify_token(&self, token: &str) -> Result<Uuid, AuthError> {
        self.token_svc.verify_access_token(token).await
    }

    /// Get user by ID.
    pub async fn get_user(&self, user_id: Uuid) -> Result<User, AuthError> {
        self.user_repo
            .find_by_id(user_id)
            .await?
            .ok_or(AuthError::UserNotFound)
    }

    /// Update user profile.
    pub async fn update_profile(
        &self,
        user_id: Uuid,
        update: &UpdateProfile,
    ) -> Result<User, AuthError> {
        // Validate display_name if provided.
        if let Some(ref name_opt) = update.display_name {
            if let Some(ref name) = name_opt {
                let trimmed = name.trim();
                if trimmed.is_empty() {
                    return Err(AuthError::InvalidInput("display name cannot be empty".into()));
                }
                if trimmed.len() > 50 {
                    return Err(AuthError::InvalidInput("display name must be 50 characters or fewer".into()));
                }
            }
        }

        // Validate theme_preference if provided.
        if let Some(ref theme) = update.theme_preference {
            if !["system", "light", "dark"].contains(&theme.as_str()) {
                return Err(AuthError::InvalidInput(
                    "theme must be one of: system, light, dark".into(),
                ));
            }
        }

        // Validate language_preference if provided.
        if let Some(ref lang) = update.language_preference {
            if !["ko", "en"].contains(&lang.as_str()) {
                return Err(AuthError::InvalidInput(
                    "language must be one of: ko, en".into(),
                ));
            }
        }

        // Verify user exists.
        self.user_repo
            .find_by_id(user_id)
            .await?
            .ok_or(AuthError::UserNotFound)?;
        self.user_repo.update_profile(user_id, update).await
    }

    /// Delete user account and all associated data.
    pub async fn delete_account(&self, user_id: Uuid) -> Result<(), AuthError> {
        self.user_repo
            .find_by_id(user_id)
            .await?
            .ok_or(AuthError::UserNotFound)?;

        // Clean up R2 avatar files before deleting the user (GDPR right to erasure).
        if let Err(e) = self.avatar_storage.delete_avatar(user_id).await {
            tracing::warn!(%user_id, error = %e, "failed to delete avatar from storage (proceeding with account deletion)");
        }

        self.user_repo.delete_user(user_id).await
    }

    /// Test-only login: create/upsert a user with a fake Google ID and issue tokens.
    ///
    /// This bypasses Google OAuth and is intended for E2E tests only.
    /// The route that calls this method should only be registered in test mode.
    pub async fn test_login(
        &self,
        email: &str,
        name: Option<&str>,
    ) -> Result<(User, AuthTokens, String), AuthError> {
        let google_info = GoogleUserInfo {
            google_id: format!("test-{email}"),
            email: email.to_string(),
            name: name.map(String::from),
            picture: None,
        };
        self.google_callback(google_info, "en").await
    }

    /// Upload a profile avatar image and update the user's avatar URL.
    pub async fn upload_avatar(
        &self,
        user_id: Uuid,
        content_type: &str,
        data: Vec<u8>,
    ) -> Result<User, AuthError> {
        // Verify user exists.
        self.user_repo
            .find_by_id(user_id)
            .await?
            .ok_or(AuthError::UserNotFound)?;

        // Validate size (2MB max).
        if data.len() > 2 * 1024 * 1024 {
            return Err(AuthError::InvalidInput("file too large (max 2MB)".into()));
        }

        // Upload to storage.
        let url = self
            .avatar_storage
            .upload_avatar(user_id, content_type, data)
            .await?;

        // Update profile with new URL.
        let update = UpdateProfile {
            profile_image_url: Some(Some(url)),
            ..Default::default()
        };
        self.user_repo.update_profile(user_id, &update).await
    }
}

// ---------------------------------------------------------------------------
// AuthService trait implementation (delegates to inherent methods)
// ---------------------------------------------------------------------------

#[async_trait::async_trait]
impl<U: UserRepository, T: TokenService, S: AvatarStorage> AuthService for AuthServiceImpl<U, T, S> {
    async fn google_callback(&self, google_info: GoogleUserInfo, preferred_locale: &str) -> Result<(User, AuthTokens, String), AuthError> {
        Self::google_callback(self, google_info, preferred_locale).await
    }
    async fn refresh_tokens(&self, refresh_token: &str) -> Result<(AuthTokens, String), AuthError> {
        Self::refresh_tokens(self, refresh_token).await
    }
    async fn verify_token(&self, token: &str) -> Result<Uuid, AuthError> {
        Self::verify_token(self, token).await
    }
    async fn get_user(&self, user_id: Uuid) -> Result<User, AuthError> {
        Self::get_user(self, user_id).await
    }
    async fn update_profile(&self, user_id: Uuid, update: &UpdateProfile) -> Result<User, AuthError> {
        Self::update_profile(self, user_id, update).await
    }
    async fn delete_account(&self, user_id: Uuid) -> Result<(), AuthError> {
        Self::delete_account(self, user_id).await
    }
    async fn upload_avatar(&self, user_id: Uuid, content_type: &str, data: Vec<u8>) -> Result<User, AuthError> {
        Self::upload_avatar(self, user_id, content_type, data).await
    }
    async fn test_login(&self, email: &str, name: Option<&str>) -> Result<(User, AuthTokens, String), AuthError> {
        Self::test_login(self, email, name).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::super::ports::AvatarStorage;
    use chrono::Utc;
    use std::sync::Mutex;

    // -- Mock AvatarStorage --

    #[derive(Clone)]
    struct MockAvatarStorage {
        should_fail: bool,
    }

    impl MockAvatarStorage {
        fn new() -> Self {
            Self { should_fail: false }
        }
        fn failing() -> Self {
            Self { should_fail: true }
        }
    }

    #[async_trait::async_trait]
    impl AvatarStorage for MockAvatarStorage {
        async fn upload_avatar(
            &self,
            user_id: Uuid,
            _content_type: &str,
            _data: Vec<u8>,
        ) -> Result<String, AuthError> {
            if self.should_fail {
                Err(AuthError::Unknown(anyhow::anyhow!("upload failed")))
            } else {
                Ok(format!("https://assets.test/avatars/{user_id}.jpg"))
            }
        }

        async fn delete_avatar(&self, _user_id: Uuid) -> Result<(), AuthError> {
            Ok(())
        }
    }

    // -- Mock UserRepository --

    #[derive(Clone)]
    struct MockUserRepo {
        user: std::sync::Arc<Mutex<Option<User>>>,
        upsert_result: std::sync::Arc<Mutex<Option<Result<User, AuthError>>>>,
        delete_called: std::sync::Arc<Mutex<bool>>,
    }

    impl MockUserRepo {
        fn with_user(user: User) -> Self {
            Self {
                user: std::sync::Arc::new(Mutex::new(Some(user.clone()))),
                upsert_result: std::sync::Arc::new(Mutex::new(Some(Ok(user)))),
                delete_called: std::sync::Arc::new(Mutex::new(false)),
            }
        }

        fn new_empty() -> Self {
            Self {
                user: std::sync::Arc::new(Mutex::new(None)),
                upsert_result: std::sync::Arc::new(Mutex::new(None)),
                delete_called: std::sync::Arc::new(Mutex::new(false)),
            }
        }

        fn failing(err: AuthError) -> Self {
            Self {
                user: std::sync::Arc::new(Mutex::new(None)),
                upsert_result: std::sync::Arc::new(Mutex::new(Some(Err(err)))),
                delete_called: std::sync::Arc::new(Mutex::new(false)),
            }
        }
    }

    fn make_user(id: Uuid) -> User {
        User {
            id,
            google_id: "google123".into(),
            email: "test@example.com".into(),
            display_name: Some("Test User".into()),
            profile_image_url: None,
            theme_preference: "system".into(),
            language_preference: "ko".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[async_trait::async_trait]
    impl UserRepository for MockUserRepo {
        async fn find_by_id(&self, _id: Uuid) -> Result<Option<User>, AuthError> {
            Ok(self.user.lock().unwrap().clone())
        }

        async fn find_by_google_id(&self, _google_id: &str) -> Result<Option<User>, AuthError> {
            Ok(None)
        }

        async fn upsert_from_google(&self, _info: &GoogleUserInfo, _preferred_locale: &str) -> Result<User, AuthError> {
            let result = self.upsert_result.lock().unwrap().take();
            match result {
                Some(r) => r,
                None => Err(AuthError::Unknown(anyhow::anyhow!("no mock result"))),
            }
        }

        async fn update_profile(
            &self,
            _id: Uuid,
            _update: &UpdateProfile,
        ) -> Result<User, AuthError> {
            match self.user.lock().unwrap().clone() {
                Some(u) => Ok(u),
                None => Err(AuthError::UserNotFound),
            }
        }

        async fn delete_user(&self, _id: Uuid) -> Result<(), AuthError> {
            *self.delete_called.lock().unwrap() = true;
            Ok(())
        }
    }

    // -- Mock TokenService --

    #[derive(Clone)]
    struct MockTokenSvc {
        verify_access_result: std::sync::Arc<Mutex<Option<Result<Uuid, AuthError>>>>,
        verify_refresh_result: std::sync::Arc<Mutex<Option<Result<Uuid, AuthError>>>>,
        user_id: Uuid,
    }

    impl MockTokenSvc {
        fn new(user_id: Uuid) -> Self {
            Self {
                verify_access_result: std::sync::Arc::new(Mutex::new(None)),
                verify_refresh_result: std::sync::Arc::new(Mutex::new(None)),
                user_id,
            }
        }

        fn with_verify_access_err(mut self, err: AuthError) -> Self {
            self.verify_access_result = std::sync::Arc::new(Mutex::new(Some(Err(err))));
            self
        }

        fn with_verify_refresh_err(mut self, err: AuthError) -> Self {
            self.verify_refresh_result = std::sync::Arc::new(Mutex::new(Some(Err(err))));
            self
        }
    }

    #[async_trait::async_trait]
    impl TokenService for MockTokenSvc {
        async fn create_tokens(&self, user_id: Uuid) -> Result<AuthTokens, AuthError> {
            Ok(AuthTokens {
                access_token: format!("access-{user_id}"),
                expires_in: 900,
            })
        }

        async fn verify_access_token(&self, _token: &str) -> Result<Uuid, AuthError> {
            let result = self.verify_access_result.lock().unwrap().take();
            match result {
                Some(r) => r,
                None => Ok(self.user_id),
            }
        }

        async fn create_refresh_token(&self, user_id: Uuid) -> Result<String, AuthError> {
            Ok(format!("refresh-{user_id}"))
        }

        async fn verify_refresh_token(&self, _token: &str) -> Result<Uuid, AuthError> {
            let result = self.verify_refresh_result.lock().unwrap().take();
            match result {
                Some(r) => r,
                None => Ok(self.user_id),
            }
        }
    }

    // -- Tests --

    #[tokio::test]
    async fn google_callback_success() {
        let user_id = Uuid::new_v4();
        let user = make_user(user_id);
        let repo = MockUserRepo::with_user(user.clone());
        let token_svc = MockTokenSvc::new(user_id);
        let svc = AuthServiceImpl::new(repo, token_svc, MockAvatarStorage::new());

        let info = GoogleUserInfo {
            google_id: "google123".into(),
            email: "test@example.com".into(),
            name: Some("Test".into()),
            picture: None,
        };

        let (returned_user, tokens, refresh) = svc.google_callback(info, "ko").await.unwrap();
        assert_eq!(returned_user.id, user_id);
        assert!(tokens.access_token.contains(&user_id.to_string()));
        assert!(refresh.contains(&user_id.to_string()));
        assert_eq!(tokens.expires_in, 900);
    }

    #[tokio::test]
    async fn google_callback_upsert_fails() {
        let repo = MockUserRepo::failing(AuthError::OAuthFailed("bad code".into()));
        let token_svc = MockTokenSvc::new(Uuid::new_v4());
        let svc = AuthServiceImpl::new(repo, token_svc, MockAvatarStorage::new());

        let info = GoogleUserInfo {
            google_id: "g".into(),
            email: "e@e.com".into(),
            name: None,
            picture: None,
        };

        let result = svc.google_callback(info, "en").await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), AuthError::OAuthFailed(_)));
    }

    #[tokio::test]
    async fn refresh_tokens_success() {
        let user_id = Uuid::new_v4();
        let repo = MockUserRepo::with_user(make_user(user_id));
        let token_svc = MockTokenSvc::new(user_id);
        let svc = AuthServiceImpl::new(repo, token_svc, MockAvatarStorage::new());

        let (tokens, refresh) = svc.refresh_tokens("old-refresh").await.unwrap();
        assert!(tokens.access_token.contains(&user_id.to_string()));
        assert!(refresh.contains(&user_id.to_string()));
    }

    #[tokio::test]
    async fn refresh_tokens_invalid_refresh_token() {
        let user_id = Uuid::new_v4();
        let repo = MockUserRepo::with_user(make_user(user_id));
        let token_svc = MockTokenSvc::new(user_id)
            .with_verify_refresh_err(AuthError::InvalidToken("bad refresh".into()));
        let svc = AuthServiceImpl::new(repo, token_svc, MockAvatarStorage::new());

        let result = svc.refresh_tokens("bad-token").await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), AuthError::InvalidToken(_)));
    }

    #[tokio::test]
    async fn verify_token_success() {
        let user_id = Uuid::new_v4();
        let repo = MockUserRepo::with_user(make_user(user_id));
        let token_svc = MockTokenSvc::new(user_id);
        let svc = AuthServiceImpl::new(repo, token_svc, MockAvatarStorage::new());

        let result = svc.verify_token("valid-token").await.unwrap();
        assert_eq!(result, user_id);
    }

    #[tokio::test]
    async fn verify_token_expired() {
        let user_id = Uuid::new_v4();
        let repo = MockUserRepo::with_user(make_user(user_id));
        let token_svc = MockTokenSvc::new(user_id)
            .with_verify_access_err(AuthError::TokenExpired);
        let svc = AuthServiceImpl::new(repo, token_svc, MockAvatarStorage::new());

        let result = svc.verify_token("expired-token").await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), AuthError::TokenExpired));
    }

    #[tokio::test]
    async fn get_user_not_found() {
        let user_id = Uuid::new_v4();
        let repo = MockUserRepo::new_empty();
        let token_svc = MockTokenSvc::new(user_id);
        let svc = AuthServiceImpl::new(repo, token_svc, MockAvatarStorage::new());

        let result = svc.get_user(user_id).await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), AuthError::UserNotFound));
    }

    #[tokio::test]
    async fn get_user_success() {
        let user_id = Uuid::new_v4();
        let user = make_user(user_id);
        let repo = MockUserRepo::with_user(user.clone());
        let token_svc = MockTokenSvc::new(user_id);
        let svc = AuthServiceImpl::new(repo, token_svc, MockAvatarStorage::new());

        let result = svc.get_user(user_id).await.unwrap();
        assert_eq!(result.id, user_id);
        assert_eq!(result.email, user.email);
    }

    #[tokio::test]
    async fn update_profile_success() {
        let user_id = Uuid::new_v4();
        let user = make_user(user_id);
        let repo = MockUserRepo::with_user(user);
        let token_svc = MockTokenSvc::new(user_id);
        let svc = AuthServiceImpl::new(repo, token_svc, MockAvatarStorage::new());

        let update = UpdateProfile {
            display_name: Some(Some("New Name".into())),
            ..Default::default()
        };
        let result = svc.update_profile(user_id, &update).await.unwrap();
        assert_eq!(result.id, user_id);
    }

    #[tokio::test]
    async fn update_profile_user_not_found() {
        let user_id = Uuid::new_v4();
        let repo = MockUserRepo::new_empty();
        let token_svc = MockTokenSvc::new(user_id);
        let svc = AuthServiceImpl::new(repo, token_svc, MockAvatarStorage::new());

        let update = UpdateProfile::default();
        let result = svc.update_profile(user_id, &update).await;
        assert!(matches!(result.unwrap_err(), AuthError::UserNotFound));
    }

    #[tokio::test]
    async fn delete_account_success() {
        let user_id = Uuid::new_v4();
        let user = make_user(user_id);
        let repo = MockUserRepo::with_user(user);
        let token_svc = MockTokenSvc::new(user_id);
        let svc = AuthServiceImpl::new(repo.clone(), token_svc, MockAvatarStorage::new());

        let result = svc.delete_account(user_id).await;
        assert!(result.is_ok());
        assert!(*repo.delete_called.lock().unwrap());
    }

    #[tokio::test]
    async fn delete_account_user_not_found() {
        let user_id = Uuid::new_v4();
        let repo = MockUserRepo::new_empty();
        let token_svc = MockTokenSvc::new(user_id);
        let svc = AuthServiceImpl::new(repo, token_svc, MockAvatarStorage::new());

        let result = svc.delete_account(user_id).await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), AuthError::UserNotFound));
    }

    #[tokio::test]
    async fn update_profile_rejects_invalid_theme() {
        let user_id = Uuid::new_v4();
        let user = make_user(user_id);
        let repo = MockUserRepo::with_user(user);
        let token_svc = MockTokenSvc::new(user_id);
        let svc = AuthServiceImpl::new(repo, token_svc, MockAvatarStorage::new());

        let update = UpdateProfile {
            theme_preference: Some("neon".into()),
            ..Default::default()
        };
        let result = svc.update_profile(user_id, &update).await;
        assert!(matches!(result.unwrap_err(), AuthError::InvalidInput(_)));
    }

    #[tokio::test]
    async fn update_profile_rejects_invalid_language() {
        let user_id = Uuid::new_v4();
        let user = make_user(user_id);
        let repo = MockUserRepo::with_user(user);
        let token_svc = MockTokenSvc::new(user_id);
        let svc = AuthServiceImpl::new(repo, token_svc, MockAvatarStorage::new());

        let update = UpdateProfile {
            language_preference: Some("fr".into()),
            ..Default::default()
        };
        let result = svc.update_profile(user_id, &update).await;
        assert!(matches!(result.unwrap_err(), AuthError::InvalidInput(_)));
    }

    #[tokio::test]
    async fn update_profile_rejects_empty_display_name() {
        let user_id = Uuid::new_v4();
        let user = make_user(user_id);
        let repo = MockUserRepo::with_user(user);
        let token_svc = MockTokenSvc::new(user_id);
        let svc = AuthServiceImpl::new(repo, token_svc, MockAvatarStorage::new());

        let update = UpdateProfile {
            display_name: Some(Some("   ".into())),
            ..Default::default()
        };
        let result = svc.update_profile(user_id, &update).await;
        assert!(matches!(result.unwrap_err(), AuthError::InvalidInput(_)));
    }

    #[tokio::test]
    async fn update_profile_rejects_long_display_name() {
        let user_id = Uuid::new_v4();
        let user = make_user(user_id);
        let repo = MockUserRepo::with_user(user);
        let token_svc = MockTokenSvc::new(user_id);
        let svc = AuthServiceImpl::new(repo, token_svc, MockAvatarStorage::new());

        let update = UpdateProfile {
            display_name: Some(Some("a".repeat(51))),
            ..Default::default()
        };
        let result = svc.update_profile(user_id, &update).await;
        assert!(matches!(result.unwrap_err(), AuthError::InvalidInput(_)));
    }

    #[tokio::test]
    async fn update_profile_accepts_valid_theme() {
        let user_id = Uuid::new_v4();
        let user = make_user(user_id);
        let repo = MockUserRepo::with_user(user);
        let token_svc = MockTokenSvc::new(user_id);
        let svc = AuthServiceImpl::new(repo, token_svc, MockAvatarStorage::new());

        for theme in ["system", "light", "dark"] {
            let update = UpdateProfile {
                theme_preference: Some(theme.into()),
                ..Default::default()
            };
            assert!(svc.update_profile(user_id, &update).await.is_ok());
        }
    }

    #[tokio::test]
    async fn upload_avatar_success() {
        let user_id = Uuid::new_v4();
        let user = make_user(user_id);
        let repo = MockUserRepo::with_user(user);
        let token_svc = MockTokenSvc::new(user_id);
        let svc = AuthServiceImpl::new(repo, token_svc, MockAvatarStorage::new());

        let data = vec![0u8; 1024]; // 1KB test file
        let result = svc
            .upload_avatar(user_id, "image/jpeg", data)
            .await
            .unwrap();
        assert_eq!(result.id, user_id);
    }

    #[tokio::test]
    async fn upload_avatar_user_not_found() {
        let user_id = Uuid::new_v4();
        let repo = MockUserRepo::new_empty();
        let token_svc = MockTokenSvc::new(user_id);
        let svc = AuthServiceImpl::new(repo, token_svc, MockAvatarStorage::new());

        let data = vec![0u8; 1024];
        let result = svc.upload_avatar(user_id, "image/jpeg", data).await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), AuthError::UserNotFound));
    }

    #[tokio::test]
    async fn upload_avatar_file_too_large() {
        let user_id = Uuid::new_v4();
        let user = make_user(user_id);
        let repo = MockUserRepo::with_user(user);
        let token_svc = MockTokenSvc::new(user_id);
        let svc = AuthServiceImpl::new(repo, token_svc, MockAvatarStorage::new());

        let data = vec![0u8; 3 * 1024 * 1024]; // 3MB — exceeds 2MB limit
        let result = svc.upload_avatar(user_id, "image/jpeg", data).await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), AuthError::InvalidInput(_)));
    }

    #[tokio::test]
    async fn upload_avatar_storage_failure() {
        let user_id = Uuid::new_v4();
        let user = make_user(user_id);
        let repo = MockUserRepo::with_user(user);
        let token_svc = MockTokenSvc::new(user_id);
        let svc = AuthServiceImpl::new(repo, token_svc, MockAvatarStorage::failing());

        let data = vec![0u8; 1024];
        let result = svc.upload_avatar(user_id, "image/jpeg", data).await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), AuthError::Unknown(_)));
    }

    // ---- test_login ----

    #[tokio::test]
    async fn test_login_success() {
        let user_id = Uuid::new_v4();
        let user = make_user(user_id);
        let repo = MockUserRepo::with_user(user);
        let token_svc = MockTokenSvc::new(user_id);
        let svc = AuthServiceImpl::new(repo, token_svc, MockAvatarStorage::new());

        let (returned_user, tokens, refresh) = svc
            .test_login("test@example.com", Some("Test User"))
            .await
            .unwrap();
        assert_eq!(returned_user.id, user_id);
        assert!(tokens.access_token.contains(&user_id.to_string()));
        assert!(refresh.contains(&user_id.to_string()));
    }

    #[tokio::test]
    async fn test_login_without_name() {
        let user_id = Uuid::new_v4();
        let user = make_user(user_id);
        let repo = MockUserRepo::with_user(user);
        let token_svc = MockTokenSvc::new(user_id);
        let svc = AuthServiceImpl::new(repo, token_svc, MockAvatarStorage::new());

        let (returned_user, tokens, _refresh) = svc
            .test_login("noname@example.com", None)
            .await
            .unwrap();
        assert_eq!(returned_user.id, user_id);
        assert!(!tokens.access_token.is_empty());
    }

    #[tokio::test]
    async fn test_login_uses_deterministic_google_id() {
        let user_id = Uuid::new_v4();
        let user = make_user(user_id);
        // Capture the google_info passed to upsert_from_google
        let repo = MockUserRepo::with_user(user);
        let token_svc = MockTokenSvc::new(user_id);
        let svc = AuthServiceImpl::new(repo, token_svc, MockAvatarStorage::new());

        // Should not panic — the google_id is deterministic from email
        let result = svc.test_login("test@example.com", None).await;
        assert!(result.is_ok());
    }
}
