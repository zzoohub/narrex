use std::pin::Pin;
use std::time::Duration;

use futures::Stream;
use tokio::time::timeout;
use tracing::{info, warn};

use crate::provider::{GenerateRequest, GenerateResponse, LlmError, LlmProvider, StreamChunk};

const REQUEST_TIMEOUT: Duration = Duration::from_secs(30);

pub struct LlmGateway {
    primary: Box<dyn LlmProvider>,
    fallback: Box<dyn LlmProvider>,
}

impl LlmGateway {
    pub fn new(primary: Box<dyn LlmProvider>, fallback: Box<dyn LlmProvider>) -> Self {
        Self { primary, fallback }
    }

    fn should_failover(err: &LlmError) -> bool {
        matches!(
            err,
            LlmError::Unavailable(_)
                | LlmError::RateLimited
                | LlmError::Timeout
                | LlmError::RequestFailed(_)
        )
    }
}

#[async_trait::async_trait]
impl LlmProvider for LlmGateway {
    async fn generate(&self, req: GenerateRequest) -> Result<GenerateResponse, LlmError> {
        let primary_result = timeout(REQUEST_TIMEOUT, self.primary.generate(req.clone())).await;

        match primary_result {
            Ok(Ok(response)) => return Ok(response),
            Ok(Err(e)) if Self::should_failover(&e) => {
                warn!(
                    provider = self.primary.name(),
                    error = %e,
                    "primary provider failed, falling back"
                );
            }
            Ok(Err(e)) => return Err(e),
            Err(_) => {
                warn!(
                    provider = self.primary.name(),
                    "primary provider timed out, falling back"
                );
            }
        }

        info!(provider = self.fallback.name(), "using fallback provider");
        self.fallback.generate(req).await
    }

    async fn generate_stream(
        &self,
        req: GenerateRequest,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<StreamChunk, LlmError>> + Send>>, LlmError> {
        let primary_result =
            timeout(REQUEST_TIMEOUT, self.primary.generate_stream(req.clone())).await;

        match primary_result {
            Ok(Ok(stream)) => return Ok(stream),
            Ok(Err(e)) if Self::should_failover(&e) => {
                warn!(
                    provider = self.primary.name(),
                    error = %e,
                    "primary provider stream failed, falling back"
                );
            }
            Ok(Err(e)) => return Err(e),
            Err(_) => {
                warn!(
                    provider = self.primary.name(),
                    "primary provider stream timed out, falling back"
                );
            }
        }

        info!(provider = self.fallback.name(), "using fallback provider for stream");
        self.fallback.generate_stream(req).await
    }

    fn name(&self) -> &str {
        "gateway"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc;

    /// A mock provider that can be configured to succeed or fail.
    #[derive(Clone)]
    struct MockProvider {
        provider_name: String,
        result: Result<GenerateResponse, MockError>,
        call_count: Arc<AtomicUsize>,
    }

    #[derive(Clone, Debug)]
    enum MockError {
        Unavailable,
        RateLimited,
        Timeout,
        RequestFailed,
        InvalidResponse,
    }

    impl MockProvider {
        fn success(name: &str, text: &str) -> Self {
            Self {
                provider_name: name.to_string(),
                result: Ok(GenerateResponse {
                    text: text.to_string(),
                    model: format!("{name}-model"),
                    provider: name.to_string(),
                    token_count_input: 10,
                    token_count_output: 20,
                }),
                call_count: Arc::new(AtomicUsize::new(0)),
            }
        }

        fn failing(name: &str, err: MockError) -> Self {
            Self {
                provider_name: name.to_string(),
                result: Err(err),
                call_count: Arc::new(AtomicUsize::new(0)),
            }
        }

        fn calls(&self) -> usize {
            self.call_count.load(Ordering::SeqCst)
        }
    }

    #[async_trait::async_trait]
    impl LlmProvider for MockProvider {
        async fn generate(&self, _req: GenerateRequest) -> Result<GenerateResponse, LlmError> {
            self.call_count.fetch_add(1, Ordering::SeqCst);
            match &self.result {
                Ok(resp) => Ok(resp.clone()),
                Err(MockError::Unavailable) => {
                    Err(LlmError::Unavailable("mock unavailable".into()))
                }
                Err(MockError::RateLimited) => Err(LlmError::RateLimited),
                Err(MockError::Timeout) => Err(LlmError::Timeout),
                Err(MockError::RequestFailed) => {
                    Err(LlmError::RequestFailed("mock failed".into()))
                }
                Err(MockError::InvalidResponse) => {
                    Err(LlmError::InvalidResponse("mock invalid".into()))
                }
            }
        }

        async fn generate_stream(
            &self,
            _req: GenerateRequest,
        ) -> Result<Pin<Box<dyn Stream<Item = Result<StreamChunk, LlmError>> + Send>>, LlmError>
        {
            self.call_count.fetch_add(1, Ordering::SeqCst);
            match &self.result {
                Ok(_resp) => {
                    let text = "streamed text".to_string();
                    let stream = futures::stream::once(async move {
                        Ok(StreamChunk {
                            text,
                            done: true,
                            usage: None,
                        })
                    });
                    Ok(Box::pin(stream))
                }
                Err(MockError::Unavailable) => {
                    Err(LlmError::Unavailable("mock unavailable".into()))
                }
                Err(MockError::RateLimited) => Err(LlmError::RateLimited),
                Err(MockError::Timeout) => Err(LlmError::Timeout),
                Err(MockError::RequestFailed) => {
                    Err(LlmError::RequestFailed("mock failed".into()))
                }
                Err(MockError::InvalidResponse) => {
                    Err(LlmError::InvalidResponse("mock invalid".into()))
                }
            }
        }

        fn name(&self) -> &str {
            &self.provider_name
        }
    }

    fn test_request() -> GenerateRequest {
        GenerateRequest {
            system_prompt: "test system".into(),
            user_prompt: "test user".into(),
            max_tokens: None,
            temperature: None,
        }
    }

    // -- should_failover tests --

    #[test]
    fn should_failover_on_unavailable() {
        assert!(LlmGateway::should_failover(&LlmError::Unavailable(
            "down".into()
        )));
    }

    #[test]
    fn should_failover_on_rate_limited() {
        assert!(LlmGateway::should_failover(&LlmError::RateLimited));
    }

    #[test]
    fn should_failover_on_timeout() {
        assert!(LlmGateway::should_failover(&LlmError::Timeout));
    }

    #[test]
    fn should_failover_on_request_failed() {
        assert!(LlmGateway::should_failover(&LlmError::RequestFailed(
            "err".into()
        )));
    }

    #[test]
    fn should_not_failover_on_invalid_response() {
        assert!(!LlmGateway::should_failover(&LlmError::InvalidResponse(
            "bad json".into()
        )));
    }

    // -- generate tests --

    #[tokio::test]
    async fn generate_returns_primary_on_success() {
        let primary = MockProvider::success("primary", "primary response");
        let fallback = MockProvider::success("fallback", "fallback response");

        let gw = LlmGateway::new(Box::new(primary.clone()), Box::new(fallback.clone()));
        let resp = gw.generate(test_request()).await.unwrap();

        assert_eq!(resp.text, "primary response");
        assert_eq!(resp.provider, "primary");
        assert_eq!(primary.calls(), 1);
        assert_eq!(fallback.calls(), 0);
    }

    #[tokio::test]
    async fn generate_falls_back_on_unavailable() {
        let primary = MockProvider::failing("primary", MockError::Unavailable);
        let fallback = MockProvider::success("fallback", "fallback response");

        let gw = LlmGateway::new(Box::new(primary.clone()), Box::new(fallback.clone()));
        let resp = gw.generate(test_request()).await.unwrap();

        assert_eq!(resp.text, "fallback response");
        assert_eq!(resp.provider, "fallback");
        assert_eq!(primary.calls(), 1);
        assert_eq!(fallback.calls(), 1);
    }

    #[tokio::test]
    async fn generate_falls_back_on_rate_limited() {
        let primary = MockProvider::failing("primary", MockError::RateLimited);
        let fallback = MockProvider::success("fallback", "fallback response");

        let gw = LlmGateway::new(Box::new(primary.clone()), Box::new(fallback.clone()));
        let resp = gw.generate(test_request()).await.unwrap();

        assert_eq!(resp.text, "fallback response");
        assert_eq!(primary.calls(), 1);
        assert_eq!(fallback.calls(), 1);
    }

    #[tokio::test]
    async fn generate_falls_back_on_request_failed() {
        let primary = MockProvider::failing("primary", MockError::RequestFailed);
        let fallback = MockProvider::success("fallback", "fb");

        let gw = LlmGateway::new(Box::new(primary.clone()), Box::new(fallback.clone()));
        let resp = gw.generate(test_request()).await.unwrap();

        assert_eq!(resp.text, "fb");
        assert_eq!(primary.calls(), 1);
        assert_eq!(fallback.calls(), 1);
    }

    #[tokio::test]
    async fn generate_does_not_failover_on_invalid_response() {
        let primary = MockProvider::failing("primary", MockError::InvalidResponse);
        let fallback = MockProvider::success("fallback", "fb");

        let gw = LlmGateway::new(Box::new(primary.clone()), Box::new(fallback.clone()));
        let result = gw.generate(test_request()).await;

        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), LlmError::InvalidResponse(_)));
        assert_eq!(primary.calls(), 1);
        assert_eq!(fallback.calls(), 0);
    }

    #[tokio::test]
    async fn generate_propagates_fallback_error() {
        let primary = MockProvider::failing("primary", MockError::Unavailable);
        let fallback = MockProvider::failing("fallback", MockError::RequestFailed);

        let gw = LlmGateway::new(Box::new(primary.clone()), Box::new(fallback.clone()));
        let result = gw.generate(test_request()).await;

        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), LlmError::RequestFailed(_)));
        assert_eq!(primary.calls(), 1);
        assert_eq!(fallback.calls(), 1);
    }

    // -- generate_stream tests --

    #[tokio::test]
    async fn generate_stream_returns_primary_on_success() {
        let primary = MockProvider::success("primary", "text");
        let fallback = MockProvider::success("fallback", "fb");

        let gw = LlmGateway::new(Box::new(primary.clone()), Box::new(fallback.clone()));
        let stream = gw.generate_stream(test_request()).await;

        assert!(stream.is_ok());
        assert_eq!(primary.calls(), 1);
        assert_eq!(fallback.calls(), 0);
    }

    #[tokio::test]
    async fn generate_stream_falls_back_on_unavailable() {
        let primary = MockProvider::failing("primary", MockError::Unavailable);
        let fallback = MockProvider::success("fallback", "fb");

        let gw = LlmGateway::new(Box::new(primary.clone()), Box::new(fallback.clone()));
        let stream = gw.generate_stream(test_request()).await;

        assert!(stream.is_ok());
        assert_eq!(primary.calls(), 1);
        assert_eq!(fallback.calls(), 1);
    }

    #[tokio::test]
    async fn generate_stream_falls_back_on_rate_limited() {
        let primary = MockProvider::failing("primary", MockError::RateLimited);
        let fallback = MockProvider::success("fallback", "fb");

        let gw = LlmGateway::new(Box::new(primary.clone()), Box::new(fallback.clone()));
        let stream = gw.generate_stream(test_request()).await;

        assert!(stream.is_ok());
        assert_eq!(primary.calls(), 1);
        assert_eq!(fallback.calls(), 1);
    }

    #[tokio::test]
    async fn generate_stream_falls_back_on_request_failed() {
        let primary = MockProvider::failing("primary", MockError::RequestFailed);
        let fallback = MockProvider::success("fallback", "fb");

        let gw = LlmGateway::new(Box::new(primary.clone()), Box::new(fallback.clone()));
        let stream = gw.generate_stream(test_request()).await;

        assert!(stream.is_ok());
        assert_eq!(primary.calls(), 1);
        assert_eq!(fallback.calls(), 1);
    }

    #[tokio::test]
    async fn generate_stream_does_not_failover_on_invalid_response() {
        let primary = MockProvider::failing("primary", MockError::InvalidResponse);
        let fallback = MockProvider::success("fallback", "fb");

        let gw = LlmGateway::new(Box::new(primary.clone()), Box::new(fallback.clone()));
        let result = gw.generate_stream(test_request()).await;

        match result {
            Err(LlmError::InvalidResponse(_)) => {} // expected
            Err(other) => panic!("expected InvalidResponse, got: {other}"),
            Ok(_) => panic!("expected error, got Ok"),
        }
        assert_eq!(primary.calls(), 1);
        assert_eq!(fallback.calls(), 0);
    }

    #[tokio::test]
    async fn generate_stream_propagates_fallback_error() {
        let primary = MockProvider::failing("primary", MockError::RateLimited);
        let fallback = MockProvider::failing("fallback", MockError::Unavailable);

        let gw = LlmGateway::new(Box::new(primary.clone()), Box::new(fallback.clone()));
        let result = gw.generate_stream(test_request()).await;

        match result {
            Err(LlmError::Unavailable(_)) => {} // expected
            Err(other) => panic!("expected Unavailable, got: {other}"),
            Ok(_) => panic!("expected error, got Ok"),
        }
        assert_eq!(primary.calls(), 1);
        assert_eq!(fallback.calls(), 1);
    }

    // -- gateway name --

    #[test]
    fn gateway_name_is_gateway() {
        let primary = MockProvider::success("p", "t");
        let fallback = MockProvider::success("f", "t");
        let gw = LlmGateway::new(Box::new(primary), Box::new(fallback));
        assert_eq!(gw.name(), "gateway");
    }
}
