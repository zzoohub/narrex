use std::pin::Pin;

use async_stream::try_stream;
use futures::Stream;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tokio_stream::StreamExt;
use tracing::debug;

use crate::provider::{GenerateRequest, GenerateResponse, LlmError, LlmProvider, StreamChunk, StreamUsage};

pub struct GeminiFlashProvider {
    client: Client,
    api_key: String,
    model: String,
}

impl GeminiFlashProvider {
    pub fn new(api_key: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
            model: "gemini-2.0-flash".to_string(),
        }
    }

    pub fn with_model(mut self, model: String) -> Self {
        self.model = model;
        self
    }

    fn endpoint(&self, streaming: bool) -> String {
        let method = if streaming {
            "streamGenerateContent?alt=sse"
        } else {
            "generateContent"
        };
        format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:{}",
            self.model, method
        )
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct GeminiRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    system_instruction: Option<GeminiContent>,
    contents: Vec<GeminiContent>,
    generation_config: GeminiGenerationConfig,
}

#[derive(Serialize, Deserialize)]
struct GeminiContent {
    #[serde(skip_serializing_if = "Option::is_none")]
    role: Option<String>,
    parts: Vec<GeminiPart>,
}

#[derive(Serialize, Deserialize)]
struct GeminiPart {
    text: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct GeminiGenerationConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    max_output_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GeminiResponse {
    candidates: Option<Vec<GeminiCandidate>>,
    usage_metadata: Option<GeminiUsageMetadata>,
}

#[derive(Deserialize)]
struct GeminiCandidate {
    content: Option<GeminiContent>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GeminiUsageMetadata {
    prompt_token_count: Option<u32>,
    candidates_token_count: Option<u32>,
}

impl GeminiFlashProvider {
    fn build_request(&self, req: &GenerateRequest) -> GeminiRequest {
        let system_instruction = if req.system_prompt.is_empty() {
            None
        } else {
            Some(GeminiContent {
                role: None,
                parts: vec![GeminiPart {
                    text: req.system_prompt.clone(),
                }],
            })
        };

        GeminiRequest {
            system_instruction,
            contents: vec![GeminiContent {
                role: Some("user".into()),
                parts: vec![GeminiPart {
                    text: req.user_prompt.clone(),
                }],
            }],
            generation_config: GeminiGenerationConfig {
                max_output_tokens: req.max_tokens,
                temperature: req.temperature,
            },
        }
    }

    fn extract_text(resp: &GeminiResponse) -> Option<String> {
        resp.candidates
            .as_ref()?
            .first()?
            .content
            .as_ref()?
            .parts
            .first()
            .map(|p| p.text.clone())
    }
}

#[async_trait::async_trait]
impl LlmProvider for GeminiFlashProvider {
    async fn generate(&self, req: GenerateRequest) -> Result<GenerateResponse, LlmError> {
        let body = self.build_request(&req);
        let response = self
            .client
            .post(self.endpoint(false))
            .query(&[("key", &self.api_key)])
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

        let gemini_resp: GeminiResponse = response
            .json()
            .await
            .map_err(|e| LlmError::InvalidResponse(e.to_string()))?;

        let text = Self::extract_text(&gemini_resp)
            .ok_or_else(|| LlmError::InvalidResponse("no text in response".into()))?;

        let (input_tokens, output_tokens) = gemini_resp
            .usage_metadata
            .map(|u| {
                (
                    u.prompt_token_count.unwrap_or(0),
                    u.candidates_token_count.unwrap_or(0),
                )
            })
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
        let body = self.build_request(&req);
        let response = self
            .client
            .post(self.endpoint(true))
            .query(&[("key", &self.api_key)])
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
            let mut last_usage: Option<GeminiUsageMetadata> = None;
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

                    match serde_json::from_str::<GeminiResponse>(data) {
                        Ok(parsed) => {
                            if let Some(ref usage) = parsed.usage_metadata {
                                last_usage = Some(GeminiUsageMetadata {
                                    prompt_token_count: usage.prompt_token_count,
                                    candidates_token_count: usage.candidates_token_count,
                                });
                            }
                            if let Some(text) = Self::extract_text(&parsed) {
                                yield StreamChunk {
                                    text,
                                    done: false,
                                    usage: None,
                                };
                            }
                        }
                        Err(e) => {
                            debug!("skipping unparseable Gemini SSE data: {e}");
                        }
                    }
                }
            }

            let usage = last_usage.map(|u| StreamUsage {
                model: model.clone(),
                provider: provider_name.clone(),
                token_count_input: u.prompt_token_count.unwrap_or(0),
                token_count_output: u.candidates_token_count.unwrap_or(0),
            });

            yield StreamChunk {
                text: String::new(),
                done: true,
                usage,
            };
        };

        Ok(Box::pin(stream))
    }

    fn name(&self) -> &str {
        "gemini_flash"
    }
}
