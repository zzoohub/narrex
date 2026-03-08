use std::env;

/// Application configuration loaded from environment variables.
#[derive(Debug, Clone)]
pub struct Config {
    pub port: u16,
    pub database_url: String,
    pub jwt_secret: String,
    pub google_client_id: String,
    pub google_client_secret: String,
    pub google_redirect_uri: String,
    pub cf_account_id: String,
    pub cf_api_token: String,
    pub gemini_api_key: String,
    pub web_app_url: String,
    pub cors_origin: String,
}

impl Config {
    /// Load configuration from environment variables.
    ///
    /// Required variables: `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`,
    /// `GOOGLE_CLIENT_SECRET`.
    ///
    /// Optional (with defaults):
    /// - `PORT` (default: 8080)
    /// - `GOOGLE_REDIRECT_URI` (default: `http://localhost:8080/v1/auth/google/callback`)
    /// - `CF_ACCOUNT_ID`, `CF_API_TOKEN`, `GEMINI_API_KEY` (default: empty)
    /// - `WEB_APP_URL` (default: `http://localhost:3000`)
    /// - `CORS_ORIGIN` (default: `http://localhost:3000`)
    pub fn from_env() -> anyhow::Result<Self> {
        Ok(Self {
            port: env::var("PORT")
                .unwrap_or_else(|_| "8080".into())
                .parse()
                .map_err(|_| anyhow::anyhow!("PORT must be a valid u16"))?,
            database_url: env::var("DATABASE_URL")
                .map_err(|_| anyhow::anyhow!("DATABASE_URL is required"))?,
            jwt_secret: env::var("JWT_SECRET")
                .map_err(|_| anyhow::anyhow!("JWT_SECRET is required"))?,
            google_client_id: env::var("GOOGLE_CLIENT_ID")
                .map_err(|_| anyhow::anyhow!("GOOGLE_CLIENT_ID is required"))?,
            google_client_secret: env::var("GOOGLE_CLIENT_SECRET")
                .map_err(|_| anyhow::anyhow!("GOOGLE_CLIENT_SECRET is required"))?,
            google_redirect_uri: env::var("GOOGLE_REDIRECT_URI").unwrap_or_else(|_| {
                "http://localhost:8080/v1/auth/google/callback".into()
            }),
            cf_account_id: env::var("CF_ACCOUNT_ID").unwrap_or_default(),
            cf_api_token: env::var("CF_API_TOKEN").unwrap_or_default(),
            gemini_api_key: env::var("GEMINI_API_KEY").unwrap_or_default(),
            web_app_url: env::var("WEB_APP_URL")
                .unwrap_or_else(|_| "http://localhost:3000".into()),
            cors_origin: env::var("CORS_ORIGIN")
                .unwrap_or_else(|_| "http://localhost:3000".into()),
        })
    }
}
