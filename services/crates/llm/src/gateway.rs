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
