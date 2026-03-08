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

#[cfg(test)]
mod tests {
    use super::*;
    use super::super::models::*;
    use chrono::Utc;
    use std::sync::{Arc, Mutex};

    // ---- Helpers ----

    fn make_track(id: Uuid, project_id: Uuid, position: f64) -> Track {
        Track { id, project_id, position, label: None, created_at: Utc::now(), updated_at: Utc::now() }
    }

    fn make_scene(id: Uuid, track_id: Uuid, project_id: Uuid, start: f64) -> Scene {
        Scene {
            id, track_id, project_id, start_position: start, duration: 1.0,
            status: SceneStatus::Empty, title: "test".into(), plot_summary: None,
            location: None, mood_tags: vec![], character_ids: vec![],
            created_at: Utc::now(), updated_at: Utc::now(),
        }
    }

    fn make_connection(id: Uuid, project_id: Uuid, src: Uuid, tgt: Uuid) -> SceneConnection {
        SceneConnection {
            id, project_id, source_scene_id: src, target_scene_id: tgt,
            connection_type: ConnectionType::Branch, created_at: Utc::now(),
        }
    }

    // ---- MockTrackRepository ----

    #[derive(Clone)]
    struct MockTrackRepo {
        tracks: Arc<Mutex<Vec<Track>>>,
        scene_counts: Arc<Mutex<std::collections::HashMap<Uuid, i64>>>,
    }

    impl MockTrackRepo {
        fn new(tracks: Vec<Track>) -> Self {
            Self { tracks: Arc::new(Mutex::new(tracks)), scene_counts: Arc::new(Mutex::new(std::collections::HashMap::new())) }
        }
        fn with_scene_count(self, track_id: Uuid, count: i64) -> Self {
            self.scene_counts.lock().unwrap().insert(track_id, count);
            self
        }
    }

    #[async_trait::async_trait]
    impl TrackRepository for MockTrackRepo {
        async fn create(&self, project_id: Uuid, input: &CreateTrack) -> Result<Track, TimelineError> {
            let t = Track {
                id: Uuid::new_v4(), project_id,
                position: input.position.unwrap_or(0.0),
                label: input.label.clone(),
                created_at: Utc::now(), updated_at: Utc::now(),
            };
            self.tracks.lock().unwrap().push(t.clone());
            Ok(t)
        }
        async fn find_by_id(&self, id: Uuid) -> Result<Option<Track>, TimelineError> {
            Ok(self.tracks.lock().unwrap().iter().find(|t| t.id == id).cloned())
        }
        async fn update(&self, id: Uuid, update: &UpdateTrack) -> Result<Track, TimelineError> {
            let mut tracks = self.tracks.lock().unwrap();
            let t = tracks.iter_mut().find(|t| t.id == id).unwrap();
            if let Some(pos) = update.position {
                t.position = pos;
            }
            Ok(t.clone())
        }
        async fn delete(&self, id: Uuid) -> Result<(), TimelineError> {
            self.tracks.lock().unwrap().retain(|t| t.id != id);
            Ok(())
        }
        async fn count_scenes(&self, track_id: Uuid) -> Result<i64, TimelineError> {
            Ok(*self.scene_counts.lock().unwrap().get(&track_id).unwrap_or(&0))
        }
        async fn find_max_position(&self, project_id: Uuid) -> Result<f64, TimelineError> {
            let tracks = self.tracks.lock().unwrap();
            let max = tracks.iter()
                .filter(|t| t.project_id == project_id)
                .map(|t| t.position)
                .fold(0.0_f64, f64::max);
            Ok(max)
        }
    }

    // ---- MockSceneRepository ----

    #[derive(Clone)]
    struct MockSceneRepo {
        scenes: Arc<Mutex<Vec<Scene>>>,
    }

    impl MockSceneRepo {
        fn new(scenes: Vec<Scene>) -> Self {
            Self { scenes: Arc::new(Mutex::new(scenes)) }
        }
        fn empty() -> Self { Self::new(vec![]) }
    }

    #[async_trait::async_trait]
    impl SceneRepository for MockSceneRepo {
        async fn create(&self, project_id: Uuid, input: &CreateScene) -> Result<Scene, TimelineError> {
            let s = Scene {
                id: Uuid::new_v4(), track_id: input.track_id, project_id,
                start_position: input.start_position.unwrap_or(0.0),
                duration: input.duration.unwrap_or(1.0),
                status: SceneStatus::Empty, title: input.title.clone(),
                plot_summary: input.plot_summary.clone(), location: input.location.clone(),
                mood_tags: input.mood_tags.clone(), character_ids: input.character_ids.clone(),
                created_at: Utc::now(), updated_at: Utc::now(),
            };
            self.scenes.lock().unwrap().push(s.clone());
            Ok(s)
        }
        async fn find_by_id(&self, id: Uuid) -> Result<Option<Scene>, TimelineError> {
            Ok(self.scenes.lock().unwrap().iter().find(|s| s.id == id).cloned())
        }
        async fn find_detail_by_id(&self, id: Uuid) -> Result<Option<SceneDetail>, TimelineError> {
            Ok(self.scenes.lock().unwrap().iter().find(|s| s.id == id).map(|s| SceneDetail { scene: s.clone(), latest_draft: None }))
        }
        async fn update(&self, id: Uuid, update: &UpdateScene) -> Result<Scene, TimelineError> {
            let mut scenes = self.scenes.lock().unwrap();
            let s = scenes.iter_mut().find(|s| s.id == id).unwrap();
            if let Some(title) = &update.title { s.title = title.clone(); }
            if let Some(pos) = update.start_position { s.start_position = pos; }
            Ok(s.clone())
        }
        async fn delete(&self, id: Uuid) -> Result<(), TimelineError> {
            self.scenes.lock().unwrap().retain(|s| s.id != id);
            Ok(())
        }
        async fn find_max_position(&self, track_id: Uuid) -> Result<f64, TimelineError> {
            let scenes = self.scenes.lock().unwrap();
            let max = scenes.iter()
                .filter(|s| s.track_id == track_id)
                .map(|s| s.start_position)
                .fold(0.0_f64, f64::max);
            Ok(max)
        }
        async fn mark_needs_revision(&self, _project_id: Uuid) -> Result<(), TimelineError> {
            Ok(())
        }
    }

    // ---- MockConnectionRepository ----

    #[derive(Clone)]
    struct MockConnRepo {
        conns: Arc<Mutex<Vec<SceneConnection>>>,
    }

    impl MockConnRepo {
        fn empty() -> Self { Self { conns: Arc::new(Mutex::new(vec![])) } }
        fn new(conns: Vec<SceneConnection>) -> Self { Self { conns: Arc::new(Mutex::new(conns)) } }
    }

    #[async_trait::async_trait]
    impl ConnectionRepository for MockConnRepo {
        async fn create(&self, project_id: Uuid, input: &CreateConnection) -> Result<SceneConnection, TimelineError> {
            let c = make_connection(Uuid::new_v4(), project_id, input.source_scene_id, input.target_scene_id);
            self.conns.lock().unwrap().push(c.clone());
            Ok(c)
        }
        async fn delete(&self, id: Uuid) -> Result<(), TimelineError> {
            self.conns.lock().unwrap().retain(|c| c.id != id);
            Ok(())
        }
        async fn exists(&self, src: Uuid, tgt: Uuid) -> Result<bool, TimelineError> {
            Ok(self.conns.lock().unwrap().iter().any(|c| c.source_scene_id == src && c.target_scene_id == tgt))
        }
    }

    // ---- MockSceneCharacterRepository ----

    #[derive(Clone)]
    struct MockSceneCharRepo;

    #[async_trait::async_trait]
    impl SceneCharacterRepository for MockSceneCharRepo {
        async fn set_characters(&self, _scene_id: Uuid, _character_ids: &[Uuid]) -> Result<(), TimelineError> {
            Ok(())
        }
    }

    fn build_svc(
        tracks: Vec<Track>,
        scenes: Vec<Scene>,
    ) -> TimelineServiceImpl<MockTrackRepo, MockSceneRepo, MockConnRepo, MockSceneCharRepo> {
        TimelineServiceImpl::new(MockTrackRepo::new(tracks), MockSceneRepo::new(scenes), MockConnRepo::empty(), MockSceneCharRepo)
    }

    // ---- Track tests ----

    #[tokio::test]
    async fn create_track_auto_position() {
        let pid = Uuid::new_v4();
        let existing = make_track(Uuid::new_v4(), pid, 5.0);
        let svc = build_svc(vec![existing], vec![]);
        let input = CreateTrack { label: Some("new".into()), position: None };
        let track = svc.create_track(pid, &input).await.unwrap();
        assert_eq!(track.position, 6.0); // max(5.0) + 1.0
    }

    #[tokio::test]
    async fn create_track_explicit_position() {
        let svc = build_svc(vec![], vec![]);
        let input = CreateTrack { label: None, position: Some(10.0) };
        let track = svc.create_track(Uuid::new_v4(), &input).await.unwrap();
        assert_eq!(track.position, 10.0);
    }

    #[tokio::test]
    async fn get_track_not_found() {
        let svc = build_svc(vec![], vec![]);
        let err = svc.get_track(Uuid::new_v4()).await.unwrap_err();
        assert!(matches!(err, TimelineError::TrackNotFound));
    }

    #[tokio::test]
    async fn delete_track_with_scenes_errors() {
        let tid = Uuid::new_v4();
        let track = make_track(tid, Uuid::new_v4(), 0.0);
        let track_repo = MockTrackRepo::new(vec![track]).with_scene_count(tid, 3);
        let svc = TimelineServiceImpl::new(track_repo, MockSceneRepo::empty(), MockConnRepo::empty(), MockSceneCharRepo);
        let err = svc.delete_track(tid).await.unwrap_err();
        assert!(matches!(err, TimelineError::TrackHasScenes));
    }

    #[tokio::test]
    async fn delete_track_empty_ok() {
        let tid = Uuid::new_v4();
        let track = make_track(tid, Uuid::new_v4(), 0.0);
        let svc = build_svc(vec![track], vec![]);
        svc.delete_track(tid).await.unwrap();
    }

    #[tokio::test]
    async fn update_track_not_found() {
        let svc = build_svc(vec![], vec![]);
        let err = svc.update_track(Uuid::new_v4(), &UpdateTrack::default()).await.unwrap_err();
        assert!(matches!(err, TimelineError::TrackNotFound));
    }

    // ---- Scene tests ----

    #[tokio::test]
    async fn create_scene_auto_position_and_duration() {
        let pid = Uuid::new_v4();
        let tid = Uuid::new_v4();
        let track = make_track(tid, pid, 0.0);
        let existing_scene = make_scene(Uuid::new_v4(), tid, pid, 100.0);
        let svc = build_svc(vec![track], vec![existing_scene]);

        let input = CreateScene {
            track_id: tid, title: "New".into(),
            start_position: None, duration: None,
            plot_summary: None, location: None, mood_tags: vec![], character_ids: vec![],
        };
        let scene = svc.create_scene(pid, &input).await.unwrap();
        assert_eq!(scene.start_position, 1124.0); // max(100) + 1024
        assert_eq!(scene.duration, 1.0);
    }

    #[tokio::test]
    async fn create_scene_track_not_found() {
        let svc = build_svc(vec![], vec![]);
        let input = CreateScene {
            track_id: Uuid::new_v4(), title: "X".into(),
            start_position: None, duration: None,
            plot_summary: None, location: None, mood_tags: vec![], character_ids: vec![],
        };
        let err = svc.create_scene(Uuid::new_v4(), &input).await.unwrap_err();
        assert!(matches!(err, TimelineError::TrackNotFound));
    }

    #[tokio::test]
    async fn get_scene_not_found() {
        let svc = build_svc(vec![], vec![]);
        let err = svc.get_scene(Uuid::new_v4()).await.unwrap_err();
        assert!(matches!(err, TimelineError::SceneNotFound));
    }

    #[tokio::test]
    async fn get_scene_detail_not_found() {
        let svc = build_svc(vec![], vec![]);
        let err = svc.get_scene_detail(Uuid::new_v4()).await.unwrap_err();
        assert!(matches!(err, TimelineError::SceneNotFound));
    }

    #[tokio::test]
    async fn update_scene_not_found() {
        let svc = build_svc(vec![], vec![]);
        let err = svc.update_scene(Uuid::new_v4(), &UpdateScene::default()).await.unwrap_err();
        assert!(matches!(err, TimelineError::SceneNotFound));
    }

    #[tokio::test]
    async fn update_scene_new_track_not_found() {
        let pid = Uuid::new_v4();
        let tid = Uuid::new_v4();
        let sid = Uuid::new_v4();
        let track = make_track(tid, pid, 0.0);
        let scene = make_scene(sid, tid, pid, 0.0);
        let svc = build_svc(vec![track], vec![scene]);

        let update = UpdateScene { track_id: Some(Uuid::new_v4()), ..Default::default() };
        let err = svc.update_scene(sid, &update).await.unwrap_err();
        assert!(matches!(err, TimelineError::TrackNotFound));
    }

    #[tokio::test]
    async fn delete_scene_not_found() {
        let svc = build_svc(vec![], vec![]);
        let err = svc.delete_scene(Uuid::new_v4()).await.unwrap_err();
        assert!(matches!(err, TimelineError::SceneNotFound));
    }

    #[tokio::test]
    async fn delete_scene_ok() {
        let sid = Uuid::new_v4();
        let scene = make_scene(sid, Uuid::new_v4(), Uuid::new_v4(), 0.0);
        let svc = build_svc(vec![], vec![scene]);
        svc.delete_scene(sid).await.unwrap();
    }

    // ---- Connection tests ----

    #[tokio::test]
    async fn create_connection_ok() {
        let pid = Uuid::new_v4();
        let s1 = Uuid::new_v4();
        let s2 = Uuid::new_v4();
        let scenes = vec![make_scene(s1, Uuid::new_v4(), pid, 0.0), make_scene(s2, Uuid::new_v4(), pid, 1.0)];
        let svc = build_svc(vec![], scenes);
        let input = CreateConnection { source_scene_id: s1, target_scene_id: s2, connection_type: ConnectionType::Branch };
        let conn = svc.create_connection(pid, &input).await.unwrap();
        assert_eq!(conn.source_scene_id, s1);
        assert_eq!(conn.target_scene_id, s2);
    }

    #[tokio::test]
    async fn create_connection_source_not_found() {
        let svc = build_svc(vec![], vec![]);
        let input = CreateConnection { source_scene_id: Uuid::new_v4(), target_scene_id: Uuid::new_v4(), connection_type: ConnectionType::Branch };
        let err = svc.create_connection(Uuid::new_v4(), &input).await.unwrap_err();
        assert!(matches!(err, TimelineError::SceneNotFound));
    }

    #[tokio::test]
    async fn create_connection_duplicate_errors() {
        let pid = Uuid::new_v4();
        let s1 = Uuid::new_v4();
        let s2 = Uuid::new_v4();
        let scenes = vec![make_scene(s1, Uuid::new_v4(), pid, 0.0), make_scene(s2, Uuid::new_v4(), pid, 1.0)];
        let existing = make_connection(Uuid::new_v4(), pid, s1, s2);
        let svc = TimelineServiceImpl::new(
            MockTrackRepo::new(vec![]),
            MockSceneRepo::new(scenes),
            MockConnRepo::new(vec![existing]),
            MockSceneCharRepo,
        );
        let input = CreateConnection { source_scene_id: s1, target_scene_id: s2, connection_type: ConnectionType::Branch };
        let err = svc.create_connection(pid, &input).await.unwrap_err();
        assert!(matches!(err, TimelineError::ConnectionExists));
    }

    #[tokio::test]
    async fn mark_scenes_needs_revision_ok() {
        let svc = build_svc(vec![], vec![]);
        svc.mark_scenes_needs_revision(Uuid::new_v4()).await.unwrap();
    }
}
