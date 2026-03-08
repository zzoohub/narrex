use uuid::Uuid;

use super::error::AuthError;
use super::models::{AuthTokens, GoogleUserInfo, UpdateProfile, User};
use super::ports::{TokenService, UserRepository};

#[derive(Clone)]
pub struct AuthServiceImpl<U: UserRepository, T: TokenService> {
    user_repo: U,
    token_svc: T,
}

impl<U: UserRepository, T: TokenService> AuthServiceImpl<U, T> {
    pub fn new(user_repo: U, token_svc: T) -> Self {
        Self {
            user_repo,
            token_svc,
        }
    }

    /// Handle Google OAuth callback: upsert user from Google info, issue tokens.
    pub async fn google_callback(
        &self,
        google_info: GoogleUserInfo,
    ) -> Result<(User, AuthTokens, String), AuthError> {
        let user = self.user_repo.upsert_from_google(&google_info).await?;
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
        self.user_repo.delete_user(user_id).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use std::sync::Mutex;

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

        async fn upsert_from_google(&self, _info: &GoogleUserInfo) -> Result<User, AuthError> {
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
        let svc = AuthServiceImpl::new(repo, token_svc);

        let info = GoogleUserInfo {
            google_id: "google123".into(),
            email: "test@example.com".into(),
            name: Some("Test".into()),
            picture: None,
        };

        let (returned_user, tokens, refresh) = svc.google_callback(info).await.unwrap();
        assert_eq!(returned_user.id, user_id);
        assert!(tokens.access_token.contains(&user_id.to_string()));
        assert!(refresh.contains(&user_id.to_string()));
        assert_eq!(tokens.expires_in, 900);
    }

    #[tokio::test]
    async fn google_callback_upsert_fails() {
        let repo = MockUserRepo::failing(AuthError::OAuthFailed("bad code".into()));
        let token_svc = MockTokenSvc::new(Uuid::new_v4());
        let svc = AuthServiceImpl::new(repo, token_svc);

        let info = GoogleUserInfo {
            google_id: "g".into(),
            email: "e@e.com".into(),
            name: None,
            picture: None,
        };

        let result = svc.google_callback(info).await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), AuthError::OAuthFailed(_)));
    }

    #[tokio::test]
    async fn refresh_tokens_success() {
        let user_id = Uuid::new_v4();
        let repo = MockUserRepo::with_user(make_user(user_id));
        let token_svc = MockTokenSvc::new(user_id);
        let svc = AuthServiceImpl::new(repo, token_svc);

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
        let svc = AuthServiceImpl::new(repo, token_svc);

        let result = svc.refresh_tokens("bad-token").await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), AuthError::InvalidToken(_)));
    }

    #[tokio::test]
    async fn verify_token_success() {
        let user_id = Uuid::new_v4();
        let repo = MockUserRepo::with_user(make_user(user_id));
        let token_svc = MockTokenSvc::new(user_id);
        let svc = AuthServiceImpl::new(repo, token_svc);

        let result = svc.verify_token("valid-token").await.unwrap();
        assert_eq!(result, user_id);
    }

    #[tokio::test]
    async fn verify_token_expired() {
        let user_id = Uuid::new_v4();
        let repo = MockUserRepo::with_user(make_user(user_id));
        let token_svc = MockTokenSvc::new(user_id)
            .with_verify_access_err(AuthError::TokenExpired);
        let svc = AuthServiceImpl::new(repo, token_svc);

        let result = svc.verify_token("expired-token").await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), AuthError::TokenExpired));
    }

    #[tokio::test]
    async fn get_user_not_found() {
        let user_id = Uuid::new_v4();
        let repo = MockUserRepo::new_empty();
        let token_svc = MockTokenSvc::new(user_id);
        let svc = AuthServiceImpl::new(repo, token_svc);

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
        let svc = AuthServiceImpl::new(repo, token_svc);

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
        let svc = AuthServiceImpl::new(repo, token_svc);

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
        let svc = AuthServiceImpl::new(repo, token_svc);

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
        let svc = AuthServiceImpl::new(repo.clone(), token_svc);

        let result = svc.delete_account(user_id).await;
        assert!(result.is_ok());
        assert!(*repo.delete_called.lock().unwrap());
    }

    #[tokio::test]
    async fn delete_account_user_not_found() {
        let user_id = Uuid::new_v4();
        let repo = MockUserRepo::new_empty();
        let token_svc = MockTokenSvc::new(user_id);
        let svc = AuthServiceImpl::new(repo, token_svc);

        let result = svc.delete_account(user_id).await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), AuthError::UserNotFound));
    }
}
