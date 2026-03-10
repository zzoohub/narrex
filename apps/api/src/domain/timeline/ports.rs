use uuid::Uuid;

use super::error::TimelineError;
use super::models::{
    CreateConnection, CreateScene, CreateTrack, Scene, SceneConnection, SceneDetail, Track,
    UpdateScene, UpdateTrack,
};

#[async_trait::async_trait]
pub trait TrackRepository: Clone + Send + Sync + 'static {
    async fn create(
        &self,
        project_id: Uuid,
        input: &CreateTrack,
    ) -> Result<Track, TimelineError>;

    async fn find_by_id(&self, id: Uuid) -> Result<Option<Track>, TimelineError>;

    async fn update(
        &self,
        id: Uuid,
        update: &UpdateTrack,
    ) -> Result<Track, TimelineError>;

    async fn delete(&self, id: Uuid) -> Result<(), TimelineError>;

    async fn count_scenes(&self, track_id: Uuid) -> Result<i64, TimelineError>;

    async fn find_max_position(&self, project_id: Uuid) -> Result<f64, TimelineError>;
}

#[async_trait::async_trait]
pub trait SceneRepository: Clone + Send + Sync + 'static {
    async fn create(
        &self,
        project_id: Uuid,
        input: &CreateScene,
    ) -> Result<Scene, TimelineError>;

    async fn find_by_id(&self, id: Uuid) -> Result<Option<Scene>, TimelineError>;

    async fn find_detail_by_id(&self, id: Uuid) -> Result<Option<SceneDetail>, TimelineError>;

    async fn update(
        &self,
        id: Uuid,
        update: &UpdateScene,
    ) -> Result<Scene, TimelineError>;

    async fn delete(&self, id: Uuid) -> Result<(), TimelineError>;

    async fn find_max_position(&self, track_id: Uuid) -> Result<f64, TimelineError>;

    /// Mark all `ai_draft` and `edited` scenes in a project as `needs_revision`.
    async fn mark_needs_revision(&self, project_id: Uuid) -> Result<(), TimelineError>;
}

#[async_trait::async_trait]
pub trait ConnectionRepository: Clone + Send + Sync + 'static {
    async fn create(
        &self,
        project_id: Uuid,
        input: &CreateConnection,
    ) -> Result<SceneConnection, TimelineError>;

    async fn delete(&self, id: Uuid) -> Result<(), TimelineError>;

    async fn exists(
        &self,
        source_scene_id: Uuid,
        target_scene_id: Uuid,
    ) -> Result<bool, TimelineError>;
}

#[async_trait::async_trait]
pub trait SceneCharacterRepository: Clone + Send + Sync + 'static {
    /// Replace all character assignments for a scene.
    async fn set_characters(
        &self,
        scene_id: Uuid,
        character_ids: &[Uuid],
    ) -> Result<(), TimelineError>;
}

// ---------------------------------------------------------------------------
// Inbound port: TimelineService (used by HTTP handlers)
// ---------------------------------------------------------------------------

#[async_trait::async_trait]
pub trait TimelineService: Send + Sync {
    async fn create_track(&self, project_id: Uuid, input: &CreateTrack) -> Result<Track, TimelineError>;
    async fn update_track(&self, id: Uuid, update: &UpdateTrack) -> Result<Track, TimelineError>;
    async fn delete_track(&self, id: Uuid) -> Result<(), TimelineError>;
    async fn create_scene(&self, project_id: Uuid, input: &CreateScene) -> Result<Scene, TimelineError>;
    async fn get_scene(&self, id: Uuid) -> Result<Scene, TimelineError>;
    async fn get_scene_detail(&self, id: Uuid) -> Result<SceneDetail, TimelineError>;
    async fn update_scene(&self, id: Uuid, update: &UpdateScene) -> Result<Scene, TimelineError>;
    async fn delete_scene(&self, id: Uuid) -> Result<(), TimelineError>;
    async fn create_connection(&self, project_id: Uuid, input: &CreateConnection) -> Result<SceneConnection, TimelineError>;
    async fn delete_connection(&self, id: Uuid) -> Result<(), TimelineError>;
    async fn mark_scenes_needs_revision(&self, project_id: Uuid) -> Result<(), TimelineError>;
}
