use axum::extract::{Query, State};
use axum::http::{header, HeaderMap, StatusCode};
use axum::response::{IntoResponse, Redirect, Response};
use axum::Json;

use serde::Deserialize;
use uuid::Uuid;

use crate::domain::auth::models::GoogleUserInfo;
use crate::inbound::http::error::ApiError;
use crate::inbound::http::middleware::auth::AuthUser;
use crate::inbound::http::response::ApiSuccess;
use crate::inbound::http::server::AppState;

use super::request::{TestLoginRequest, UpdateProfileRequest};
use super::response::{AuthTokensResponse, UserResponse};

// ---------------------------------------------------------------------------
// Query params
// ---------------------------------------------------------------------------

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
) -> Result<Response, ApiError> {
    let redirect_uri = &state.config().google_redirect_uri;
    let state_nonce = Uuid::new_v4().to_string();

    let google_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?\
         client_id={}&\
         redirect_uri={}&\
         response_type=code&\
         scope=openid%20email%20profile&\
         access_type=offline&\
         state={}",
        state.config().google_client_id,
        urlencoding::encode(redirect_uri),
        urlencoding::encode(&state_nonce),
    );

    // Store state nonce in httpOnly cookie for CSRF validation on callback.
    let state_cookie = format!(
        "oauth_state={}; HttpOnly; Secure; SameSite=Lax; Path=/v1/auth; Max-Age=600",
        state_nonce,
    );

    let mut response = Redirect::temporary(&google_url).into_response();
    response.headers_mut().insert(
        header::SET_COOKIE,
        state_cookie.parse().expect("valid cookie header"),
    );

    Ok(response)
}

/// `GET /v1/auth/google/callback` — exchange code for tokens, upsert user, redirect.
pub async fn handle_google_callback(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<GoogleCallbackQuery>,
) -> Result<Response, ApiError> {
    // Validate state parameter against the per-session cookie (CSRF protection).
    let cookie_header = headers
        .get(header::COOKIE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    let expected_state = cookie_header
        .split(';')
        .filter_map(|c| c.trim().strip_prefix("oauth_state="))
        .next()
        .ok_or_else(|| ApiError::BadRequest("missing OAuth state cookie".into()))?;

    if query.state != expected_state {
        return Err(ApiError::BadRequest("invalid OAuth state parameter".into()));
    }

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
    let (user, _tokens, refresh_token) = state
        .auth_service()
        .google_callback(google_user, &preferred_locale)
        .await?;

    // Create sample project for first-time users (REQ-063).
    // Runs in background — never blocks the auth redirect.
    let sample_svc = state.sample_service();
    let sample_user_id = user.id;
    let sample_locale = preferred_locale.clone();
    let handle = tokio::spawn(async move {
        sample_svc.ensure_sample_project(sample_user_id, &sample_locale).await;
    });
    tokio::spawn(async move {
        if let Err(e) = handle.await {
            tracing::error!(error = %e, "sample project task panicked");
        }
    });

    // Redirect to web app without tokens in URL (client uses refresh cookie).
    let web_url = &state.config().web_app_url;

    // Set httpOnly refresh token cookie.
    let refresh_cookie = format!(
        "refresh_token={}; HttpOnly; Secure; SameSite=Lax; Path=/v1/auth; Max-Age={}",
        refresh_token,
        30 * 24 * 60 * 60, // 30 days
    );

    // Clear the one-time state cookie.
    let clear_state_cookie =
        "oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/v1/auth; Max-Age=0";

    let mut response = Redirect::temporary(web_url).into_response();
    response.headers_mut().append(
        header::SET_COOKIE,
        refresh_cookie.parse().expect("valid cookie header"),
    );
    response.headers_mut().append(
        header::SET_COOKIE,
        clear_state_cookie.parse().expect("valid cookie header"),
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

/// Detect image content type from magic bytes (first bytes of the file).
fn detect_image_type(data: &[u8]) -> Option<&'static str> {
    // JPEG: FF D8 FF
    if data.len() >= 3 && data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF {
        return Some("image/jpeg");
    }
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if data.len() >= 8
        && data[..8] == [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]
    {
        return Some("image/png");
    }
    // WebP: RIFF....WEBP
    if data.len() >= 12 && data[..4] == *b"RIFF" && data[8..12] == *b"WEBP" {
        return Some("image/webp");
    }
    None
}

/// `POST /v1/auth/me/avatar` — upload profile avatar image.
pub async fn upload_avatar(
    State(state): State<AppState>,
    auth: AuthUser,
    mut multipart: axum::extract::Multipart,
) -> Result<ApiSuccess<UserResponse>, ApiError> {
    let mut file_data: Option<Vec<u8>> = None;

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        ApiError::BadRequest(format!("invalid multipart: {e}"))
    })? {
        if field.name() == Some("avatar") {
            let data = field.bytes().await.map_err(|e| {
                ApiError::BadRequest(format!("failed to read file: {e}"))
            })?;

            file_data = Some(data.to_vec());
        }
    }

    let data = file_data
        .ok_or_else(|| ApiError::BadRequest("missing 'avatar' field".into()))?;

    // Validate actual file content via magic bytes (not client-provided Content-Type).
    let content_type = detect_image_type(&data).ok_or_else(|| {
        ApiError::BadRequest("unsupported image format (use JPEG, PNG, or WebP)".into())
    })?;

    let user = state
        .auth_service()
        .upload_avatar(auth.user_id, content_type, data)
        .await?;

    Ok(ApiSuccess::new(UserResponse::from(&user)))
}

/// `POST /v1/auth/test-login` — test-only login that bypasses Google OAuth.
///
/// Only registered when `RUN_MODE=test`. Creates a user with a deterministic
/// fake Google ID and issues tokens, so E2E tests can authenticate without
/// going through the real OAuth flow.
pub async fn test_login(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<TestLoginRequest>,
) -> Result<Response, ApiError> {
    let locale = headers
        .get(header::ACCEPT_LANGUAGE)
        .and_then(|v| v.to_str().ok())
        .map(resolve_preferred_locale)
        .unwrap_or_else(|| "en".into());

    let (user, tokens, refresh_token) = state
        .auth_service()
        .test_login(&body.email, body.name.as_deref())
        .await?;

    // Create sample project for first-time users (REQ-063).
    state.sample_service().ensure_sample_project(user.id, &locale).await;

    let refresh_cookie = format!(
        "refresh_token={}; HttpOnly; Secure; SameSite=Lax; Path=/v1/auth; Max-Age={}",
        refresh_token,
        30 * 24 * 60 * 60, // 30 days
    );

    let mut response = ApiSuccess::new(AuthTokensResponse::from(&tokens)).into_response();
    response.headers_mut().insert(
        header::SET_COOKIE,
        refresh_cookie.parse().expect("valid cookie header"),
    );

    Ok(response)
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

    // ---- Magic bytes detection ----

    #[test]
    fn detect_jpeg() {
        let data = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10];
        assert_eq!(detect_image_type(&data), Some("image/jpeg"));
    }

    #[test]
    fn detect_png() {
        let data = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00];
        assert_eq!(detect_image_type(&data), Some("image/png"));
    }

    #[test]
    fn detect_webp() {
        let mut data = Vec::from(*b"RIFF");
        data.extend_from_slice(&[0x00; 4]); // file size placeholder
        data.extend_from_slice(b"WEBP");
        assert_eq!(detect_image_type(&data), Some("image/webp"));
    }

    #[test]
    fn detect_unknown_returns_none() {
        let data = [0x00, 0x01, 0x02, 0x03];
        assert_eq!(detect_image_type(&data), None);
    }

    #[test]
    fn detect_empty_returns_none() {
        assert_eq!(detect_image_type(&[]), None);
    }

    #[test]
    fn detect_svg_rejected() {
        // SVG starts with text/xml — should not be detected as image.
        let data = b"<?xml version=\"1.0\"?><svg>";
        assert_eq!(detect_image_type(data), None);
    }

    // ---- Accept-Language resolution ----

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
