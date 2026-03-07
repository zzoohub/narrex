use uuid::Uuid;

use super::error::CharacterError;
use super::models::{
    Character, CharacterRelationship, CreateCharacter, CreateRelationship, UpdateCharacter,
    UpdateRelationship,
};
use super::ports::{CharacterRepository, RelationshipRepository};

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
