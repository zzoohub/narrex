use axum::extract::{Query, State};
use axum::http::{header, StatusCode};
use axum::response::{IntoResponse, Redirect, Response};

use serde::Deserialize;

use crate::domain::auth::models::GoogleUserInfo;
use crate::inbound::http::error::ApiError;
use crate::inbound::http::middleware::auth::AuthUser;
use crate::inbound::http::response::ApiSuccess;
use crate::inbound::http::server::AppState;

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
    .map_err(|e| ApiError::BadRequest(format!("OAuth code exchange failed: {e}")))?;

    // Fetch user info from Google.
    let google_user = fetch_google_user_info(&google_tokens.access_token)
        .await
        .map_err(|e| ApiError::BadRequest(format!("failed to fetch Google user info: {e}")))?;

    // Upsert user and issue tokens.
    let (_user, tokens, refresh_token) = state
        .auth_service()
        .google_callback(google_user)
        .await?;

    // Build redirect with access token as query param.
    let web_url = &query.state; // state param contains the web app URL
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
) -> Result<ApiSuccess<AuthTokensResponse>, ApiError> {
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

    // In a full implementation, we'd set a new refresh cookie here too.
    // For now, just return the access token.
    let _ = new_refresh;

    Ok(ApiSuccess::new(AuthTokensResponse::from(&tokens)))
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
    // The AuthUser extractor already verified the token.
    // We need to load the full user from the repository.
    // For now, we use the auth service which verifies token + fetches user.
    // Since AuthServiceImpl::get_current_user needs improvement,
    // we'll return a minimal response from the user_id.
    //
    // TODO: Add `find_by_id` to UserRepository and use it here.
    let _ = state;
    let _ = auth;
    Err(ApiError::Internal(
        "get_current_user: UserRepository.find_by_id not yet implemented".into(),
    ))
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
