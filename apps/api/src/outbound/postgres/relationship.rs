use chrono::{DateTime, Utc};
use sqlx::FromRow;
use uuid::Uuid;

use crate::domain::character::error::CharacterError;
use crate::domain::character::models::{
    CharacterRelationship, CreateRelationship, RelationshipDirection, RelationshipVisual,
    UpdateRelationship,
};
use crate::domain::character::ports::RelationshipRepository;

use super::Postgres;

#[derive(FromRow)]
struct RelationshipRow {
    id: Uuid,
    project_id: Uuid,
    character_a_id: Uuid,
    character_b_id: Uuid,
    label: String,
    visual_type: String,
    direction: String,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

impl RelationshipRow {
    fn into_domain(self) -> CharacterRelationship {
        CharacterRelationship {
            id: self.id,
            project_id: self.project_id,
            character_a_id: self.character_a_id,
            character_b_id: self.character_b_id,
            label: self.label,
            visual_type: self
                .visual_type
                .parse::<RelationshipVisual>()
                .unwrap_or(RelationshipVisual::Solid),
            direction: self
                .direction
                .parse::<RelationshipDirection>()
                .unwrap_or(RelationshipDirection::Bidirectional),
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

#[derive(FromRow)]
struct ExistsRow {
    exists: Option<bool>,
}

#[async_trait::async_trait]
impl RelationshipRepository for Postgres {
    async fn create(
        &self,
        project_id: Uuid,
        input: &CreateRelationship,
    ) -> Result<CharacterRelationship, CharacterError> {
        // Enforce character_a_id < character_b_id ordering.
        let (a, b) = if input.character_a_id < input.character_b_id {
            (input.character_a_id, input.character_b_id)
        } else {
            (input.character_b_id, input.character_a_id)
        };

        let row = sqlx::query_as::<_, RelationshipRow>(
            "INSERT INTO character_relationship (project_id, character_a_id, character_b_id, label, visual_type, direction) \
             VALUES ($1, $2, $3, $4, $5::relationship_visual, $6::relationship_direction) \
             RETURNING id, project_id, character_a_id, character_b_id, label, visual_type::text, direction::text, created_at, updated_at",
        )
        .bind(project_id)
        .bind(a)
        .bind(b)
        .bind(&input.label)
        .bind(input.visual_type.to_string())
        .bind(input.direction.to_string())
        .fetch_one(self.pool())
        .await
        .map_err(|e| CharacterError::Unknown(e.into()))?;

        Ok(row.into_domain())
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Option<CharacterRelationship>, CharacterError> {
        let row = sqlx::query_as::<_, RelationshipRow>(
            "SELECT id, project_id, character_a_id, character_b_id, label, visual_type::text, direction::text, created_at, updated_at \
             FROM character_relationship WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(self.pool())
        .await
        .map_err(|e| CharacterError::Unknown(e.into()))?;

        Ok(row.map(RelationshipRow::into_domain))
    }

    async fn find_by_project_id(
        &self,
        project_id: Uuid,
    ) -> Result<Vec<CharacterRelationship>, CharacterError> {
        let rows = sqlx::query_as::<_, RelationshipRow>(
            "SELECT id, project_id, character_a_id, character_b_id, label, visual_type::text, direction::text, created_at, updated_at \
             FROM character_relationship WHERE project_id = $1",
        )
        .bind(project_id)
        .fetch_all(self.pool())
        .await
        .map_err(|e| CharacterError::Unknown(e.into()))?;

        Ok(rows.into_iter().map(RelationshipRow::into_domain).collect())
    }

    async fn update(
        &self,
        id: Uuid,
        update: &UpdateRelationship,
    ) -> Result<CharacterRelationship, CharacterError> {
        let row = sqlx::query_as::<_, RelationshipRow>(
            "UPDATE character_relationship SET \
                label = COALESCE($2, label), \
                visual_type = COALESCE($3::relationship_visual, visual_type), \
                direction = COALESCE($4::relationship_direction, direction) \
             WHERE id = $1 \
             RETURNING id, project_id, character_a_id, character_b_id, label, visual_type::text, direction::text, created_at, updated_at",
        )
        .bind(id)
        .bind(update.label.as_deref())
        .bind(update.visual_type.as_ref().map(|v| v.to_string()))
        .bind(update.direction.as_ref().map(|d| d.to_string()))
        .fetch_one(self.pool())
        .await
        .map_err(|e| CharacterError::Unknown(e.into()))?;

        Ok(row.into_domain())
    }

    async fn delete(&self, id: Uuid) -> Result<(), CharacterError> {
        sqlx::query("DELETE FROM character_relationship WHERE id = $1")
            .bind(id)
            .execute(self.pool())
            .await
            .map_err(|e| CharacterError::Unknown(e.into()))?;
        Ok(())
    }

    async fn exists(
        &self,
        character_a_id: Uuid,
        character_b_id: Uuid,
    ) -> Result<bool, CharacterError> {
        // Enforce ordering for the lookup.
        let (a, b) = if character_a_id < character_b_id {
            (character_a_id, character_b_id)
        } else {
            (character_b_id, character_a_id)
        };

        let row = sqlx::query_as::<_, ExistsRow>(
            "SELECT EXISTS(SELECT 1 FROM character_relationship WHERE character_a_id = $1 AND character_b_id = $2) as exists",
        )
        .bind(a)
        .bind(b)
        .fetch_one(self.pool())
        .await
        .map_err(|e| CharacterError::Unknown(e.into()))?;

        Ok(row.exists.unwrap_or(false))
    }
}
