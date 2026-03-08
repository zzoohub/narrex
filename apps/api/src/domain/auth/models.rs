use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct User {
    pub id: Uuid,
    pub google_id: String,
    pub email: String,
    pub display_name: Option<String>,
    pub profile_image_url: Option<String>,
    pub theme_preference: String,
    pub language_preference: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct AuthTokens {
    pub access_token: String,
    pub expires_in: i64,
}

#[derive(Debug, Clone)]
pub struct GoogleUserInfo {
    pub google_id: String,
    pub email: String,
    pub name: Option<String>,
    pub picture: Option<String>,
}

#[derive(Debug, Clone, Default)]
pub struct UpdateProfile {
    pub display_name: Option<Option<String>>,
    pub profile_image_url: Option<Option<String>>,
    pub theme_preference: Option<String>,
    pub language_preference: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn update_profile_default_is_all_none() {
        let up = UpdateProfile::default();
        assert!(up.display_name.is_none());
        assert!(up.profile_image_url.is_none());
        assert!(up.theme_preference.is_none());
        assert!(up.language_preference.is_none());
    }

    #[test]
    fn update_profile_set_display_name() {
        let up = UpdateProfile {
            display_name: Some(Some("Alice".into())),
            ..Default::default()
        };
        assert_eq!(
            up.display_name.as_ref().unwrap().as_deref(),
            Some("Alice")
        );
    }

    #[test]
    fn update_profile_clear_display_name() {
        let up = UpdateProfile {
            display_name: Some(None),
            ..Default::default()
        };
        assert!(up.display_name.unwrap().is_none());
    }

    #[test]
    fn update_profile_set_theme_preference() {
        let up = UpdateProfile {
            theme_preference: Some("dark".into()),
            ..Default::default()
        };
        assert_eq!(up.theme_preference.as_deref(), Some("dark"));
        assert!(up.display_name.is_none());
        assert!(up.language_preference.is_none());
    }

    #[test]
    fn update_profile_set_language_preference() {
        let up = UpdateProfile {
            language_preference: Some("en".into()),
            ..Default::default()
        };
        assert_eq!(up.language_preference.as_deref(), Some("en"));
        assert!(up.display_name.is_none());
        assert!(up.theme_preference.is_none());
    }
}
