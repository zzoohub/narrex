use serde::Deserialize;

use crate::domain::auth::models::UpdateProfile;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProfileRequest {
    pub display_name: Option<Option<String>>,
    pub profile_image_url: Option<Option<String>>,
    pub theme_preference: Option<String>,
    pub language_preference: Option<String>,
}

impl From<UpdateProfileRequest> for UpdateProfile {
    fn from(r: UpdateProfileRequest) -> Self {
        Self {
            display_name: r.display_name,
            profile_image_url: r.profile_image_url,
            theme_preference: r.theme_preference,
            language_preference: r.language_preference,
        }
    }
}
