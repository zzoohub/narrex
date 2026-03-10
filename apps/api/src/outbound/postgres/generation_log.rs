use chrono::{DateTime, Utc};
use sqlx::FromRow;
use uuid::Uuid;

use crate::domain::ai::error::AiError;
use crate::domain::ai::models::{CostSummary, GenerationLog};
use crate::domain::ai::ports::GenerationLogRepository;

use super::Postgres;

#[derive(FromRow)]
struct CostSummaryRow {
    total_generations: Option<i64>,
    total_tokens_input: Option<i64>,
    total_tokens_output: Option<i64>,
    total_cost_usd: Option<f64>,
}

impl CostSummaryRow {
    fn into_domain(self) -> CostSummary {
        CostSummary {
            total_generations: self.total_generations.unwrap_or(0),
            total_tokens_input: self.total_tokens_input.unwrap_or(0),
            total_tokens_output: self.total_tokens_output.unwrap_or(0),
            total_cost_usd: self.total_cost_usd.unwrap_or(0.0),
        }
    }
}

#[async_trait::async_trait]
impl GenerationLogRepository for Postgres {
    async fn create(&self, log: &GenerationLog) -> Result<(), AiError> {
        sqlx::query(
            "INSERT INTO generation_log \
                (id, user_id, project_id, scene_id, generation_type, status, model, provider, \
                 duration_ms, token_count_input, token_count_output, cost_usd, error_message) \
             VALUES ($1, $2, $3, $4, $5::generation_type, $6::generation_status, $7, $8, $9, $10, $11, $12, $13)",
        )
        .bind(log.id)
        .bind(log.user_id)
        .bind(log.project_id)
        .bind(log.scene_id)
        .bind(log.generation_type.to_string())
        .bind(log.status.to_string())
        .bind(&log.model)
        .bind(&log.provider)
        .bind(log.duration_ms)
        .bind(log.token_count_input)
        .bind(log.token_count_output)
        .bind(log.cost_usd)
        .bind(&log.error_message)
        .execute(self.pool())
        .await
        .map_err(|e| AiError::Unknown(e.into()))?;

        Ok(())
    }

    async fn cost_summary_by_user(&self, user_id: Uuid) -> Result<CostSummary, AiError> {
        let row = sqlx::query_as::<_, CostSummaryRow>(
            "SELECT \
                COUNT(*) AS total_generations, \
                SUM(token_count_input)::BIGINT AS total_tokens_input, \
                SUM(token_count_output)::BIGINT AS total_tokens_output, \
                SUM(cost_usd)::DOUBLE PRECISION AS total_cost_usd \
             FROM generation_log \
             WHERE user_id = $1",
        )
        .bind(user_id)
        .fetch_one(self.pool())
        .await
        .map_err(|e| AiError::Unknown(e.into()))?;

        Ok(row.into_domain())
    }

    async fn cost_summary_by_project(&self, project_id: Uuid) -> Result<CostSummary, AiError> {
        let row = sqlx::query_as::<_, CostSummaryRow>(
            "SELECT \
                COUNT(*) AS total_generations, \
                SUM(token_count_input)::BIGINT AS total_tokens_input, \
                SUM(token_count_output)::BIGINT AS total_tokens_output, \
                SUM(cost_usd)::DOUBLE PRECISION AS total_cost_usd \
             FROM generation_log \
             WHERE project_id = $1",
        )
        .bind(project_id)
        .fetch_one(self.pool())
        .await
        .map_err(|e| AiError::Unknown(e.into()))?;

        Ok(row.into_domain())
    }

    async fn count_by_user_since(
        &self,
        user_id: Uuid,
        since: DateTime<Utc>,
    ) -> Result<i64, AiError> {
        let row: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) \
             FROM generation_log \
             WHERE user_id = $1 \
               AND created_at >= $2 \
               AND status = 'success'",
        )
        .bind(user_id)
        .bind(since)
        .fetch_one(self.pool())
        .await
        .map_err(|e| AiError::Unknown(e.into()))?;

        Ok(row.0)
    }
}
