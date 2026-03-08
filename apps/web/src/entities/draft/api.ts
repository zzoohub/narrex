import { get, post } from '@/shared/api/client'
import type { DataEnvelope } from '@/shared/api/types'
import type { Draft, DraftSummary, CreateDraftRequest } from './model'

export function listDrafts(
  projectId: string,
  sceneId: string,
  signal?: AbortSignal,
): Promise<DataEnvelope<DraftSummary[]>> {
  return get(`/v1/projects/${projectId}/scenes/${sceneId}/drafts`, undefined, signal)
}

export function getDraft(
  projectId: string,
  sceneId: string,
  version: number,
  signal?: AbortSignal,
): Promise<DataEnvelope<Draft>> {
  return get(`/v1/projects/${projectId}/scenes/${sceneId}/drafts/${version}`, undefined, signal)
}

export function saveDraft(
  projectId: string,
  sceneId: string,
  body: CreateDraftRequest,
  signal?: AbortSignal,
): Promise<DataEnvelope<Draft>> {
  return post(`/v1/projects/${projectId}/scenes/${sceneId}/drafts`, body, signal)
}
