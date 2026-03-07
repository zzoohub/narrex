use chrono::{DateTime, Utc};
use sqlx::FromRow;
use uuid::Uuid;

use crate::domain::timeline::error::TimelineError;
use crate::domain::timeline::models::{ConnectionType, CreateConnection, SceneConnection};
use crate::domain::timeline::ports::ConnectionRepository;

use super::Postgres;

#[derive(FromRow)]
struct ConnectionRow {
    id: Uuid,
    project_id: Uuid,
    source_scene_id: Uuid,
    target_scene_id: Uuid,
    connection_type: String,
    created_at: DateTime<Utc>,
}

impl ConnectionRow {
    fn into_domain(self) -> SceneConnection {
        SceneConnection {
            id: self.id,
            project_id: self.project_id,
            source_scene_id: self.source_scene_id,
            target_scene_id: self.target_scene_id,
            connection_type: self
                .connection_type
                .parse::<ConnectionType>()
                .unwrap_or(ConnectionType::Branch),
            created_at: self.created_at,
        }
    }
}

#[derive(FromRow)]
struct ExistsRow {
    exists: Option<bool>,
}

#[async_trait::async_trait]
impl ConnectionRepository for Postgres {
    async fn create(
        &self,
        project_id: Uuid,
        input: &CreateConnection,
    ) -> Result<SceneConnection, TimelineError> {
        let row = sqlx::query_as::<_, ConnectionRow>(
            "INSERT INTO scene_connection (project_id, source_scene_id, target_scene_id, connection_type) \
             VALUES ($1, $2, $3, $4::connection_type) \
             RETURNING id, project_id, source_scene_id, target_scene_id, connection_type::text, created_at",
        )
        .bind(project_id)
        .bind(input.source_scene_id)
        .bind(input.target_scene_id)
        .bind(input.connection_type.to_string())
        .fetch_one(self.pool())
        .await
        .map_err(|e| TimelineError::Unknown(e.into()))?;

        Ok(row.into_domain())
    }

    async fn delete(&self, id: Uuid) -> Result<(), TimelineError> {
        let result = sqlx::query("DELETE FROM scene_connection WHERE id = $1")
            .bind(id)
            .execute(self.pool())
            .await
            .map_err(|e| TimelineError::Unknown(e.into()))?;

        if result.rows_affected() == 0 {
            return Err(TimelineError::ConnectionNotFound);
        }

        Ok(())
    }

    async fn exists(
        &self,
        source_scene_id: Uuid,
        target_scene_id: Uuid,
    ) -> Result<bool, TimelineError> {
        let row = sqlx::query_as::<_, ExistsRow>(
            "SELECT EXISTS(SELECT 1 FROM scene_connection WHERE source_scene_id = $1 AND target_scene_id = $2) as exists",
        )
        .bind(source_scene_id)
        .bind(target_scene_id)
        .fetch_one(self.pool())
        .await
        .map_err(|e| TimelineError::Unknown(e.into()))?;

        Ok(row.exists.unwrap_or(false))
    }
}
