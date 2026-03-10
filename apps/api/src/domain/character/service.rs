use uuid::Uuid;

use super::error::CharacterError;
use super::models::{
    Character, CharacterRelationship, CreateCharacter, CreateRelationship, UpdateCharacter,
    UpdateRelationship,
};
use super::ports::{CharacterRepository, CharacterService, RelationshipRepository};

#[derive(Clone)]
pub struct CharacterServiceImpl<CR: CharacterRepository, RR: RelationshipRepository> {
    char_repo: CR,
    rel_repo: RR,
}

impl<CR: CharacterRepository, RR: RelationshipRepository> CharacterServiceImpl<CR, RR> {
    pub fn new(char_repo: CR, rel_repo: RR) -> Self {
        Self {
            char_repo,
            rel_repo,
        }
    }

    // -----------------------------------------------------------------------
    // Characters
    // -----------------------------------------------------------------------

    pub async fn create_character(
        &self,
        project_id: Uuid,
        input: &CreateCharacter,
    ) -> Result<Character, CharacterError> {
        self.char_repo.create(project_id, input).await
    }

    pub async fn get_character(&self, id: Uuid) -> Result<Character, CharacterError> {
        self.char_repo
            .find_by_id(id)
            .await?
            .ok_or(CharacterError::NotFound)
    }

    pub async fn list_characters(
        &self,
        project_id: Uuid,
    ) -> Result<Vec<Character>, CharacterError> {
        self.char_repo.find_by_project_id(project_id).await
    }

    pub async fn update_character(
        &self,
        id: Uuid,
        update: &UpdateCharacter,
    ) -> Result<Character, CharacterError> {
        let _ = self
            .char_repo
            .find_by_id(id)
            .await?
            .ok_or(CharacterError::NotFound)?;
        self.char_repo.update(id, update).await
    }

    pub async fn delete_character(&self, id: Uuid) -> Result<(), CharacterError> {
        let _ = self
            .char_repo
            .find_by_id(id)
            .await?
            .ok_or(CharacterError::NotFound)?;
        self.char_repo.delete(id).await
    }

    // -----------------------------------------------------------------------
    // Relationships
    // -----------------------------------------------------------------------

    pub async fn create_relationship(
        &self,
        project_id: Uuid,
        input: &CreateRelationship,
    ) -> Result<CharacterRelationship, CharacterError> {
        // Sort character IDs so that character_a_id < character_b_id.
        let (a, b) = if input.character_a_id < input.character_b_id {
            (input.character_a_id, input.character_b_id)
        } else {
            (input.character_b_id, input.character_a_id)
        };

        // Verify both characters exist.
        let _ = self
            .char_repo
            .find_by_id(a)
            .await?
            .ok_or(CharacterError::NotFound)?;
        let _ = self
            .char_repo
            .find_by_id(b)
            .await?
            .ok_or(CharacterError::NotFound)?;

        // Check for existing relationship.
        let exists = self.rel_repo.exists(a, b).await?;
        if exists {
            return Err(CharacterError::RelationshipExists);
        }

        // Determine if direction needs to be flipped when IDs are swapped.
        let direction = if input.character_a_id > input.character_b_id {
            // IDs were swapped, so flip direction if it's directional.
            match &input.direction {
                super::models::RelationshipDirection::AToB => {
                    super::models::RelationshipDirection::BToA
                }
                super::models::RelationshipDirection::BToA => {
                    super::models::RelationshipDirection::AToB
                }
                other => other.clone(),
            }
        } else {
            input.direction.clone()
        };

        let sorted_input = CreateRelationship {
            character_a_id: a,
            character_b_id: b,
            label: input.label.clone(),
            visual_type: input.visual_type.clone(),
            direction,
        };

        self.rel_repo.create(project_id, &sorted_input).await
    }

    pub async fn get_relationship(
        &self,
        id: Uuid,
    ) -> Result<CharacterRelationship, CharacterError> {
        self.rel_repo
            .find_by_id(id)
            .await?
            .ok_or(CharacterError::RelationshipNotFound)
    }

    pub async fn list_relationships(
        &self,
        project_id: Uuid,
    ) -> Result<Vec<CharacterRelationship>, CharacterError> {
        self.rel_repo.find_by_project_id(project_id).await
    }

    pub async fn update_relationship(
        &self,
        id: Uuid,
        update: &UpdateRelationship,
    ) -> Result<CharacterRelationship, CharacterError> {
        let _ = self
            .rel_repo
            .find_by_id(id)
            .await?
            .ok_or(CharacterError::RelationshipNotFound)?;
        self.rel_repo.update(id, update).await
    }

    pub async fn delete_relationship(&self, id: Uuid) -> Result<(), CharacterError> {
        let _ = self
            .rel_repo
            .find_by_id(id)
            .await?
            .ok_or(CharacterError::RelationshipNotFound)?;
        self.rel_repo.delete(id).await
    }
}

// ---------------------------------------------------------------------------
// CharacterService trait implementation (delegates to inherent methods)
// ---------------------------------------------------------------------------

#[async_trait::async_trait]
impl<CR: CharacterRepository, RR: RelationshipRepository> CharacterService
    for CharacterServiceImpl<CR, RR>
{
    async fn list_characters(&self, project_id: Uuid) -> Result<Vec<Character>, CharacterError> {
        Self::list_characters(self, project_id).await
    }
    async fn create_character(
        &self,
        project_id: Uuid,
        input: &CreateCharacter,
    ) -> Result<Character, CharacterError> {
        Self::create_character(self, project_id, input).await
    }
    async fn get_character(&self, id: Uuid) -> Result<Character, CharacterError> {
        Self::get_character(self, id).await
    }
    async fn update_character(
        &self,
        id: Uuid,
        update: &UpdateCharacter,
    ) -> Result<Character, CharacterError> {
        Self::update_character(self, id, update).await
    }
    async fn delete_character(&self, id: Uuid) -> Result<(), CharacterError> {
        Self::delete_character(self, id).await
    }
    async fn create_relationship(
        &self,
        project_id: Uuid,
        input: &CreateRelationship,
    ) -> Result<CharacterRelationship, CharacterError> {
        Self::create_relationship(self, project_id, input).await
    }
    async fn update_relationship(
        &self,
        id: Uuid,
        update: &UpdateRelationship,
    ) -> Result<CharacterRelationship, CharacterError> {
        Self::update_relationship(self, id, update).await
    }
    async fn delete_relationship(&self, id: Uuid) -> Result<(), CharacterError> {
        Self::delete_relationship(self, id).await
    }
}

#[cfg(test)]
mod tests {
    use super::super::models::*;
    use super::*;
    use chrono::Utc;
    use std::sync::{Arc, Mutex};

    // ---- Mock helpers ----

    fn make_character(id: Uuid, project_id: Uuid, name: &str) -> Character {
        Character {
            id,
            project_id,
            name: name.to_string(),
            personality: None,
            appearance: None,
            secrets: None,
            motivation: None,
            profile_image_url: None,
            graph_x: None,
            graph_y: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    fn make_relationship(id: Uuid, project_id: Uuid, a: Uuid, b: Uuid) -> CharacterRelationship {
        CharacterRelationship {
            id,
            project_id,
            character_a_id: a,
            character_b_id: b,
            label: "friends".to_string(),
            visual_type: RelationshipVisual::Solid,
            direction: RelationshipDirection::Bidirectional,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    // ---- MockCharacterRepository ----

    #[derive(Clone)]
    struct MockCharRepo {
        chars: Arc<Mutex<Vec<Character>>>,
    }

    impl MockCharRepo {
        fn new(chars: Vec<Character>) -> Self {
            Self {
                chars: Arc::new(Mutex::new(chars)),
            }
        }
    }

    #[async_trait::async_trait]
    impl CharacterRepository for MockCharRepo {
        async fn create(
            &self,
            project_id: Uuid,
            input: &CreateCharacter,
        ) -> Result<Character, CharacterError> {
            let ch = make_character(Uuid::new_v4(), project_id, &input.name);
            self.chars.lock().unwrap().push(ch.clone());
            Ok(ch)
        }
        async fn find_by_id(&self, id: Uuid) -> Result<Option<Character>, CharacterError> {
            Ok(self
                .chars
                .lock()
                .unwrap()
                .iter()
                .find(|c| c.id == id)
                .cloned())
        }
        async fn find_by_project_id(
            &self,
            project_id: Uuid,
        ) -> Result<Vec<Character>, CharacterError> {
            Ok(self
                .chars
                .lock()
                .unwrap()
                .iter()
                .filter(|c| c.project_id == project_id)
                .cloned()
                .collect())
        }
        async fn update(
            &self,
            id: Uuid,
            update: &UpdateCharacter,
        ) -> Result<Character, CharacterError> {
            let mut chars = self.chars.lock().unwrap();
            let ch = chars.iter_mut().find(|c| c.id == id).unwrap();
            if let Some(ref name) = update.name {
                ch.name = name.clone();
            }
            Ok(ch.clone())
        }
        async fn delete(&self, id: Uuid) -> Result<(), CharacterError> {
            self.chars.lock().unwrap().retain(|c| c.id != id);
            Ok(())
        }
    }

    // ---- MockRelationshipRepository ----

    #[derive(Clone)]
    struct MockRelRepo {
        rels: Arc<Mutex<Vec<CharacterRelationship>>>,
    }

    impl MockRelRepo {
        fn new(rels: Vec<CharacterRelationship>) -> Self {
            Self {
                rels: Arc::new(Mutex::new(rels)),
            }
        }
        fn empty() -> Self {
            Self::new(vec![])
        }
    }

    #[async_trait::async_trait]
    impl RelationshipRepository for MockRelRepo {
        async fn create(
            &self,
            project_id: Uuid,
            input: &CreateRelationship,
        ) -> Result<CharacterRelationship, CharacterError> {
            let rel = CharacterRelationship {
                id: Uuid::new_v4(),
                project_id,
                character_a_id: input.character_a_id,
                character_b_id: input.character_b_id,
                label: input.label.clone(),
                visual_type: input.visual_type.clone(),
                direction: input.direction.clone(),
                created_at: Utc::now(),
                updated_at: Utc::now(),
            };
            self.rels.lock().unwrap().push(rel.clone());
            Ok(rel)
        }
        async fn find_by_id(
            &self,
            id: Uuid,
        ) -> Result<Option<CharacterRelationship>, CharacterError> {
            Ok(self
                .rels
                .lock()
                .unwrap()
                .iter()
                .find(|r| r.id == id)
                .cloned())
        }
        async fn find_by_project_id(
            &self,
            project_id: Uuid,
        ) -> Result<Vec<CharacterRelationship>, CharacterError> {
            Ok(self
                .rels
                .lock()
                .unwrap()
                .iter()
                .filter(|r| r.project_id == project_id)
                .cloned()
                .collect())
        }
        async fn update(
            &self,
            id: Uuid,
            update: &UpdateRelationship,
        ) -> Result<CharacterRelationship, CharacterError> {
            let mut rels = self.rels.lock().unwrap();
            let rel = rels.iter_mut().find(|r| r.id == id).unwrap();
            if let Some(ref label) = update.label {
                rel.label = label.clone();
            }
            Ok(rel.clone())
        }
        async fn delete(&self, id: Uuid) -> Result<(), CharacterError> {
            self.rels.lock().unwrap().retain(|r| r.id != id);
            Ok(())
        }
        async fn exists(&self, a: Uuid, b: Uuid) -> Result<bool, CharacterError> {
            Ok(self
                .rels
                .lock()
                .unwrap()
                .iter()
                .any(|r| r.character_a_id == a && r.character_b_id == b))
        }
    }

    // ---- Character CRUD tests ----

    #[tokio::test]
    async fn create_character_ok() {
        let repo = MockCharRepo::new(vec![]);
        let svc = CharacterServiceImpl::new(repo, MockRelRepo::empty());
        let pid = Uuid::new_v4();
        let input = CreateCharacter {
            name: "Alice".into(),
            personality: None,
            appearance: None,
            secrets: None,
            motivation: None,
            profile_image_url: None,
            graph_x: None,
            graph_y: None,
        };
        let ch = svc.create_character(pid, &input).await.unwrap();
        assert_eq!(ch.name, "Alice");
        assert_eq!(ch.project_id, pid);
    }

    #[tokio::test]
    async fn get_character_not_found() {
        let svc = CharacterServiceImpl::new(MockCharRepo::new(vec![]), MockRelRepo::empty());
        let err = svc.get_character(Uuid::new_v4()).await.unwrap_err();
        assert!(matches!(err, CharacterError::NotFound));
    }

    #[tokio::test]
    async fn get_character_found() {
        let id = Uuid::new_v4();
        let ch = make_character(id, Uuid::new_v4(), "Bob");
        let svc =
            CharacterServiceImpl::new(MockCharRepo::new(vec![ch.clone()]), MockRelRepo::empty());
        let result = svc.get_character(id).await.unwrap();
        assert_eq!(result.name, "Bob");
    }

    #[tokio::test]
    async fn update_character_not_found() {
        let svc = CharacterServiceImpl::new(MockCharRepo::new(vec![]), MockRelRepo::empty());
        let err = svc
            .update_character(Uuid::new_v4(), &UpdateCharacter::default())
            .await
            .unwrap_err();
        assert!(matches!(err, CharacterError::NotFound));
    }

    #[tokio::test]
    async fn delete_character_not_found() {
        let svc = CharacterServiceImpl::new(MockCharRepo::new(vec![]), MockRelRepo::empty());
        let err = svc.delete_character(Uuid::new_v4()).await.unwrap_err();
        assert!(matches!(err, CharacterError::NotFound));
    }

    #[tokio::test]
    async fn delete_character_ok() {
        let id = Uuid::new_v4();
        let ch = make_character(id, Uuid::new_v4(), "Del");
        let svc = CharacterServiceImpl::new(MockCharRepo::new(vec![ch]), MockRelRepo::empty());
        svc.delete_character(id).await.unwrap();
    }

    // ---- Relationship tests ----

    #[tokio::test]
    async fn create_relationship_sorts_ids() {
        let pid = Uuid::new_v4();
        // Create two chars with deterministic UUIDs
        let id_a = Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap();
        let id_b = Uuid::parse_str("00000000-0000-0000-0000-000000000002").unwrap();
        let chars = vec![
            make_character(id_a, pid, "A"),
            make_character(id_b, pid, "B"),
        ];
        let rel_repo = MockRelRepo::empty();
        let svc = CharacterServiceImpl::new(MockCharRepo::new(chars), rel_repo.clone());

        // Pass b before a — service should sort to a < b
        let input = CreateRelationship {
            character_a_id: id_b,
            character_b_id: id_a,
            label: "rivals".into(),
            visual_type: RelationshipVisual::Dashed,
            direction: RelationshipDirection::AToB,
        };
        let rel = svc.create_relationship(pid, &input).await.unwrap();
        assert_eq!(rel.character_a_id, id_a);
        assert_eq!(rel.character_b_id, id_b);
        // Direction should be flipped: AToB -> BToA
        assert_eq!(rel.direction, RelationshipDirection::BToA);
    }

    #[tokio::test]
    async fn create_relationship_no_flip_when_already_sorted() {
        let pid = Uuid::new_v4();
        let id_a = Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap();
        let id_b = Uuid::parse_str("00000000-0000-0000-0000-000000000002").unwrap();
        let chars = vec![
            make_character(id_a, pid, "A"),
            make_character(id_b, pid, "B"),
        ];
        let svc = CharacterServiceImpl::new(MockCharRepo::new(chars), MockRelRepo::empty());

        let input = CreateRelationship {
            character_a_id: id_a,
            character_b_id: id_b,
            label: "allies".into(),
            visual_type: RelationshipVisual::Solid,
            direction: RelationshipDirection::AToB,
        };
        let rel = svc.create_relationship(pid, &input).await.unwrap();
        assert_eq!(rel.direction, RelationshipDirection::AToB);
    }

    #[tokio::test]
    async fn create_relationship_bidirectional_no_flip() {
        let pid = Uuid::new_v4();
        let id_a = Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap();
        let id_b = Uuid::parse_str("00000000-0000-0000-0000-000000000002").unwrap();
        let chars = vec![
            make_character(id_a, pid, "A"),
            make_character(id_b, pid, "B"),
        ];
        let svc = CharacterServiceImpl::new(MockCharRepo::new(chars), MockRelRepo::empty());

        let input = CreateRelationship {
            character_a_id: id_b,
            character_b_id: id_a,
            label: "friends".into(),
            visual_type: RelationshipVisual::Solid,
            direction: RelationshipDirection::Bidirectional,
        };
        let rel = svc.create_relationship(pid, &input).await.unwrap();
        assert_eq!(rel.direction, RelationshipDirection::Bidirectional);
    }

    #[tokio::test]
    async fn create_relationship_duplicate_errors() {
        let pid = Uuid::new_v4();
        let id_a = Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap();
        let id_b = Uuid::parse_str("00000000-0000-0000-0000-000000000002").unwrap();
        let chars = vec![
            make_character(id_a, pid, "A"),
            make_character(id_b, pid, "B"),
        ];
        let existing = make_relationship(Uuid::new_v4(), pid, id_a, id_b);
        let svc =
            CharacterServiceImpl::new(MockCharRepo::new(chars), MockRelRepo::new(vec![existing]));

        let input = CreateRelationship {
            character_a_id: id_a,
            character_b_id: id_b,
            label: "dup".into(),
            visual_type: RelationshipVisual::Solid,
            direction: RelationshipDirection::Bidirectional,
        };
        let err = svc.create_relationship(pid, &input).await.unwrap_err();
        assert!(matches!(err, CharacterError::RelationshipExists));
    }

    #[tokio::test]
    async fn create_relationship_char_not_found() {
        let pid = Uuid::new_v4();
        let svc = CharacterServiceImpl::new(MockCharRepo::new(vec![]), MockRelRepo::empty());
        let input = CreateRelationship {
            character_a_id: Uuid::new_v4(),
            character_b_id: Uuid::new_v4(),
            label: "x".into(),
            visual_type: RelationshipVisual::Solid,
            direction: RelationshipDirection::Bidirectional,
        };
        let err = svc.create_relationship(pid, &input).await.unwrap_err();
        assert!(matches!(err, CharacterError::NotFound));
    }

    #[tokio::test]
    async fn get_relationship_not_found() {
        let svc = CharacterServiceImpl::new(MockCharRepo::new(vec![]), MockRelRepo::empty());
        let err = svc.get_relationship(Uuid::new_v4()).await.unwrap_err();
        assert!(matches!(err, CharacterError::RelationshipNotFound));
    }

    #[tokio::test]
    async fn delete_relationship_not_found() {
        let svc = CharacterServiceImpl::new(MockCharRepo::new(vec![]), MockRelRepo::empty());
        let err = svc.delete_relationship(Uuid::new_v4()).await.unwrap_err();
        assert!(matches!(err, CharacterError::RelationshipNotFound));
    }
}
