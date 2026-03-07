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

    async fn find_by_project_id(
        &self,
        project_id: Uuid,
    ) -> Result<Vec<Character>, CharacterError>;

    async fn update(
        &self,
        id: Uuid,
        update: &UpdateCharacter,
    ) -> Result<Character, CharacterError>;

    async fn delete(&self, id: Uuid) -> Result<(), CharacterError>;
}

#[async_trait::async_trait]
pub trait RelationshipRepository: Clone + Send + Sync + 'static {
    async fn create(
        &self,
        project_id: Uuid,
        input: &CreateRelationship,
    ) -> Result<CharacterRelationship, CharacterError>;

    async fn find_by_id(
        &self,
        id: Uuid,
    ) -> Result<Option<CharacterRelationship>, CharacterError>;

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
