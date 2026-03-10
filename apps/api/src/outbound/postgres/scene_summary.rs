use chrono::{DateTime, Utc};
use sqlx::FromRow;
use uuid::Uuid;

use crate::domain::ai::error::AiError;
use crate::domain::ai::models::SceneSummary;
use crate::domain::ai::ports::SceneSummaryRepository;

use super::Postgres;

#[derive(FromRow)]
struct SceneSummaryRow {
    scene_id: Uuid,
    draft_version: i32,
    summary_text: String,
    model: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

impl SceneSummaryRow {
    fn into_domain(self) -> SceneSummary {
        SceneSummary {
            scene_id: self.scene_id,
            draft_version: self.draft_version,
            summary_text: self.summary_text,
            model: self.model,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

#[async_trait::async_trait]
impl SceneSummaryRepository for Postgres {
    async fn upsert(
        &self,
        scene_id: Uuid,
        draft_version: i32,
        summary_text: &str,
        model: Option<&str>,
    ) -> Result<SceneSummary, AiError> {
        let row = sqlx::query_as::<_, SceneSummaryRow>(
            "INSERT INTO scene_summary (scene_id, draft_version, summary_text, model) \
             VALUES ($1, $2, $3, $4) \
             ON CONFLICT (scene_id) DO UPDATE SET \
                 draft_version = EXCLUDED.draft_version, \
                 summary_text = EXCLUDED.summary_text, \
                 model = EXCLUDED.model \
             RETURNING scene_id, draft_version, summary_text, model, created_at, updated_at",
        )
        .bind(scene_id)
        .bind(draft_version)
        .bind(summary_text)
        .bind(model)
        .fetch_one(self.pool())
        .await
        .map_err(|e| AiError::Unknown(e.into()))?;

        Ok(row.into_domain())
    }

    async fn find_by_scene(&self, scene_id: Uuid) -> Result<Option<SceneSummary>, AiError> {
        let row = sqlx::query_as::<_, SceneSummaryRow>(
            "SELECT scene_id, draft_version, summary_text, model, created_at, updated_at \
             FROM scene_summary WHERE scene_id = $1",
        )
        .bind(scene_id)
        .fetch_optional(self.pool())
        .await
        .map_err(|e| AiError::Unknown(e.into()))?;

        Ok(row.map(SceneSummaryRow::into_domain))
    }

    async fn find_preceding(
        &self,
        project_id: Uuid,
        before_position: f64,
    ) -> Result<Vec<SceneSummary>, AiError> {
        let rows = sqlx::query_as::<_, SceneSummaryRow>(
            "SELECT ss.scene_id, ss.draft_version, ss.summary_text, ss.model, ss.created_at, ss.updated_at \
             FROM scene_summary ss \
             JOIN scene s ON s.id = ss.scene_id \
             WHERE s.project_id = $1 AND s.start_position < $2 \
             ORDER BY s.start_position",
        )
        .bind(project_id)
        .bind(before_position)
        .fetch_all(self.pool())
        .await
        .map_err(|e| AiError::Unknown(e.into()))?;

        Ok(rows.into_iter().map(SceneSummaryRow::into_domain).collect())
    }
}
