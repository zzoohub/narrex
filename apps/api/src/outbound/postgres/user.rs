use chrono::{DateTime, Utc};
use sqlx::FromRow;
use uuid::Uuid;

use crate::domain::auth::error::AuthError;
use crate::domain::auth::models::{GoogleUserInfo, UpdateProfile, User};
use crate::domain::auth::ports::UserRepository;

use super::Postgres;

#[derive(FromRow)]
struct UserRow {
    id: Uuid,
    google_id: String,
    email: String,
    display_name: Option<String>,
    profile_image_url: Option<String>,
    theme_preference: String,
    language_preference: String,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

impl UserRow {
    fn into_domain(self) -> User {
        User {
            id: self.id,
            google_id: self.google_id,
            email: self.email,
            display_name: self.display_name,
            profile_image_url: self.profile_image_url,
            theme_preference: self.theme_preference,
            language_preference: self.language_preference,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

#[async_trait::async_trait]
impl UserRepository for Postgres {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, AuthError> {
        let row = sqlx::query_as::<_, UserRow>(
            "SELECT id, google_id, email, display_name, profile_image_url, \
                    theme_preference, language_preference, created_at, updated_at \
             FROM user_account \
             WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(self.pool())
        .await
        .map_err(|e| AuthError::Unknown(e.into()))?;

        Ok(row.map(UserRow::into_domain))
    }

    async fn find_by_google_id(&self, google_id: &str) -> Result<Option<User>, AuthError> {
        let row = sqlx::query_as::<_, UserRow>(
            "SELECT id, google_id, email, display_name, profile_image_url, \
                    theme_preference, language_preference, created_at, updated_at \
             FROM user_account \
             WHERE google_id = $1",
        )
        .bind(google_id)
        .fetch_optional(self.pool())
        .await
        .map_err(|e| AuthError::Unknown(e.into()))?;

        Ok(row.map(UserRow::into_domain))
    }

    async fn upsert_from_google(
        &self,
        info: &GoogleUserInfo,
        preferred_locale: &str,
    ) -> Result<User, AuthError> {
        let row = sqlx::query_as::<_, UserRow>(
            "INSERT INTO user_account (google_id, email, display_name, profile_image_url, language_preference) \
             VALUES ($1, $2, $3, $4, $5) \
             ON CONFLICT (google_id) DO UPDATE SET \
                 email = EXCLUDED.email, \
                 display_name = EXCLUDED.display_name, \
                 profile_image_url = EXCLUDED.profile_image_url \
             RETURNING id, google_id, email, display_name, profile_image_url, \
                       theme_preference, language_preference, created_at, updated_at",
        )
        .bind(&info.google_id)
        .bind(&info.email)
        .bind(&info.name)
        .bind(&info.picture)
        .bind(preferred_locale)
        .fetch_one(self.pool())
        .await
        .map_err(|e| AuthError::Unknown(e.into()))?;

        Ok(row.into_domain())
    }

    async fn update_profile(&self, id: Uuid, update: &UpdateProfile) -> Result<User, AuthError> {
        let row = sqlx::query_as::<_, UserRow>(
            "UPDATE user_account SET \
                display_name = CASE WHEN $2 THEN $3 ELSE display_name END, \
                profile_image_url = CASE WHEN $4 THEN $5 ELSE profile_image_url END, \
                theme_preference = CASE WHEN $6 THEN $7 ELSE theme_preference END, \
                language_preference = CASE WHEN $8 THEN $9 ELSE language_preference END \
             WHERE id = $1 \
             RETURNING id, google_id, email, display_name, profile_image_url, \
                       theme_preference, language_preference, created_at, updated_at",
        )
        .bind(id)
        .bind(update.display_name.is_some())
        .bind(update.display_name.as_ref().and_then(|v| v.as_deref()))
        .bind(update.profile_image_url.is_some())
        .bind(update.profile_image_url.as_ref().and_then(|v| v.as_deref()))
        .bind(update.theme_preference.is_some())
        .bind(update.theme_preference.as_deref())
        .bind(update.language_preference.is_some())
        .bind(update.language_preference.as_deref())
        .fetch_one(self.pool())
        .await
        .map_err(|e| AuthError::Unknown(e.into()))?;

        Ok(row.into_domain())
    }

    async fn delete_user(&self, id: Uuid) -> Result<(), AuthError> {
        // Delete generation_log first (has user_id FK but isn't CASCADE)
        sqlx::query("DELETE FROM generation_log WHERE user_id = $1")
            .bind(id)
            .execute(self.pool())
            .await
            .map_err(|e| AuthError::Unknown(e.into()))?;

        // Delete projects (CASCADE handles tracks, scenes, characters, etc.)
        sqlx::query("DELETE FROM project WHERE user_id = $1")
            .bind(id)
            .execute(self.pool())
            .await
            .map_err(|e| AuthError::Unknown(e.into()))?;

        // Delete user
        let result = sqlx::query("DELETE FROM user_account WHERE id = $1")
            .bind(id)
            .execute(self.pool())
            .await
            .map_err(|e| AuthError::Unknown(e.into()))?;

        if result.rows_affected() == 0 {
            return Err(AuthError::UserNotFound);
        }
        Ok(())
    }
}
