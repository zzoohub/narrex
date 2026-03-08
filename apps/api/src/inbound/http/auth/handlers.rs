use axum::extract::{Query, State};
use axum::http::{header, HeaderMap, StatusCode};
use axum::response::{IntoResponse, Redirect, Response};
use axum::Json;

use serde::Deserialize;

use crate::domain::auth::models::GoogleUserInfo;
use crate::inbound::http::error::ApiError;
use crate::inbound::http::middleware::auth::AuthUser;
use crate::inbound::http::response::ApiSuccess;
use crate::inbound::http::server::AppState;

use super::request::UpdateProfileRequest;
use super::response::{AuthTokensResponse, UserResponse};

// ---------------------------------------------------------------------------
// Query params
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct GoogleAuthQuery {
    pub redirect_uri: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct GoogleCallbackQuery {
    pub code: String,
    pub state: String,
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/// `GET /v1/auth/google` — redirect to Google OAuth consent screen.
pub async fn initiate_google_auth(
    State(state): State<AppState>,
    Query(query): Query<GoogleAuthQuery>,
) -> Result<Response, ApiError> {
    let redirect_uri = query
        .redirect_uri
        .unwrap_or_else(|| state.config().google_redirect_uri.clone());

    let google_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?\
         client_id={}&\
         redirect_uri={}&\
         response_type=code&\
         scope=openid%20email%20profile&\
         access_type=offline&\
         state={}",
        state.config().google_client_id,
        urlencoding::encode(&redirect_uri),
        urlencoding::encode(&state.config().web_app_url),
    );

    Ok(Redirect::temporary(&google_url).into_response())
}

/// `GET /v1/auth/google/callback` — exchange code for tokens, upsert user, redirect.
pub async fn handle_google_callback(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<GoogleCallbackQuery>,
) -> Result<Response, ApiError> {
    // Exchange the authorization code for a Google access token.
    let google_tokens = exchange_google_code(
        &query.code,
        &state.config().google_client_id,
        &state.config().google_client_secret,
        &state.config().google_redirect_uri,
    )
    .await
    .map_err(|e| {
        tracing::error!("OAuth code exchange failed: {e}");
        ApiError::BadRequest("OAuth authentication failed".into())
    })?;

    // Fetch user info from Google.
    let google_user = fetch_google_user_info(&google_tokens.access_token)
        .await
        .map_err(|e| {
            tracing::error!("failed to fetch Google user info: {e}");
            ApiError::BadRequest("OAuth authentication failed".into())
        })?;

    // Resolve preferred locale from Accept-Language header.
    let preferred_locale = headers
        .get(header::ACCEPT_LANGUAGE)
        .and_then(|v| v.to_str().ok())
        .map(resolve_preferred_locale)
        .unwrap_or_else(|| "en".into());

    // Upsert user and issue tokens.
    let (_user, tokens, refresh_token) = state
        .auth_service()
        .google_callback(google_user, &preferred_locale)
        .await?;

    // Validate state param matches configured web app URL to prevent open redirect.
    let expected_web_url = &state.config().web_app_url;
    if query.state != *expected_web_url {
        return Err(ApiError::BadRequest("invalid OAuth state parameter".into()));
    }
    let web_url = expected_web_url;

    let redirect_url = format!(
        "{}?accessToken={}&expiresIn={}",
        web_url, tokens.access_token, tokens.expires_in,
    );

    // Set httpOnly refresh token cookie.
    let cookie = format!(
        "refresh_token={}; HttpOnly; Secure; SameSite=Lax; Path=/v1/auth; Max-Age={}",
        refresh_token,
        30 * 24 * 60 * 60, // 30 days
    );

    let mut response = Redirect::temporary(&redirect_url).into_response();
    response.headers_mut().insert(
        header::SET_COOKIE,
        cookie.parse().expect("valid cookie header"),
    );

    Ok(response)
}

/// `POST /v1/auth/refresh` — refresh access token using httpOnly cookie.
pub async fn refresh_token(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
) -> Result<Response, ApiError> {
    let cookie_header = headers
        .get(header::COOKIE)
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| ApiError::Unauthorized("missing refresh token cookie".into()))?;

    let refresh_token = cookie_header
        .split(';')
        .filter_map(|c| {
            let c = c.trim();
            c.strip_prefix("refresh_token=")
        })
        .next()
        .ok_or_else(|| ApiError::Unauthorized("missing refresh_token cookie".into()))?;

    let (tokens, new_refresh) = state.auth_service().refresh_tokens(refresh_token).await?;

    // Rotate refresh token: issue new cookie replacing the old one.
    let cookie = format!(
        "refresh_token={}; HttpOnly; Secure; SameSite=Lax; Path=/v1/auth; Max-Age={}",
        new_refresh,
        30 * 24 * 60 * 60, // 30 days
    );

    let mut response = ApiSuccess::new(AuthTokensResponse::from(&tokens)).into_response();
    response.headers_mut().insert(
        header::SET_COOKIE,
        cookie.parse().expect("valid cookie header"),
    );

    Ok(response)
}

/// `POST /v1/auth/logout` — clear refresh token cookie.
pub async fn logout() -> Response {
    let cookie =
        "refresh_token=; HttpOnly; Secure; SameSite=Lax; Path=/v1/auth; Max-Age=0";
    let mut response = StatusCode::NO_CONTENT.into_response();
    response.headers_mut().insert(
        header::SET_COOKIE,
        cookie.parse().expect("valid cookie header"),
    );
    response
}

/// `GET /v1/auth/me` — get current authenticated user.
pub async fn get_current_user(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<ApiSuccess<UserResponse>, ApiError> {
    let user = state.auth_service().get_user(auth.user_id).await?;
    Ok(ApiSuccess::new(UserResponse::from(&user)))
}

/// `PATCH /v1/auth/me` — update current user's profile.
pub async fn update_profile(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(body): Json<UpdateProfileRequest>,
) -> Result<ApiSuccess<UserResponse>, ApiError> {
    let update = body.into();
    let user = state
        .auth_service()
        .update_profile(auth.user_id, &update)
        .await?;
    Ok(ApiSuccess::new(UserResponse::from(&user)))
}

/// `POST /v1/auth/me/avatar` — upload profile avatar image.
pub async fn upload_avatar(
    State(state): State<AppState>,
    auth: AuthUser,
    mut multipart: axum::extract::Multipart,
) -> Result<ApiSuccess<UserResponse>, ApiError> {
    let mut file_data: Option<(String, Vec<u8>)> = None;

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        ApiError::BadRequest(format!("invalid multipart: {e}"))
    })? {
        if field.name() == Some("avatar") {
            let content_type = field
                .content_type()
                .unwrap_or("application/octet-stream")
                .to_string();

            // Validate content type.
            if !["image/jpeg", "image/png", "image/webp"].contains(&content_type.as_str()) {
                return Err(ApiError::BadRequest(
                    "unsupported image format (use JPEG, PNG, or WebP)".into(),
                ));
            }

            let data = field.bytes().await.map_err(|e| {
                ApiError::BadRequest(format!("failed to read file: {e}"))
            })?;

            file_data = Some((content_type, data.to_vec()));
        }
    }

    let (content_type, data) = file_data
        .ok_or_else(|| ApiError::BadRequest("missing 'avatar' field".into()))?;

    let user = state
        .auth_service()
        .upload_avatar(auth.user_id, &content_type, data)
        .await?;

    Ok(ApiSuccess::new(UserResponse::from(&user)))
}

/// `DELETE /v1/auth/me` — delete user account and all data.
pub async fn delete_account(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Response, ApiError> {
    state.auth_service().delete_account(auth.user_id).await?;

    // Clear refresh token cookie
    let cookie = "refresh_token=; HttpOnly; Secure; SameSite=Lax; Path=/v1/auth; Max-Age=0";
    let mut response = StatusCode::NO_CONTENT.into_response();
    response.headers_mut().insert(
        header::SET_COOKIE,
        cookie.parse().expect("valid cookie header"),
    );

    Ok(response)
}

// ---------------------------------------------------------------------------
// Google OAuth helpers
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
struct GoogleTokenResponse {
    access_token: String,
}

async fn exchange_google_code(
    code: &str,
    client_id: &str,
    client_secret: &str,
    redirect_uri: &str,
) -> anyhow::Result<GoogleTokenResponse> {
    let client = reqwest::Client::new();
    let resp = client
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("code", code),
            ("client_id", client_id),
            ("client_secret", client_secret),
            ("redirect_uri", redirect_uri),
            ("grant_type", "authorization_code"),
        ])
        .send()
        .await?;

    if !resp.status().is_success() {
        let text = resp.text().await.unwrap_or_default();
        anyhow::bail!("Google token exchange failed: {text}");
    }

    Ok(resp.json().await?)
}

#[derive(Debug, Deserialize)]
struct GoogleUserInfoResponse {
    sub: String,
    email: String,
    name: Option<String>,
    picture: Option<String>,
}

/// Parse `Accept-Language` header and resolve to a supported locale (`ko` or `en`).
/// Falls back to `"en"` when no supported language is found.
fn resolve_preferred_locale(accept_language: &str) -> String {
    const SUPPORTED: &[&str] = &["ko", "en"];

    let mut entries: Vec<(&str, f32)> = accept_language
        .split(',')
        .filter_map(|part| {
            let part = part.trim();
            let (lang, quality) = if let Some((l, q)) = part.split_once(";q=") {
                (l.trim(), q.trim().parse::<f32>().unwrap_or(0.0))
            } else {
                (part, 1.0)
            };
            let primary = lang.split('-').next()?;
            Some((primary, quality))
        })
        .collect();

    entries.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

    for (lang, _) in entries {
        if SUPPORTED.contains(&lang) {
            return lang.to_string();
        }
    }

    "en".to_string()
}

async fn fetch_google_user_info(access_token: &str) -> anyhow::Result<GoogleUserInfo> {
    let client = reqwest::Client::new();
    let resp: GoogleUserInfoResponse = client
        .get("https://www.googleapis.com/oauth2/v3/userinfo")
        .bearer_auth(access_token)
        .send()
        .await?
        .json()
        .await?;

    Ok(GoogleUserInfo {
        google_id: resp.sub,
        email: resp.email,
        name: resp.name,
        picture: resp.picture,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolve_korean_primary() {
        assert_eq!(resolve_preferred_locale("ko-KR,ko;q=0.9,en;q=0.8"), "ko");
    }

    #[test]
    fn resolve_english_primary() {
        assert_eq!(resolve_preferred_locale("en-US,en;q=0.9,ko;q=0.8"), "en");
    }

    #[test]
    fn resolve_korean_by_quality() {
        assert_eq!(
            resolve_preferred_locale("en;q=0.7,ko;q=0.9"),
            "ko"
        );
    }

    #[test]
    fn resolve_unsupported_falls_back_to_en() {
        assert_eq!(resolve_preferred_locale("fr-FR,de;q=0.9"), "en");
    }

    #[test]
    fn resolve_wildcard_falls_back_to_en() {
        assert_eq!(resolve_preferred_locale("*"), "en");
    }

    #[test]
    fn resolve_empty_falls_back_to_en() {
        assert_eq!(resolve_preferred_locale(""), "en");
    }

    #[test]
    fn resolve_bare_ko() {
        assert_eq!(resolve_preferred_locale("ko"), "ko");
    }

    #[test]
    fn resolve_bare_en() {
        assert_eq!(resolve_preferred_locale("en"), "en");
    }

    #[test]
    fn resolve_mixed_with_unsupported_picks_first_supported() {
        assert_eq!(
            resolve_preferred_locale("ja,zh;q=0.9,ko;q=0.8,en;q=0.7"),
            "ko"
        );
    }
}
