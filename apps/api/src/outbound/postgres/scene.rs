use chrono::{DateTime, Utc};
use sqlx::FromRow;
use uuid::Uuid;

use crate::domain::ai::models::{Draft, DraftSource};
use crate::domain::timeline::error::TimelineError;
use crate::domain::timeline::models::{
    CreateScene, Scene, SceneDetail, SceneStatus, UpdateScene,
};
use crate::domain::timeline::ports::{SceneCharacterRepository, SceneRepository};

use super::Postgres;

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

#[derive(FromRow)]
struct SceneRow {
    id: Uuid,
    track_id: Uuid,
    project_id: Uuid,
    start_position: f64,
    duration: f64,
    status: String,
    title: String,
    plot_summary: Option<String>,
    location: Option<String>,
    mood_tags: Vec<String>,
    content: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

impl SceneRow {
    fn into_domain(self, character_ids: Vec<Uuid>) -> Scene {
        Scene {
            id: self.id,
            track_id: self.track_id,
            project_id: self.project_id,
            start_position: self.start_position,
            duration: self.duration,
            status: self
                .status
                .parse::<SceneStatus>()
                .unwrap_or(SceneStatus::Empty),
            title: self.title,
            plot_summary: self.plot_summary,
            location: self.location,
            mood_tags: self.mood_tags,
            content: self.content,
            character_ids,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

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
struct SceneCharacterRow {
    character_id: Uuid,
}

#[derive(FromRow)]
struct MaxPositionRow {
    max_pos: Option<f64>,
}

// ---------------------------------------------------------------------------
// SceneRepository impl
// ---------------------------------------------------------------------------

#[async_trait::async_trait]
impl SceneRepository for Postgres {
    async fn create(
        &self,
        project_id: Uuid,
        input: &CreateScene,
    ) -> Result<Scene, TimelineError> {
        let start_position = input.start_position.unwrap_or(0.0);
        let duration = input.duration.unwrap_or(1.0);

        let mut tx = self
            .pool()
            .begin()
            .await
            .map_err(|e| TimelineError::Unknown(e.into()))?;

        let row = sqlx::query_as::<_, SceneRow>(
            "INSERT INTO scene (track_id, project_id, start_position, duration, title, plot_summary, location, mood_tags) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) \
             RETURNING id, track_id, project_id, start_position, duration, status::text, title, plot_summary, location, mood_tags, content, created_at, updated_at",
        )
        .bind(input.track_id)
        .bind(project_id)
        .bind(start_position)
        .bind(duration)
        .bind(&input.title)
        .bind(&input.plot_summary)
        .bind(&input.location)
        .bind(&input.mood_tags)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| TimelineError::Unknown(e.into()))?;

        // Insert scene_character assignments.
        for character_id in &input.character_ids {
            sqlx::query(
                "INSERT INTO scene_character (scene_id, character_id) VALUES ($1, $2)",
            )
            .bind(row.id)
            .bind(character_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| TimelineError::Unknown(e.into()))?;
        }

        tx.commit()
            .await
            .map_err(|e| TimelineError::Unknown(e.into()))?;

        Ok(row.into_domain(input.character_ids.clone()))
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Option<Scene>, TimelineError> {
        let row = sqlx::query_as::<_, SceneRow>(
            "SELECT id, track_id, project_id, start_position, duration, status::text, title, plot_summary, location, mood_tags, content, created_at, updated_at \
             FROM scene WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(self.pool())
        .await
        .map_err(|e| TimelineError::Unknown(e.into()))?;

        match row {
            Some(scene_row) => {
                let char_rows = sqlx::query_as::<_, SceneCharacterRow>(
                    "SELECT character_id FROM scene_character WHERE scene_id = $1",
                )
                .bind(id)
                .fetch_all(self.pool())
                .await
                .map_err(|e| TimelineError::Unknown(e.into()))?;

                let character_ids: Vec<Uuid> =
                    char_rows.into_iter().map(|r| r.character_id).collect();
                Ok(Some(scene_row.into_domain(character_ids)))
            }
            None => Ok(None),
        }
    }

    async fn find_detail_by_id(&self, id: Uuid) -> Result<Option<SceneDetail>, TimelineError> {
        let scene = self.find_by_id(id).await?;
        match scene {
            Some(scene) => {
                let draft_row = sqlx::query_as::<_, DraftRow>(
                    "SELECT id, scene_id, version, content, char_count, source, edit_direction, model, provider, token_count_input, token_count_output, created_at \
                     FROM draft WHERE scene_id = $1 ORDER BY version DESC LIMIT 1",
                )
                .bind(id)
                .fetch_optional(self.pool())
                .await
                .map_err(|e| TimelineError::Unknown(e.into()))?;

                Ok(Some(SceneDetail {
                    scene,
                    latest_draft: draft_row.map(DraftRow::into_domain),
                }))
            }
            None => Ok(None),
        }
    }

    async fn update(&self, id: Uuid, update: &UpdateScene) -> Result<Scene, TimelineError> {
        let status_str = update.status.as_ref().map(|s| s.to_string());
        let row = sqlx::query_as::<_, SceneRow>(
            "UPDATE scene SET \
                track_id = COALESCE($2, track_id), \
                title = COALESCE($3, title), \
                start_position = COALESCE($4, start_position), \
                duration = COALESCE($5, duration), \
                plot_summary = CASE WHEN $6 THEN $7 ELSE plot_summary END, \
                location = CASE WHEN $8 THEN $9 ELSE location END, \
                mood_tags = COALESCE($10, mood_tags), \
                content = CASE WHEN $11 THEN $12 ELSE content END, \
                status = COALESCE($13::scene_status, status) \
             WHERE id = $1 \
             RETURNING id, track_id, project_id, start_position, duration, status::text, title, plot_summary, location, mood_tags, content, created_at, updated_at",
        )
        .bind(id)
        .bind(update.track_id)
        .bind(update.title.as_deref())
        .bind(update.start_position)
        .bind(update.duration)
        // plot_summary: Option<Option<String>>
        .bind(update.plot_summary.is_some())
        .bind(update.plot_summary.as_ref().and_then(|v| v.as_deref()))
        // location: Option<Option<String>>
        .bind(update.location.is_some())
        .bind(update.location.as_ref().and_then(|v| v.as_deref()))
        // mood_tags: Option<Vec<String>>
        .bind(update.mood_tags.as_ref())
        // content: Option<Option<String>>
        .bind(update.content.is_some())
        .bind(update.content.as_ref().and_then(|v| v.as_deref()))
        // status: Option<SceneStatus>
        .bind(status_str.as_deref())
        .fetch_one(self.pool())
        .await
        .map_err(|e| TimelineError::Unknown(e.into()))?;

        // Re-fetch character_ids.
        let char_rows = sqlx::query_as::<_, SceneCharacterRow>(
            "SELECT character_id FROM scene_character WHERE scene_id = $1",
        )
        .bind(id)
        .fetch_all(self.pool())
        .await
        .map_err(|e| TimelineError::Unknown(e.into()))?;

        let character_ids: Vec<Uuid> = char_rows.into_iter().map(|r| r.character_id).collect();
        Ok(row.into_domain(character_ids))
    }

    async fn delete(&self, id: Uuid) -> Result<(), TimelineError> {
        sqlx::query("DELETE FROM scene WHERE id = $1")
            .bind(id)
            .execute(self.pool())
            .await
            .map_err(|e| TimelineError::Unknown(e.into()))?;
        Ok(())
    }

    async fn find_max_position(&self, track_id: Uuid) -> Result<f64, TimelineError> {
        let row = sqlx::query_as::<_, MaxPositionRow>(
            "SELECT MAX(start_position + duration) as max_pos FROM scene WHERE track_id = $1",
        )
        .bind(track_id)
        .fetch_one(self.pool())
        .await
        .map_err(|e| TimelineError::Unknown(e.into()))?;

        Ok(row.max_pos.unwrap_or(0.0))
    }

    async fn mark_needs_revision(&self, project_id: Uuid) -> Result<(), TimelineError> {
        sqlx::query(
            "UPDATE scene SET status = 'needs_revision' \
             WHERE project_id = $1 AND status::text IN ('ai_draft', 'edited')",
        )
        .bind(project_id)
        .execute(self.pool())
        .await
        .map_err(|e| TimelineError::Unknown(e.into()))?;
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// SceneCharacterRepository impl
// ---------------------------------------------------------------------------

#[async_trait::async_trait]
impl SceneCharacterRepository for Postgres {
    async fn set_characters(
        &self,
        scene_id: Uuid,
        character_ids: &[Uuid],
    ) -> Result<(), TimelineError> {
        let mut tx = self
            .pool()
            .begin()
            .await
            .map_err(|e| TimelineError::Unknown(e.into()))?;

        // Delete existing assignments.
        sqlx::query("DELETE FROM scene_character WHERE scene_id = $1")
            .bind(scene_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| TimelineError::Unknown(e.into()))?;

        // Insert new assignments.
        for character_id in character_ids {
            sqlx::query(
                "INSERT INTO scene_character (scene_id, character_id) VALUES ($1, $2)",
            )
            .bind(scene_id)
            .bind(character_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| TimelineError::Unknown(e.into()))?;
        }

        tx.commit()
            .await
            .map_err(|e| TimelineError::Unknown(e.into()))?;

        Ok(())
    }
}
