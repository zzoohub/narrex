export type RelationshipVisual = 'solid' | 'dashed' | 'arrowed'
export type RelationshipDirection = 'bidirectional' | 'a_to_b' | 'b_to_a'

export interface Character {
  id: string
  projectId: string
  name: string
  personality: string | null
  appearance: string | null
  secrets: string | null
  motivation: string | null
  profileImageUrl: string | null
  graphX: number | null
  graphY: number | null
  createdAt: string
  updatedAt: string
}

export interface CharacterRelationship {
  id: string
  projectId: string
  characterAId: string
  characterBId: string
  label: string
  visualType: RelationshipVisual
  direction: RelationshipDirection
  createdAt: string
  updatedAt: string
}

export interface CreateCharacterRequest {
  name: string
  personality?: string
  appearance?: string
  secrets?: string
  motivation?: string
  profileImageUrl?: string
  graphX?: number
  graphY?: number
}

export interface UpdateCharacterRequest {
  name?: string
  personality?: string | null
  appearance?: string | null
  secrets?: string | null
  motivation?: string | null
  profileImageUrl?: string | null
  graphX?: number | null
  graphY?: number | null
}

export interface CreateRelationshipRequest {
  characterAId: string
  characterBId: string
  label: string
  visualType: RelationshipVisual
  direction: RelationshipDirection
}

export interface UpdateRelationshipRequest {
  label?: string
  visualType?: RelationshipVisual
  direction?: RelationshipDirection
}
