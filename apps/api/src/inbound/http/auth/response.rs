use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

use crate::domain::auth::models::{AuthTokens, User};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserResponse {
    pub id: Uuid,
    pub email: String,
    pub display_name: Option<String>,
    pub profile_image_url: Option<String>,
    pub theme_preference: String,
    pub language_preference: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<&User> for UserResponse {
    fn from(u: &User) -> Self {
        Self {
            id: u.id,
            email: u.email.clone(),
            display_name: u.display_name.clone(),
            profile_image_url: u.profile_image_url.clone(),
            theme_preference: u.theme_preference.clone(),
            language_preference: u.language_preference.clone(),
            created_at: u.created_at,
            updated_at: u.updated_at,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthTokensResponse {
    pub access_token: String,
    pub expires_in: i64,
}

impl From<&AuthTokens> for AuthTokensResponse {
    fn from(t: &AuthTokens) -> Self {
        Self {
            access_token: t.access_token.clone(),
            expires_in: t.expires_in,
        }
    }
}
