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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn llm_error_display_unavailable() {
        let err = LlmError::Unavailable("down for maintenance".into());
        assert_eq!(
            err.to_string(),
            "provider unavailable: down for maintenance"
        );
    }

    #[test]
    fn llm_error_display_rate_limited() {
        let err = LlmError::RateLimited;
        assert_eq!(err.to_string(), "rate limited");
    }

    #[test]
    fn llm_error_display_request_failed() {
        let err = LlmError::RequestFailed("HTTP 500".into());
        assert_eq!(err.to_string(), "request failed: HTTP 500");
    }

    #[test]
    fn llm_error_display_invalid_response() {
        let err = LlmError::InvalidResponse("missing field".into());
        assert_eq!(err.to_string(), "invalid response: missing field");
    }

    #[test]
    fn llm_error_display_timeout() {
        let err = LlmError::Timeout;
        assert_eq!(err.to_string(), "timeout");
    }

    #[test]
    fn generate_request_clone() {
        let req = GenerateRequest {
            system_prompt: "sys".into(),
            user_prompt: "user".into(),
            max_tokens: Some(100),
            temperature: Some(0.5),
        };
        let cloned = req.clone();
        assert_eq!(cloned.system_prompt, "sys");
        assert_eq!(cloned.user_prompt, "user");
        assert_eq!(cloned.max_tokens, Some(100));
        assert_eq!(cloned.temperature, Some(0.5));
    }

    #[test]
    fn generate_response_debug() {
        let resp = GenerateResponse {
            text: "hello".into(),
            model: "test-model".into(),
            provider: "test-provider".into(),
            token_count_input: 10,
            token_count_output: 20,
        };
        let debug = format!("{:?}", resp);
        assert!(debug.contains("hello"));
        assert!(debug.contains("test-model"));
    }

    #[test]
    fn stream_chunk_done_with_usage() {
        let chunk = StreamChunk {
            text: String::new(),
            done: true,
            usage: Some(StreamUsage {
                model: "m".into(),
                provider: "p".into(),
                token_count_input: 5,
                token_count_output: 10,
            }),
        };
        assert!(chunk.done);
        assert!(chunk.text.is_empty());
        let usage = chunk.usage.unwrap();
        assert_eq!(usage.model, "m");
        assert_eq!(usage.provider, "p");
        assert_eq!(usage.token_count_input, 5);
        assert_eq!(usage.token_count_output, 10);
    }

    #[test]
    fn stream_chunk_not_done_no_usage() {
        let chunk = StreamChunk {
            text: "partial".into(),
            done: false,
            usage: None,
        };
        assert!(!chunk.done);
        assert_eq!(chunk.text, "partial");
        assert!(chunk.usage.is_none());
    }
}
