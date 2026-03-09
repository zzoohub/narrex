use uuid::Uuid;

use crate::domain::project::error::ProjectError;
use crate::domain::sample::ports::SampleProjectRepository;
use crate::domain::sample::seed::SampleProjectData;

use super::Postgres;

#[async_trait::async_trait]
impl SampleProjectRepository for Postgres {
    async fn has_projects(&self, user_id: Uuid) -> Result<bool, ProjectError> {
        let row = sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS(SELECT 1 FROM project WHERE user_id = $1 AND deleted_at IS NULL)",
        )
        .bind(user_id)
        .fetch_one(self.pool())
        .await
        .map_err(|e| ProjectError::Unknown(e.into()))?;

        Ok(row)
    }

    async fn create_sample_project(&self, data: &SampleProjectData) -> Result<(), ProjectError> {
        let mut tx = self
            .pool()
            .begin()
            .await
            .map_err(|e| ProjectError::Unknown(e.into()))?;

        let p = &data.project;
        let pov_str = p.pov.as_ref().map(|v| v.to_string());
        let source_type_str = p.source_type.as_ref().map(|v| v.to_string());

        // 1. Project — unique index `uq_one_sample_per_user` prevents duplicates.
        //    Treat unique-violation as success (idempotent on concurrent calls).
        let insert_result = sqlx::query(
            "INSERT INTO project (id, user_id, title, genre, theme, era_location, pov, tone, source_type, source_input) \
             VALUES ($1, $2, $3, $4, $5, $6, $7::pov_type, $8, $9, $10)",
        )
        .bind(p.id)
        .bind(p.user_id)
        .bind(&p.title)
        .bind(&p.genre)
        .bind(&p.theme)
        .bind(&p.era_location)
        .bind(&pov_str)
        .bind(&p.tone)
        .bind(&source_type_str)
        .bind(&p.source_input)
        .execute(&mut *tx)
        .await;

        if let Err(e) = insert_result {
            if is_unique_violation(&e) {
                // Another concurrent request already created the sample project.
                tx.rollback()
                    .await
                    .map_err(|e| ProjectError::Unknown(e.into()))?;
                return Ok(());
            }
            return Err(ProjectError::Unknown(e.into()));
        }

        // 2. Tracks
        for t in &data.tracks {
            sqlx::query(
                "INSERT INTO track (id, project_id, position, label) VALUES ($1, $2, $3, $4)",
            )
            .bind(t.id)
            .bind(t.project_id)
            .bind(t.position)
            .bind(&t.label)
            .execute(&mut *tx)
            .await
            .map_err(|e| ProjectError::Unknown(e.into()))?;
        }

        // 3. Characters
        for c in &data.characters {
            sqlx::query(
                "INSERT INTO character (id, project_id, name, personality, appearance, secrets, motivation, profile_image_url, graph_x, graph_y) \
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
            )
            .bind(c.id)
            .bind(c.project_id)
            .bind(&c.name)
            .bind(&c.personality)
            .bind(&c.appearance)
            .bind(&c.secrets)
            .bind(&c.motivation)
            .bind(&c.profile_image_url)
            .bind(c.graph_x)
            .bind(c.graph_y)
            .execute(&mut *tx)
            .await
            .map_err(|e| ProjectError::Unknown(e.into()))?;
        }

        // 4. Scenes
        for s in &data.scenes {
            let status_str = s.status.to_string();
            sqlx::query(
                "INSERT INTO scene (id, track_id, project_id, start_position, duration, status, title, plot_summary, location, mood_tags, content) \
                 VALUES ($1, $2, $3, $4, $5, $6::scene_status, $7, $8, $9, $10, $11)",
            )
            .bind(s.id)
            .bind(s.track_id)
            .bind(s.project_id)
            .bind(s.start_position)
            .bind(s.duration)
            .bind(&status_str)
            .bind(&s.title)
            .bind(&s.plot_summary)
            .bind(&s.location)
            .bind(&s.mood_tags)
            .bind(&s.content)
            .execute(&mut *tx)
            .await
            .map_err(|e| ProjectError::Unknown(e.into()))?;

            // scene_character junction
            for cid in &s.character_ids {
                sqlx::query(
                    "INSERT INTO scene_character (scene_id, character_id) VALUES ($1, $2)",
                )
                .bind(s.id)
                .bind(cid)
                .execute(&mut *tx)
                .await
                .map_err(|e| ProjectError::Unknown(e.into()))?;
            }
        }

        // 5. Relationships
        for r in &data.relationships {
            let visual_str = r.visual_type.to_string();
            let dir_str = r.direction.to_string();
            sqlx::query(
                "INSERT INTO character_relationship (id, project_id, character_a_id, character_b_id, label, visual_type, direction) \
                 VALUES ($1, $2, $3, $4, $5, $6::relationship_visual, $7::relationship_direction)",
            )
            .bind(r.id)
            .bind(r.project_id)
            .bind(r.character_a_id)
            .bind(r.character_b_id)
            .bind(&r.label)
            .bind(&visual_str)
            .bind(&dir_str)
            .execute(&mut *tx)
            .await
            .map_err(|e| ProjectError::Unknown(e.into()))?;
        }

        // 6. Connections
        for c in &data.connections {
            let conn_type_str = c.connection_type.to_string();
            sqlx::query(
                "INSERT INTO scene_connection (id, project_id, source_scene_id, target_scene_id, connection_type) \
                 VALUES ($1, $2, $3, $4, $5::connection_type)",
            )
            .bind(c.id)
            .bind(c.project_id)
            .bind(c.source_scene_id)
            .bind(c.target_scene_id)
            .bind(&conn_type_str)
            .execute(&mut *tx)
            .await
            .map_err(|e| ProjectError::Unknown(e.into()))?;
        }

        tx.commit()
            .await
            .map_err(|e| ProjectError::Unknown(e.into()))?;

        Ok(())
    }
}

/// Check if a SQLx error is a Postgres unique-violation (23505).
fn is_unique_violation(e: &sqlx::Error) -> bool {
    match e {
        sqlx::Error::Database(db_err) => db_err.code().as_deref() == Some("23505"),
        _ => false,
    }
}
