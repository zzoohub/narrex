use chrono::{DateTime, Utc};
use sqlx::FromRow;
use uuid::Uuid;

use crate::domain::character::error::CharacterError;
use crate::domain::character::models::{Character, CreateCharacter, UpdateCharacter};
use crate::domain::character::ports::CharacterRepository;

use super::Postgres;

#[derive(FromRow)]
struct CharacterRow {
    id: Uuid,
    project_id: Uuid,
    name: String,
    personality: Option<String>,
    appearance: Option<String>,
    secrets: Option<String>,
    motivation: Option<String>,
    profile_image_url: Option<String>,
    graph_x: Option<f64>,
    graph_y: Option<f64>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

impl CharacterRow {
    fn into_domain(self) -> Character {
        Character {
            id: self.id,
            project_id: self.project_id,
            name: self.name,
            personality: self.personality,
            appearance: self.appearance,
            secrets: self.secrets,
            motivation: self.motivation,
            profile_image_url: self.profile_image_url,
            graph_x: self.graph_x,
            graph_y: self.graph_y,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

#[async_trait::async_trait]
impl CharacterRepository for Postgres {
    async fn create(
        &self,
        project_id: Uuid,
        input: &CreateCharacter,
    ) -> Result<Character, CharacterError> {
        let row = sqlx::query_as::<_, CharacterRow>(
            "INSERT INTO character (project_id, name, personality, appearance, secrets, motivation, profile_image_url, graph_x, graph_y) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) \
             RETURNING id, project_id, name, personality, appearance, secrets, motivation, profile_image_url, graph_x, graph_y, created_at, updated_at",
        )
        .bind(project_id)
        .bind(&input.name)
        .bind(&input.personality)
        .bind(&input.appearance)
        .bind(&input.secrets)
        .bind(&input.motivation)
        .bind(&input.profile_image_url)
        .bind(input.graph_x)
        .bind(input.graph_y)
        .fetch_one(self.pool())
        .await
        .map_err(|e| CharacterError::Unknown(e.into()))?;

        Ok(row.into_domain())
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Option<Character>, CharacterError> {
        let row = sqlx::query_as::<_, CharacterRow>(
            "SELECT id, project_id, name, personality, appearance, secrets, motivation, profile_image_url, graph_x, graph_y, created_at, updated_at \
             FROM character WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(self.pool())
        .await
        .map_err(|e| CharacterError::Unknown(e.into()))?;

        Ok(row.map(CharacterRow::into_domain))
    }

    async fn find_by_project_id(&self, project_id: Uuid) -> Result<Vec<Character>, CharacterError> {
        let rows = sqlx::query_as::<_, CharacterRow>(
            "SELECT id, project_id, name, personality, appearance, secrets, motivation, profile_image_url, graph_x, graph_y, created_at, updated_at \
             FROM character WHERE project_id = $1",
        )
        .bind(project_id)
        .fetch_all(self.pool())
        .await
        .map_err(|e| CharacterError::Unknown(e.into()))?;

        Ok(rows.into_iter().map(CharacterRow::into_domain).collect())
    }

    async fn update(
        &self,
        id: Uuid,
        update: &UpdateCharacter,
    ) -> Result<Character, CharacterError> {
        let row = sqlx::query_as::<_, CharacterRow>(
            "UPDATE character SET \
                name = COALESCE($2, name), \
                personality = CASE WHEN $3 THEN $4 ELSE personality END, \
                appearance = CASE WHEN $5 THEN $6 ELSE appearance END, \
                secrets = CASE WHEN $7 THEN $8 ELSE secrets END, \
                motivation = CASE WHEN $9 THEN $10 ELSE motivation END, \
                profile_image_url = CASE WHEN $11 THEN $12 ELSE profile_image_url END, \
                graph_x = CASE WHEN $13 THEN $14 ELSE graph_x END, \
                graph_y = CASE WHEN $15 THEN $16 ELSE graph_y END \
             WHERE id = $1 \
             RETURNING id, project_id, name, personality, appearance, secrets, motivation, profile_image_url, graph_x, graph_y, created_at, updated_at",
        )
        .bind(id)
        // name
        .bind(update.name.as_deref())
        // personality
        .bind(update.personality.is_some())
        .bind(update.personality.as_ref().and_then(|v| v.as_deref()))
        // appearance
        .bind(update.appearance.is_some())
        .bind(update.appearance.as_ref().and_then(|v| v.as_deref()))
        // secrets
        .bind(update.secrets.is_some())
        .bind(update.secrets.as_ref().and_then(|v| v.as_deref()))
        // motivation
        .bind(update.motivation.is_some())
        .bind(update.motivation.as_ref().and_then(|v| v.as_deref()))
        // profile_image_url
        .bind(update.profile_image_url.is_some())
        .bind(update.profile_image_url.as_ref().and_then(|v| v.as_deref()))
        // graph_x
        .bind(update.graph_x.is_some())
        .bind(update.graph_x.as_ref().and_then(|v| *v))
        // graph_y
        .bind(update.graph_y.is_some())
        .bind(update.graph_y.as_ref().and_then(|v| *v))
        .fetch_one(self.pool())
        .await
        .map_err(|e| CharacterError::Unknown(e.into()))?;

        Ok(row.into_domain())
    }

    async fn delete(&self, id: Uuid) -> Result<(), CharacterError> {
        sqlx::query("DELETE FROM character WHERE id = $1")
            .bind(id)
            .execute(self.pool())
            .await
            .map_err(|e| CharacterError::Unknown(e.into()))?;
        Ok(())
    }
}
