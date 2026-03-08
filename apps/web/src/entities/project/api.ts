import { get, patch, del } from '@/shared/api/client'
import type { DataEnvelope, ListEnvelope } from '@/shared/api/types'
import type { Project, ProjectSummary, UpdateProjectRequest } from './model'
import type { Track } from '@/entities/track'
import type { Scene } from '@/entities/scene'
import type { Character, CharacterRelationship } from '@/entities/character'
import type { SceneConnection } from '@/entities/connection'

export interface Workspace {
  project: Project
  tracks: Track[]
  scenes: Scene[]
  characters: Character[]
  relationships: CharacterRelationship[]
  connections: SceneConnection[]
}

export function listProjects(
  opts?: { cursor?: string; limit?: number },
  signal?: AbortSignal,
): Promise<ListEnvelope<ProjectSummary>> {
  return get('/v1/projects', { cursor: opts?.cursor, limit: opts?.limit }, signal)
}

export function getProject(
  projectId: string,
  signal?: AbortSignal,
): Promise<DataEnvelope<Project>> {
  return get(`/v1/projects/${projectId}`, undefined, signal)
}

export function updateProject(
  projectId: string,
  body: UpdateProjectRequest,
  signal?: AbortSignal,
): Promise<DataEnvelope<Project>> {
  return patch(`/v1/projects/${projectId}`, body, signal)
}

export function deleteProject(projectId: string, signal?: AbortSignal): Promise<void> {
  return del(`/v1/projects/${projectId}`, signal)
}

export function getWorkspace(
  projectId: string,
  signal?: AbortSignal,
): Promise<DataEnvelope<Workspace>> {
  return get(`/v1/projects/${projectId}/workspace`, undefined, signal)
}
