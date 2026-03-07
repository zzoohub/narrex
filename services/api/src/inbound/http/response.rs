use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;

// ---------------------------------------------------------------------------
// ApiSuccess — 200 OK with `{ "data": T }`
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct ApiSuccess<T: Serialize> {
    pub data: T,
}

impl<T: Serialize> IntoResponse for ApiSuccess<T> {
    fn into_response(self) -> Response {
        (StatusCode::OK, Json(self)).into_response()
    }
}

impl<T: Serialize> ApiSuccess<T> {
    pub fn new(data: T) -> Self {
        Self { data }
    }
}

// ---------------------------------------------------------------------------
// Created — 201 Created with `{ "data": T }`
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct Created<T: Serialize> {
    pub data: T,
}

impl<T: Serialize> IntoResponse for Created<T> {
    fn into_response(self) -> Response {
        (StatusCode::CREATED, Json(self)).into_response()
    }
}

impl<T: Serialize> Created<T> {
    pub fn new(data: T) -> Self {
        Self { data }
    }
}

// ---------------------------------------------------------------------------
// PaginatedResponse — 200 OK with `{ "data": [T], "meta": {...} }`
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PaginationMeta {
    pub limit: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
    pub has_more: bool,
}

#[derive(Debug, Serialize)]
pub struct PaginatedResponse<T: Serialize> {
    pub data: Vec<T>,
    pub meta: PaginationMeta,
}

impl<T: Serialize> IntoResponse for PaginatedResponse<T> {
    fn into_response(self) -> Response {
        (StatusCode::OK, Json(self)).into_response()
    }
}

impl<T: Serialize> PaginatedResponse<T> {
    pub fn new(data: Vec<T>, limit: i64, next_cursor: Option<String>, has_more: bool) -> Self {
        Self {
            data,
            meta: PaginationMeta {
                limit,
                next_cursor,
                has_more,
            },
        }
    }
}
