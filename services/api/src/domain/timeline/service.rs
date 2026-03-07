use uuid::Uuid;

use super::error::TimelineError;
use super::models::{
    CreateConnection, CreateScene, CreateTrack, Scene, SceneConnection, SceneDetail, Track,
    UpdateScene, UpdateTrack,
};
use super::ports::{
    ConnectionRepository, SceneCharacterRepository, SceneRepository, TrackRepository,
};

#[derive(Clone)]
pub struct TimelineServiceImpl<
    TR: TrackRepository,
    SR: SceneRepository,
    CR: ConnectionRepository,
    SCR: SceneCharacterRepository,
> {
    track_repo: TR,
    scene_repo: SR,
    connection_repo: CR,
    scene_char_repo: SCR,
}

impl<TR, SR, CR, SCR> TimelineServiceImpl<TR, SR, CR, SCR>
where
    TR: TrackRepository,
    SR: SceneRepository,
    CR: ConnectionRepository,
    SCR: SceneCharacterRepository,
{
    pub fn new(
        track_repo: TR,
        scene_repo: SR,
        connection_repo: CR,
        scene_char_repo: SCR,
    ) -> Self {
        Self {
            track_repo,
            scene_repo,
            connection_repo,
            scene_char_repo,
        }
    }

    // -----------------------------------------------------------------------
    // Tracks
    // -----------------------------------------------------------------------

    pub async fn create_track(
        &self,
        project_id: Uuid,
        input: &CreateTrack,
    ) -> Result<Track, TimelineError> {
        let mut input = input.clone();
        if input.position.is_none() {
            let max = self.track_repo.find_max_position(project_id).await?;
            input.position = Some(max + 1.0);
        }
        self.track_repo.create(project_id, &input).await
    }

    pub async fn get_track(&self, id: Uuid) -> Result<Track, TimelineError> {
        self.track_repo
            .find_by_id(id)
            .await?
            .ok_or(TimelineError::TrackNotFound)
    }

    pub async fn update_track(
        &self,
        id: Uuid,
        update: &UpdateTrack,
    ) -> Result<Track, TimelineError> {
        let _ = self
            .track_repo
            .find_by_id(id)
            .await?
            .ok_or(TimelineError::TrackNotFound)?;
        self.track_repo.update(id, update).await
    }

    pub async fn delete_track(&self, id: Uuid) -> Result<(), TimelineError> {
        let _ = self
            .track_repo
            .find_by_id(id)
            .await?
            .ok_or(TimelineError::TrackNotFound)?;

        let scene_count = self.track_repo.count_scenes(id).await?;
        if scene_count > 0 {
            return Err(TimelineError::TrackHasScenes);
        }

        self.track_repo.delete(id).await
    }

    // -----------------------------------------------------------------------
    // Scenes
    // -----------------------------------------------------------------------

    pub async fn create_scene(
        &self,
        project_id: Uuid,
        input: &CreateScene,
    ) -> Result<Scene, TimelineError> {
        // Verify the track exists.
        let _ = self
            .track_repo
            .find_by_id(input.track_id)
            .await?
            .ok_or(TimelineError::TrackNotFound)?;

        let mut input = input.clone();
        if input.start_position.is_none() {
            let max = self.scene_repo.find_max_position(input.track_id).await?;
            input.start_position = Some(max + 1024.0);
        }
        if input.duration.is_none() {
            input.duration = Some(1.0);
        }

        let scene = self.scene_repo.create(project_id, &input).await?;

        // Set character assignments.
        if !input.character_ids.is_empty() {
            self.scene_char_repo
                .set_characters(scene.id, &input.character_ids)
                .await?;
        }

        Ok(scene)
    }

    pub async fn get_scene(&self, id: Uuid) -> Result<Scene, TimelineError> {
        self.scene_repo
            .find_by_id(id)
            .await?
            .ok_or(TimelineError::SceneNotFound)
    }

    pub async fn get_scene_detail(&self, id: Uuid) -> Result<SceneDetail, TimelineError> {
        self.scene_repo
            .find_detail_by_id(id)
            .await?
            .ok_or(TimelineError::SceneNotFound)
    }

    pub async fn update_scene(
        &self,
        id: Uuid,
        update: &UpdateScene,
    ) -> Result<Scene, TimelineError> {
        let _ = self
            .scene_repo
            .find_by_id(id)
            .await?
            .ok_or(TimelineError::SceneNotFound)?;

        // If changing track, verify the new track exists.
        if let Some(new_track_id) = update.track_id {
            let _ = self
                .track_repo
                .find_by_id(new_track_id)
                .await?
                .ok_or(TimelineError::TrackNotFound)?;
        }

        let scene = self.scene_repo.update(id, update).await?;

        // Update character assignments if provided.
        if let Some(ref character_ids) = update.character_ids {
            self.scene_char_repo
                .set_characters(id, character_ids)
                .await?;
        }

        Ok(scene)
    }

    pub async fn delete_scene(&self, id: Uuid) -> Result<(), TimelineError> {
        let _ = self
            .scene_repo
            .find_by_id(id)
            .await?
            .ok_or(TimelineError::SceneNotFound)?;
        self.scene_repo.delete(id).await
    }

    // -----------------------------------------------------------------------
    // Connections
    // -----------------------------------------------------------------------

    pub async fn create_connection(
        &self,
        project_id: Uuid,
        input: &CreateConnection,
    ) -> Result<SceneConnection, TimelineError> {
        // Verify both scenes exist.
        let _ = self
            .scene_repo
            .find_by_id(input.source_scene_id)
            .await?
            .ok_or(TimelineError::SceneNotFound)?;
        let _ = self
            .scene_repo
            .find_by_id(input.target_scene_id)
            .await?
            .ok_or(TimelineError::SceneNotFound)?;

        // Check for existing connection.
        let exists = self
            .connection_repo
            .exists(input.source_scene_id, input.target_scene_id)
            .await?;
        if exists {
            return Err(TimelineError::ConnectionExists);
        }

        self.connection_repo.create(project_id, input).await
    }

    pub async fn delete_connection(&self, id: Uuid) -> Result<(), TimelineError> {
        self.connection_repo.delete(id).await
    }

    /// Mark all `ai_draft` and `edited` scenes in a project as `needs_revision`.
    ///
    /// Called when project config changes affect generation context.
    pub async fn mark_scenes_needs_revision(
        &self,
        project_id: Uuid,
    ) -> Result<(), TimelineError> {
        self.scene_repo.mark_needs_revision(project_id).await
    }
}
