use std::pin::Pin;

use async_stream::try_stream;
use futures::Stream;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tokio_stream::StreamExt;
use tracing::{debug, warn};

use crate::provider::{GenerateRequest, GenerateResponse, LlmError, LlmProvider, StreamChunk, StreamUsage};

pub struct CfWorkersAiProvider {
    client: Client,
    account_id: String,
    api_token: String,
    model: String,
}

impl CfWorkersAiProvider {
    pub fn new(account_id: String, api_token: String) -> Self {
        Self {
            client: Client::new(),
            account_id,
            api_token,
            model: "@cf/meta/llama-3.1-70b-instruct".to_string(),
        }
    }

    pub fn with_model(mut self, model: String) -> Self {
        self.model = model;
        self
    }

    fn endpoint(&self) -> String {
        format!(
            "https://api.cloudflare.com/client/v4/accounts/{}/ai/run/{}",
            self.account_id, self.model
        )
    }
}

#[derive(Serialize)]
struct CfRequest {
    messages: Vec<CfMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    stream: bool,
}

#[derive(Serialize)]
struct CfMessage {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct CfResponse {
    result: Option<CfResult>,
    success: bool,
    errors: Vec<CfError>,
}

#[derive(Deserialize)]
struct CfResult {
    response: Option<String>,
    usage: Option<CfUsage>,
}

#[derive(Deserialize)]
struct CfUsage {
    prompt_tokens: Option<u32>,
    completion_tokens: Option<u32>,
}

#[derive(Deserialize)]
struct CfError {
    message: String,
}

#[derive(Deserialize)]
struct CfStreamData {
    response: Option<String>,
    #[allow(dead_code)]
    usage: Option<CfUsage>,
}

impl CfWorkersAiProvider {
    fn build_request(&self, req: &GenerateRequest, stream: bool) -> CfRequest {
        let mut messages = vec![];
        if !req.system_prompt.is_empty() {
            messages.push(CfMessage {
                role: "system".to_string(),
                content: req.system_prompt.clone(),
            });
        }
        messages.push(CfMessage {
            role: "user".to_string(),
            content: req.user_prompt.clone(),
        });

        CfRequest {
            messages,
            max_tokens: req.max_tokens,
            temperature: req.temperature,
            stream,
        }
    }
}

#[async_trait::async_trait]
impl LlmProvider for CfWorkersAiProvider {
    async fn generate(&self, req: GenerateRequest) -> Result<GenerateResponse, LlmError> {
        let body = self.build_request(&req, false);
        let response = self
            .client
            .post(self.endpoint())
            .bearer_auth(&self.api_token)
            .json(&body)
            .send()
            .await
            .map_err(|e| LlmError::RequestFailed(e.to_string()))?;

        let status = response.status();
        if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
            return Err(LlmError::RateLimited);
        }
        if !status.is_success() {
            let text = response.text().await.unwrap_or_default();
            return Err(LlmError::RequestFailed(format!("HTTP {status}: {text}")));
        }

        let cf_resp: CfResponse = response
            .json()
            .await
            .map_err(|e| LlmError::InvalidResponse(e.to_string()))?;

        if !cf_resp.success {
            let msg = cf_resp
                .errors
                .first()
                .map(|e| e.message.clone())
                .unwrap_or_else(|| "unknown error".into());
            return Err(LlmError::RequestFailed(msg));
        }

        let result = cf_resp
            .result
            .ok_or_else(|| LlmError::InvalidResponse("missing result".into()))?;
        let text = result
            .response
            .ok_or_else(|| LlmError::InvalidResponse("missing response text".into()))?;

        let (input_tokens, output_tokens) = result
            .usage
            .map(|u| (u.prompt_tokens.unwrap_or(0), u.completion_tokens.unwrap_or(0)))
            .unwrap_or((0, 0));

        Ok(GenerateResponse {
            text,
            model: self.model.clone(),
            provider: self.name().to_string(),
            token_count_input: input_tokens,
            token_count_output: output_tokens,
        })
    }

    async fn generate_stream(
        &self,
        req: GenerateRequest,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<StreamChunk, LlmError>> + Send>>, LlmError> {
        let body = self.build_request(&req, true);
        let response = self
            .client
            .post(self.endpoint())
            .bearer_auth(&self.api_token)
            .json(&body)
            .send()
            .await
            .map_err(|e| LlmError::RequestFailed(e.to_string()))?;

        let status = response.status();
        if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
            return Err(LlmError::RateLimited);
        }
        if !status.is_success() {
            let text = response.text().await.unwrap_or_default();
            return Err(LlmError::RequestFailed(format!("HTTP {status}: {text}")));
        }

        let model = self.model.clone();
        let provider_name = self.name().to_string();
        let byte_stream = response.bytes_stream();

        let stream = try_stream! {
            let mut buffer = String::new();
            let mut total_output = String::new();
            let mut byte_stream = Box::pin(byte_stream);

            while let Some(chunk) = byte_stream.next().await {
                let chunk = chunk.map_err(|e| LlmError::RequestFailed(e.to_string()))?;
                buffer.push_str(&String::from_utf8_lossy(&chunk));

                while let Some(newline_pos) = buffer.find('\n') {
                    let line = buffer[..newline_pos].trim().to_string();
                    buffer = buffer[newline_pos + 1..].to_string();

                    if line.is_empty() {
                        continue;
                    }

                    let data = match line.strip_prefix("data: ") {
                        Some(d) => d,
                        None => continue,
                    };

                    if data == "[DONE]" {
                        yield StreamChunk {
                            text: String::new(),
                            done: true,
                            usage: Some(StreamUsage {
                                model: model.clone(),
                                provider: provider_name.clone(),
                                token_count_input: 0,
                                token_count_output: total_output.split_whitespace().count() as u32,
                            }),
                        };
                        return;
                    }

                    match serde_json::from_str::<CfStreamData>(data) {
                        Ok(parsed) => {
                            if let Some(text) = parsed.response {
                                total_output.push_str(&text);
                                yield StreamChunk {
                                    text,
                                    done: false,
                                    usage: None,
                                };
                            }
                        }
                        Err(e) => {
                            debug!("skipping unparseable SSE data: {e}");
                        }
                    }
                }
            }

            warn!("CF Workers AI stream ended without [DONE]");
            yield StreamChunk {
                text: String::new(),
                done: true,
                usage: Some(StreamUsage {
                    model: model.clone(),
                    provider: provider_name.clone(),
                    token_count_input: 0,
                    token_count_output: total_output.split_whitespace().count() as u32,
                }),
            };
        };

        Ok(Box::pin(stream))
    }

    fn name(&self) -> &str {
        "cf_workers_ai"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_provider() -> CfWorkersAiProvider {
        CfWorkersAiProvider::new("test-account-id".into(), "test-api-token".into())
    }

    #[test]
    fn default_model() {
        let p = make_provider();
        assert_eq!(p.model, "@cf/meta/llama-3.1-70b-instruct");
    }

    #[test]
    fn with_model_overrides_default() {
        let p = make_provider().with_model("custom-model".into());
        assert_eq!(p.model, "custom-model");
    }

    #[test]
    fn endpoint_contains_account_id_and_model() {
        let p = make_provider();
        let ep = p.endpoint();
        assert!(ep.contains("test-account-id"));
        assert!(ep.contains("@cf/meta/llama-3.1-70b-instruct"));
        assert!(ep.starts_with("https://api.cloudflare.com/client/v4/accounts/"));
    }

    #[test]
    fn endpoint_with_custom_model() {
        let p = make_provider().with_model("my-model".into());
        let ep = p.endpoint();
        assert!(ep.contains("my-model"));
        assert!(!ep.contains("llama"));
    }

    #[test]
    fn build_request_with_system_prompt() {
        let p = make_provider();
        let req = GenerateRequest {
            system_prompt: "you are helpful".into(),
            user_prompt: "hello".into(),
            max_tokens: Some(100),
            temperature: Some(0.7),
        };
        let cf_req = p.build_request(&req, false);
        assert_eq!(cf_req.messages.len(), 2);
        assert_eq!(cf_req.messages[0].role, "system");
        assert_eq!(cf_req.messages[0].content, "you are helpful");
        assert_eq!(cf_req.messages[1].role, "user");
        assert_eq!(cf_req.messages[1].content, "hello");
        assert_eq!(cf_req.max_tokens, Some(100));
        assert_eq!(cf_req.temperature, Some(0.7));
        assert!(!cf_req.stream);
    }

    #[test]
    fn build_request_without_system_prompt() {
        let p = make_provider();
        let req = GenerateRequest {
            system_prompt: String::new(),
            user_prompt: "hello".into(),
            max_tokens: None,
            temperature: None,
        };
        let cf_req = p.build_request(&req, false);
        assert_eq!(cf_req.messages.len(), 1);
        assert_eq!(cf_req.messages[0].role, "user");
        assert!(cf_req.max_tokens.is_none());
        assert!(cf_req.temperature.is_none());
    }

    #[test]
    fn build_request_streaming_flag() {
        let p = make_provider();
        let req = GenerateRequest {
            system_prompt: String::new(),
            user_prompt: "hello".into(),
            max_tokens: None,
            temperature: None,
        };
        let cf_req_stream = p.build_request(&req, true);
        assert!(cf_req_stream.stream);

        let cf_req_no_stream = p.build_request(&req, false);
        assert!(!cf_req_no_stream.stream);
    }

    #[test]
    fn name_returns_cf_workers_ai() {
        let p = make_provider();
        assert_eq!(p.name(), "cf_workers_ai");
    }

    #[test]
    fn cf_request_serialization_skips_none() {
        let req = CfRequest {
            messages: vec![CfMessage {
                role: "user".into(),
                content: "hi".into(),
            }],
            max_tokens: None,
            temperature: None,
            stream: false,
        };
        let json = serde_json::to_string(&req).unwrap();
        assert!(!json.contains("max_tokens"));
        assert!(!json.contains("temperature"));
    }

    #[test]
    fn cf_request_serialization_includes_values() {
        let req = CfRequest {
            messages: vec![CfMessage {
                role: "user".into(),
                content: "hi".into(),
            }],
            max_tokens: Some(256),
            temperature: Some(0.5),
            stream: true,
        };
        let json = serde_json::to_string(&req).unwrap();
        assert!(json.contains("\"max_tokens\":256"));
        assert!(json.contains("\"temperature\":0.5"));
        assert!(json.contains("\"stream\":true"));
    }

    #[test]
    fn cf_response_deserialization_success() {
        let json = r#"{"result":{"response":"hello world","usage":{"prompt_tokens":10,"completion_tokens":5}},"success":true,"errors":[]}"#;
        let resp: CfResponse = serde_json::from_str(json).unwrap();
        assert!(resp.success);
        assert!(resp.errors.is_empty());
        let result = resp.result.unwrap();
        assert_eq!(result.response.unwrap(), "hello world");
        let usage = result.usage.unwrap();
        assert_eq!(usage.prompt_tokens.unwrap(), 10);
        assert_eq!(usage.completion_tokens.unwrap(), 5);
    }

    #[test]
    fn cf_response_deserialization_error() {
        let json = r#"{"result":null,"success":false,"errors":[{"message":"rate limited"}]}"#;
        let resp: CfResponse = serde_json::from_str(json).unwrap();
        assert!(!resp.success);
        assert_eq!(resp.errors.len(), 1);
        assert_eq!(resp.errors[0].message, "rate limited");
        assert!(resp.result.is_none());
    }

    #[test]
    fn cf_response_missing_usage() {
        let json = r#"{"result":{"response":"text","usage":null},"success":true,"errors":[]}"#;
        let resp: CfResponse = serde_json::from_str(json).unwrap();
        assert!(resp.success);
        let result = resp.result.unwrap();
        assert!(result.usage.is_none());
    }

    #[test]
    fn cf_stream_data_deserialization() {
        let json = r#"{"response":"chunk text","usage":null}"#;
        let data: CfStreamData = serde_json::from_str(json).unwrap();
        assert_eq!(data.response.unwrap(), "chunk text");
    }
}
