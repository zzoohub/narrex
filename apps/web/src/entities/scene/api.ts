import { get, post, patch, del } from '@/shared/api/client'
import type { DataEnvelope } from '@/shared/api/types'
import type { Scene, CreateSceneRequest, UpdateSceneRequest } from './model'
import type { Draft } from '@/entities/draft'

export interface SceneDetail extends Scene {
  latestDraft: Draft | null
}

export function createScene(
  projectId: string,
  body: CreateSceneRequest,
  signal?: AbortSignal,
): Promise<DataEnvelope<Scene>> {
  return post(`/v1/projects/${projectId}/scenes`, body, signal)
}

export function getScene(
  projectId: string,
  sceneId: string,
  signal?: AbortSignal,
): Promise<DataEnvelope<SceneDetail>> {
  return get(`/v1/projects/${projectId}/scenes/${sceneId}`, undefined, signal)
}

export function updateScene(
  projectId: string,
  sceneId: string,
  body: UpdateSceneRequest,
  signal?: AbortSignal,
): Promise<DataEnvelope<Scene>> {
  return patch(`/v1/projects/${projectId}/scenes/${sceneId}`, body, signal)
}

export function deleteScene(
  projectId: string,
  sceneId: string,
  signal?: AbortSignal,
): Promise<void> {
  return del(`/v1/projects/${projectId}/scenes/${sceneId}`, signal)
}
