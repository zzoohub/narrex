use chrono::{DateTime, Utc};
use sqlx::FromRow;
use uuid::Uuid;

use crate::domain::timeline::error::TimelineError;
use crate::domain::timeline::models::{CreateTrack, Track, UpdateTrack};
use crate::domain::timeline::ports::TrackRepository;

use super::Postgres;

#[derive(FromRow)]
struct TrackRow {
    id: Uuid,
    project_id: Uuid,
    position: f64,
    label: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

impl TrackRow {
    fn into_domain(self) -> Track {
        Track {
            id: self.id,
            project_id: self.project_id,
            position: self.position,
            label: self.label,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

#[derive(FromRow)]
struct CountRow {
    count: i64,
}

#[derive(FromRow)]
struct MaxPositionRow {
    max_pos: Option<f64>,
}

#[async_trait::async_trait]
impl TrackRepository for Postgres {
    async fn create(&self, project_id: Uuid, input: &CreateTrack) -> Result<Track, TimelineError> {
        let position = input.position.unwrap_or(1.0);

        let row = sqlx::query_as::<_, TrackRow>(
            "INSERT INTO track (project_id, position, label) \
             VALUES ($1, $2, $3) \
             RETURNING id, project_id, position, label, created_at, updated_at",
        )
        .bind(project_id)
        .bind(position)
        .bind(&input.label)
        .fetch_one(self.pool())
        .await
        .map_err(|e| TimelineError::Unknown(e.into()))?;

        Ok(row.into_domain())
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Option<Track>, TimelineError> {
        let row = sqlx::query_as::<_, TrackRow>(
            "SELECT id, project_id, position, label, created_at, updated_at \
             FROM track WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(self.pool())
        .await
        .map_err(|e| TimelineError::Unknown(e.into()))?;

        Ok(row.map(TrackRow::into_domain))
    }

    async fn update(&self, id: Uuid, update: &UpdateTrack) -> Result<Track, TimelineError> {
        let row = sqlx::query_as::<_, TrackRow>(
            "UPDATE track SET \
                label = CASE WHEN $2 THEN $3 ELSE label END, \
                position = COALESCE($4, position) \
             WHERE id = $1 \
             RETURNING id, project_id, position, label, created_at, updated_at",
        )
        .bind(id)
        .bind(update.label.is_some())
        .bind(update.label.as_ref().and_then(|v| v.as_deref()))
        .bind(update.position)
        .fetch_one(self.pool())
        .await
        .map_err(|e| TimelineError::Unknown(e.into()))?;

        Ok(row.into_domain())
    }

    async fn delete(&self, id: Uuid) -> Result<(), TimelineError> {
        sqlx::query("DELETE FROM track WHERE id = $1")
            .bind(id)
            .execute(self.pool())
            .await
            .map_err(|e| TimelineError::Unknown(e.into()))?;
        Ok(())
    }

    async fn count_scenes(&self, track_id: Uuid) -> Result<i64, TimelineError> {
        let row = sqlx::query_as::<_, CountRow>(
            "SELECT COUNT(*) as count FROM scene WHERE track_id = $1",
        )
        .bind(track_id)
        .fetch_one(self.pool())
        .await
        .map_err(|e| TimelineError::Unknown(e.into()))?;

        Ok(row.count)
    }

    async fn find_max_position(&self, project_id: Uuid) -> Result<f64, TimelineError> {
        let row = sqlx::query_as::<_, MaxPositionRow>(
            "SELECT MAX(position) as max_pos FROM track WHERE project_id = $1",
        )
        .bind(project_id)
        .fetch_one(self.pool())
        .await
        .map_err(|e| TimelineError::Unknown(e.into()))?;

        Ok(row.max_pos.unwrap_or(0.0))
    }
}
