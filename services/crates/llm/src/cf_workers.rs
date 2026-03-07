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
