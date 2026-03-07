use crate::domain::ai::error::AiError;
use crate::domain::ai::models::GenerationLog;
use crate::domain::ai::ports::GenerationLogRepository;

use super::Postgres;

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
}
