use uuid::Uuid;

use super::error::CharacterError;
use super::models::{
    Character, CharacterRelationship, CreateCharacter, CreateRelationship, UpdateCharacter,
    UpdateRelationship,
};

#[async_trait::async_trait]
pub trait CharacterRepository: Clone + Send + Sync + 'static {
    async fn create(
        &self,
        project_id: Uuid,
        input: &CreateCharacter,
    ) -> Result<Character, CharacterError>;

    async fn find_by_id(&self, id: Uuid) -> Result<Option<Character>, CharacterError>;

    async fn find_by_project_id(&self, project_id: Uuid) -> Result<Vec<Character>, CharacterError>;

    async fn update(&self, id: Uuid, update: &UpdateCharacter)
        -> Result<Character, CharacterError>;

    async fn delete(&self, id: Uuid) -> Result<(), CharacterError>;
}

#[async_trait::async_trait]
pub trait RelationshipRepository: Clone + Send + Sync + 'static {
    async fn create(
        &self,
        project_id: Uuid,
        input: &CreateRelationship,
    ) -> Result<CharacterRelationship, CharacterError>;

    async fn find_by_id(&self, id: Uuid) -> Result<Option<CharacterRelationship>, CharacterError>;

    async fn find_by_project_id(
        &self,
        project_id: Uuid,
    ) -> Result<Vec<CharacterRelationship>, CharacterError>;

    async fn update(
        &self,
        id: Uuid,
        update: &UpdateRelationship,
    ) -> Result<CharacterRelationship, CharacterError>;

    async fn delete(&self, id: Uuid) -> Result<(), CharacterError>;

    async fn exists(
        &self,
        character_a_id: Uuid,
        character_b_id: Uuid,
    ) -> Result<bool, CharacterError>;
}

// ---------------------------------------------------------------------------
// Inbound port: CharacterService (used by HTTP handlers)
// ---------------------------------------------------------------------------

#[async_trait::async_trait]
pub trait CharacterService: Send + Sync {
    async fn list_characters(&self, project_id: Uuid) -> Result<Vec<Character>, CharacterError>;
    async fn create_character(
        &self,
        project_id: Uuid,
        input: &CreateCharacter,
    ) -> Result<Character, CharacterError>;
    async fn get_character(&self, id: Uuid) -> Result<Character, CharacterError>;
    async fn update_character(
        &self,
        id: Uuid,
        update: &UpdateCharacter,
    ) -> Result<Character, CharacterError>;
    async fn delete_character(&self, id: Uuid) -> Result<(), CharacterError>;
    async fn create_relationship(
        &self,
        project_id: Uuid,
        input: &CreateRelationship,
    ) -> Result<CharacterRelationship, CharacterError>;
    async fn update_relationship(
        &self,
        id: Uuid,
        update: &UpdateRelationship,
    ) -> Result<CharacterRelationship, CharacterError>;
    async fn delete_relationship(&self, id: Uuid) -> Result<(), CharacterError>;
}
