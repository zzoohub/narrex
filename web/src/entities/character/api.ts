import { get, post, patch, del } from '@/shared/api/client'
import type { DataEnvelope } from '@/shared/api/types'
import type {
  Character,
  CharacterRelationship,
  CreateCharacterRequest,
  UpdateCharacterRequest,
  CreateRelationshipRequest,
  UpdateRelationshipRequest,
} from './model'

export function createCharacter(
  projectId: string,
  body: CreateCharacterRequest,
  signal?: AbortSignal,
): Promise<DataEnvelope<Character>> {
  return post(`/v1/projects/${projectId}/characters`, body, signal)
}

export function getCharacter(
  projectId: string,
  characterId: string,
  signal?: AbortSignal,
): Promise<DataEnvelope<Character>> {
  return get(`/v1/projects/${projectId}/characters/${characterId}`, undefined, signal)
}

export function updateCharacter(
  projectId: string,
  characterId: string,
  body: UpdateCharacterRequest,
  signal?: AbortSignal,
): Promise<DataEnvelope<Character>> {
  return patch(`/v1/projects/${projectId}/characters/${characterId}`, body, signal)
}

export function deleteCharacter(
  projectId: string,
  characterId: string,
  signal?: AbortSignal,
): Promise<void> {
  return del(`/v1/projects/${projectId}/characters/${characterId}`, signal)
}

export function createRelationship(
  projectId: string,
  body: CreateRelationshipRequest,
  signal?: AbortSignal,
): Promise<DataEnvelope<CharacterRelationship>> {
  return post(`/v1/projects/${projectId}/relationships`, body, signal)
}

export function updateRelationship(
  projectId: string,
  relationshipId: string,
  body: UpdateRelationshipRequest,
  signal?: AbortSignal,
): Promise<DataEnvelope<CharacterRelationship>> {
  return patch(`/v1/projects/${projectId}/relationships/${relationshipId}`, body, signal)
}

export function deleteRelationship(
  projectId: string,
  relationshipId: string,
  signal?: AbortSignal,
): Promise<void> {
  return del(`/v1/projects/${projectId}/relationships/${relationshipId}`, signal)
}
