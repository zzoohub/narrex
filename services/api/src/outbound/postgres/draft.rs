use chrono::{DateTime, Utc};
use sqlx::FromRow;
use uuid::Uuid;

use crate::domain::ai::error::AiError;
use crate::domain::ai::models::{CreateDraftParams, Draft, DraftSource, DraftSummary};
use crate::domain::ai::ports::DraftRepository;

use super::Postgres;

#[derive(FromRow)]
struct DraftRow {
    id: Uuid,
    scene_id: Uuid,
    version: i32,
    content: String,
    char_count: i32,
    source: String,
    edit_direction: Option<String>,
    model: Option<String>,
    provider: Option<String>,
    token_count_input: Option<i32>,
    token_count_output: Option<i32>,
    created_at: DateTime<Utc>,
}

impl DraftRow {
    fn into_domain(self) -> Draft {
        Draft {
            id: self.id,
            scene_id: self.scene_id,
            version: self.version,
            content: self.content,
            char_count: self.char_count,
            source: self
                .source
                .parse::<DraftSource>()
                .unwrap_or(DraftSource::Manual),
            edit_direction: self.edit_direction,
            model: self.model,
            provider: self.provider,
            token_count_input: self.token_count_input,
            token_count_output: self.token_count_output,
            created_at: self.created_at,
        }
    }
}

#[derive(FromRow)]
struct DraftSummaryRow {
    id: Uuid,
    version: i32,
    char_count: i32,
    source: String,
    edit_direction: Option<String>,
    created_at: DateTime<Utc>,
}

impl DraftSummaryRow {
    fn into_domain(self) -> DraftSummary {
        DraftSummary {
            id: self.id,
            version: self.version,
            char_count: self.char_count,
            source: self
                .source
                .parse::<DraftSource>()
                .unwrap_or(DraftSource::Manual),
            edit_direction: self.edit_direction,
            created_at: self.created_at,
        }
    }
}

#[derive(FromRow)]
struct NextVersionRow {
    next_version: i32,
}

#[async_trait::async_trait]
impl DraftRepository for Postgres {
    async fn create(&self, params: &CreateDraftParams) -> Result<Draft, AiError> {
        let row = sqlx::query_as::<_, DraftRow>(
            "INSERT INTO draft (scene_id, version, content, source, edit_direction, model, provider, token_count_input, token_count_output, cost_usd) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) \
             RETURNING id, scene_id, version, content, char_count, source, edit_direction, model, provider, token_count_input, token_count_output, created_at",
        )
        .bind(params.scene_id)
        .bind(params.version)
        .bind(&params.content)
        .bind(params.source.to_string())
        .bind(&params.edit_direction)
        .bind(&params.model)
        .bind(&params.provider)
        .bind(params.tokens_in)
        .bind(params.tokens_out)
        .bind(params.cost)
        .fetch_one(self.pool())
        .await
        .map_err(|e| AiError::Unknown(e.into()))?;

        Ok(row.into_domain())
    }

    async fn find_latest_by_scene(&self, scene_id: Uuid) -> Result<Option<Draft>, AiError> {
        let row = sqlx::query_as::<_, DraftRow>(
            "SELECT id, scene_id, version, content, char_count, source, edit_direction, model, provider, token_count_input, token_count_output, created_at \
             FROM draft WHERE scene_id = $1 ORDER BY version DESC LIMIT 1",
        )
        .bind(scene_id)
        .fetch_optional(self.pool())
        .await
        .map_err(|e| AiError::Unknown(e.into()))?;

        Ok(row.map(DraftRow::into_domain))
    }

    async fn find_by_version(
        &self,
        scene_id: Uuid,
        version: i32,
    ) -> Result<Option<Draft>, AiError> {
        let row = sqlx::query_as::<_, DraftRow>(
            "SELECT id, scene_id, version, content, char_count, source, edit_direction, model, provider, token_count_input, token_count_output, created_at \
             FROM draft WHERE scene_id = $1 AND version = $2",
        )
        .bind(scene_id)
        .bind(version)
        .fetch_optional(self.pool())
        .await
        .map_err(|e| AiError::Unknown(e.into()))?;

        Ok(row.map(DraftRow::into_domain))
    }

    async fn list_by_scene(&self, scene_id: Uuid) -> Result<Vec<DraftSummary>, AiError> {
        let rows = sqlx::query_as::<_, DraftSummaryRow>(
            "SELECT id, version, char_count, source, edit_direction, created_at \
             FROM draft WHERE scene_id = $1 ORDER BY version DESC",
        )
        .bind(scene_id)
        .fetch_all(self.pool())
        .await
        .map_err(|e| AiError::Unknown(e.into()))?;

        Ok(rows.into_iter().map(DraftSummaryRow::into_domain).collect())
    }

    async fn next_version(&self, scene_id: Uuid) -> Result<i32, AiError> {
        let row = sqlx::query_as::<_, NextVersionRow>(
            "SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM draft WHERE scene_id = $1",
        )
        .bind(scene_id)
        .fetch_one(self.pool())
        .await
        .map_err(|e| AiError::Unknown(e.into()))?;

        Ok(row.next_version)
    }
}
