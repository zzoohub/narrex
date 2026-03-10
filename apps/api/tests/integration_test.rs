//! HTTP-level integration tests for the Narrex API.
//!
//! These tests exercise the full HTTP pipeline: routing → middleware (AuthUser)
//! → handler → service (mocked) → response serialization. They verify:
//!
//! - Correct routing and HTTP methods
//! - JWT auth middleware (missing / invalid / expired / valid tokens)
//! - RFC 9457 ProblemDetail error format (`application/problem+json`)
//! - Security response headers (HSTS, X-Content-Type-Options, etc.)
//! - Request/response serialization for CRUD endpoints

mod common;

use axum::body::Body;
use axum::http::{header, Method, Request, StatusCode};
use http_body_util::BodyExt;
use tower::ServiceExt;

use common::{TestApp, TEST_JWT_SECRET};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async fn body_json(resp: axum::response::Response) -> serde_json::Value {
    let bytes = resp.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&bytes).unwrap()
}

fn assert_problem_detail(json: &serde_json::Value, status: u16) {
    assert_eq!(json["status"], status);
    assert!(json["type"]
        .as_str()
        .unwrap()
        .starts_with("https://api.narrex.app/errors/"));
    assert!(json["title"].is_string());
}

// ===========================================================================
// 1. Health check (public, no auth)
// ===========================================================================

#[tokio::test]
async fn health_check_returns_200() {
    let app = TestApp::new();
    let req = Request::builder()
        .uri("/health")
        .body(Body::empty())
        .unwrap();

    let resp = app.router().oneshot(req).await.unwrap();

    assert_eq!(resp.status(), StatusCode::OK);
    let json = body_json(resp).await;
    assert_eq!(json["status"], "ok");
    assert_eq!(json["database"], "unavailable"); // no pool in tests
}

// ===========================================================================
// 2. Auth middleware — missing token
// ===========================================================================

#[tokio::test]
async fn auth_missing_token_returns_401() {
    let app = TestApp::new();
    let req = Request::builder()
        .uri("/v1/auth/me")
        .body(Body::empty())
        .unwrap();

    let resp = app.router().oneshot(req).await.unwrap();

    assert_eq!(resp.status(), StatusCode::UNAUTHORIZED);
    let ct = resp
        .headers()
        .get("content-type")
        .unwrap()
        .to_str()
        .unwrap();
    assert_eq!(ct, "application/problem+json");
    let json = body_json(resp).await;
    assert_problem_detail(&json, 401);
}

// ===========================================================================
// 3. Auth middleware — invalid token
// ===========================================================================

#[tokio::test]
async fn auth_invalid_token_returns_401() {
    let app = TestApp::new();
    let req = Request::builder()
        .uri("/v1/auth/me")
        .header(header::AUTHORIZATION, "Bearer not.a.real.jwt")
        .body(Body::empty())
        .unwrap();

    let resp = app.router().oneshot(req).await.unwrap();

    assert_eq!(resp.status(), StatusCode::UNAUTHORIZED);
    let json = body_json(resp).await;
    assert_problem_detail(&json, 401);
}

// ===========================================================================
// 4. Auth middleware — expired token
// ===========================================================================

#[tokio::test]
async fn auth_expired_token_returns_401() {
    let app = TestApp::new();
    let expired = common::make_expired_token(TEST_JWT_SECRET);
    let req = Request::builder()
        .uri("/v1/auth/me")
        .header(header::AUTHORIZATION, format!("Bearer {expired}"))
        .body(Body::empty())
        .unwrap();

    let resp = app.router().oneshot(req).await.unwrap();

    assert_eq!(resp.status(), StatusCode::UNAUTHORIZED);
    let json = body_json(resp).await;
    assert_problem_detail(&json, 401);
    assert!(json["detail"].as_str().unwrap().contains("expired"));
}

// ===========================================================================
// 5. Auth middleware — refresh token rejected as access
// ===========================================================================

#[tokio::test]
async fn auth_refresh_token_rejected_as_access() {
    let app = TestApp::new();
    let refresh = common::make_refresh_token(TEST_JWT_SECRET, app.user_id());
    let req = Request::builder()
        .uri("/v1/auth/me")
        .header(header::AUTHORIZATION, format!("Bearer {refresh}"))
        .body(Body::empty())
        .unwrap();

    let resp = app.router().oneshot(req).await.unwrap();

    assert_eq!(resp.status(), StatusCode::UNAUTHORIZED);
    let json = body_json(resp).await;
    assert!(json["detail"]
        .as_str()
        .unwrap()
        .contains("not an access token"));
}

// ===========================================================================
// 6. Auth middleware — valid token → get current user
// ===========================================================================

#[tokio::test]
async fn get_current_user_with_valid_token() {
    let app = TestApp::new();
    let req = Request::builder()
        .uri("/v1/auth/me")
        .header(header::AUTHORIZATION, app.bearer())
        .body(Body::empty())
        .unwrap();

    let resp = app.router().oneshot(req).await.unwrap();

    assert_eq!(resp.status(), StatusCode::OK);
    let json = body_json(resp).await;
    assert_eq!(json["data"]["email"], "test@example.com");
}

// ===========================================================================
// 7. Create project → 201
// ===========================================================================

#[tokio::test]
async fn create_project_returns_201() {
    let app = TestApp::new();
    let body = serde_json::json!({
        "title": "My Novel"
    });
    let req = Request::builder()
        .method(Method::POST)
        .uri("/v1/projects")
        .header(header::AUTHORIZATION, app.bearer())
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(serde_json::to_vec(&body).unwrap()))
        .unwrap();

    let resp = app.router().oneshot(req).await.unwrap();

    assert_eq!(resp.status(), StatusCode::CREATED);
    let json = body_json(resp).await;
    assert_eq!(json["data"]["title"], "My Novel");
}

// ===========================================================================
// 8. Get project → 200
// ===========================================================================

#[tokio::test]
async fn get_project_returns_200() {
    let app = TestApp::new();
    let project_id = app.project_id();
    let req = Request::builder()
        .uri(format!("/v1/projects/{project_id}"))
        .header(header::AUTHORIZATION, app.bearer())
        .body(Body::empty())
        .unwrap();

    let resp = app.router().oneshot(req).await.unwrap();

    assert_eq!(resp.status(), StatusCode::OK);
    let json = body_json(resp).await;
    assert_eq!(json["data"]["id"], project_id.to_string());
}

// ===========================================================================
// 9. Get project not found → 404 ProblemDetail
// ===========================================================================

#[tokio::test]
async fn get_project_not_found_returns_404() {
    let app = TestApp::new_with_empty_project();
    let fake_id = uuid::Uuid::new_v4();
    let req = Request::builder()
        .uri(format!("/v1/projects/{fake_id}"))
        .header(header::AUTHORIZATION, app.bearer())
        .body(Body::empty())
        .unwrap();

    let resp = app.router().oneshot(req).await.unwrap();

    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
    let ct = resp
        .headers()
        .get("content-type")
        .unwrap()
        .to_str()
        .unwrap();
    assert_eq!(ct, "application/problem+json");
    let json = body_json(resp).await;
    assert_problem_detail(&json, 404);
}

// ===========================================================================
// 10. Delete project → 204
// ===========================================================================

#[tokio::test]
async fn delete_project_returns_204() {
    let app = TestApp::new();
    let project_id = app.project_id();
    let req = Request::builder()
        .method(Method::DELETE)
        .uri(format!("/v1/projects/{project_id}"))
        .header(header::AUTHORIZATION, app.bearer())
        .body(Body::empty())
        .unwrap();

    let resp = app.router().oneshot(req).await.unwrap();

    assert_eq!(resp.status(), StatusCode::NO_CONTENT);
}

// ===========================================================================
// 11. List projects → 200 with pagination
// ===========================================================================

#[tokio::test]
async fn list_projects_returns_paginated() {
    let app = TestApp::new();
    let req = Request::builder()
        .uri("/v1/projects")
        .header(header::AUTHORIZATION, app.bearer())
        .body(Body::empty())
        .unwrap();

    let resp = app.router().oneshot(req).await.unwrap();

    assert_eq!(resp.status(), StatusCode::OK);
    let json = body_json(resp).await;
    assert!(json["data"].is_array());
    assert!(json["meta"]["limit"].is_number());
    assert!(json["meta"]["hasMore"].is_boolean());
}

// ===========================================================================
// 12. Security headers on every response
// ===========================================================================

#[tokio::test]
async fn security_headers_present() {
    let app = TestApp::new();
    let req = Request::builder()
        .uri("/health")
        .body(Body::empty())
        .unwrap();

    let resp = app.router().oneshot(req).await.unwrap();
    let headers = resp.headers();

    assert_eq!(
        headers
            .get("strict-transport-security")
            .unwrap()
            .to_str()
            .unwrap(),
        "max-age=31536000; includeSubDomains"
    );
    assert_eq!(
        headers
            .get("x-content-type-options")
            .unwrap()
            .to_str()
            .unwrap(),
        "nosniff"
    );
    assert_eq!(
        headers.get("x-frame-options").unwrap().to_str().unwrap(),
        "DENY"
    );
    assert_eq!(
        headers.get("referrer-policy").unwrap().to_str().unwrap(),
        "strict-origin-when-cross-origin"
    );
    assert_eq!(
        headers
            .get("content-security-policy")
            .unwrap()
            .to_str()
            .unwrap(),
        "default-src 'none'; frame-ancestors 'none'"
    );
}

// ===========================================================================
// 13. Logout → 204 + clear cookie
// ===========================================================================

#[tokio::test]
async fn logout_clears_refresh_cookie() {
    let app = TestApp::new();
    let req = Request::builder()
        .method(Method::POST)
        .uri("/v1/auth/logout")
        .header(header::AUTHORIZATION, app.bearer())
        .body(Body::empty())
        .unwrap();

    let resp = app.router().oneshot(req).await.unwrap();

    assert_eq!(resp.status(), StatusCode::NO_CONTENT);
    let cookie = resp.headers().get("set-cookie").unwrap().to_str().unwrap();
    assert!(cookie.contains("refresh_token=;"));
    assert!(cookie.contains("Max-Age=0"));
}

// ===========================================================================
// 14. Wrong HTTP method → 405 Method Not Allowed
// ===========================================================================

#[tokio::test]
async fn wrong_method_returns_405() {
    let app = TestApp::new();
    let req = Request::builder()
        .method(Method::PUT) // only GET/POST are registered
        .uri("/v1/projects")
        .header(header::AUTHORIZATION, app.bearer())
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::empty())
        .unwrap();

    let resp = app.router().oneshot(req).await.unwrap();

    assert_eq!(resp.status(), StatusCode::METHOD_NOT_ALLOWED);
}

// ===========================================================================
// 15. Forbidden project access (wrong user)
// ===========================================================================

#[tokio::test]
async fn project_forbidden_returns_403() {
    let app = TestApp::new_with_forbidden_project();
    let project_id = app.project_id();
    let req = Request::builder()
        .uri(format!("/v1/projects/{project_id}"))
        .header(header::AUTHORIZATION, app.bearer())
        .body(Body::empty())
        .unwrap();

    let resp = app.router().oneshot(req).await.unwrap();

    assert_eq!(resp.status(), StatusCode::FORBIDDEN);
    let ct = resp
        .headers()
        .get("content-type")
        .unwrap()
        .to_str()
        .unwrap();
    assert_eq!(ct, "application/problem+json");
    let json = body_json(resp).await;
    assert_problem_detail(&json, 403);
}

// ===========================================================================
// 16. Test-login endpoint available in test mode
// ===========================================================================

#[tokio::test]
async fn test_login_available_in_test_mode() {
    let app = TestApp::new();
    let body = serde_json::json!({
        "email": "new@example.com"
    });
    let req = Request::builder()
        .method(Method::POST)
        .uri("/v1/auth/test-login")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(serde_json::to_vec(&body).unwrap()))
        .unwrap();

    let resp = app.router().oneshot(req).await.unwrap();

    assert_eq!(resp.status(), StatusCode::OK);
    // Check cookie header before consuming the body
    let cookie = resp
        .headers()
        .get("set-cookie")
        .map(|v| v.to_str().unwrap().to_owned());
    assert!(cookie.is_some(), "refresh_token cookie should be set");
    let cookie = cookie.unwrap();
    assert!(
        cookie.contains("refresh_token="),
        "cookie should contain refresh_token"
    );
    assert!(cookie.contains("HttpOnly"), "cookie should be HttpOnly");

    let json = body_json(resp).await;
    assert!(json["data"]["accessToken"].is_string());
    assert!(json["data"]["expiresIn"].is_number());
}

// ===========================================================================
// 17. ProblemDetail body structure
// ===========================================================================

#[tokio::test]
async fn problem_detail_has_required_fields() {
    let app = TestApp::new();
    let req = Request::builder()
        .uri("/v1/auth/me")
        .body(Body::empty())
        .unwrap();

    let resp = app.router().oneshot(req).await.unwrap();
    let json = body_json(resp).await;

    // RFC 9457 required members
    assert!(json["type"].is_string(), "ProblemDetail must have 'type'");
    assert!(json["title"].is_string(), "ProblemDetail must have 'title'");
    assert!(
        json["status"].is_number(),
        "ProblemDetail must have 'status'"
    );
    // 'detail' is optional per RFC but present for 401
    assert!(json["detail"].is_string());
}
