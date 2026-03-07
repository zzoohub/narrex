use std::pin::Pin;

use futures::Stream;

#[derive(Debug, Clone)]
pub struct GenerateRequest {
    pub system_prompt: String,
    pub user_prompt: String,
    pub max_tokens: Option<u32>,
    pub temperature: Option<f32>,
}

#[derive(Debug, Clone)]
pub struct GenerateResponse {
    pub text: String,
    pub model: String,
    pub provider: String,
    pub token_count_input: u32,
    pub token_count_output: u32,
}

#[derive(Debug, Clone)]
pub struct StreamChunk {
    pub text: String,
    pub done: bool,
    pub usage: Option<StreamUsage>,
}

#[derive(Debug, Clone)]
pub struct StreamUsage {
    pub model: String,
    pub provider: String,
    pub token_count_input: u32,
    pub token_count_output: u32,
}

#[derive(Debug, thiserror::Error)]
pub enum LlmError {
    #[error("provider unavailable: {0}")]
    Unavailable(String),
    #[error("rate limited")]
    RateLimited,
    #[error("request failed: {0}")]
    RequestFailed(String),
    #[error("invalid response: {0}")]
    InvalidResponse(String),
    #[error("timeout")]
    Timeout,
}

#[async_trait::async_trait]
pub trait LlmProvider: Send + Sync {
    async fn generate(&self, req: GenerateRequest) -> Result<GenerateResponse, LlmError>;

    async fn generate_stream(
        &self,
        req: GenerateRequest,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<StreamChunk, LlmError>> + Send>>, LlmError>;

    fn name(&self) -> &str;
}
