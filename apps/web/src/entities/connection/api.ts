import { post, del } from '@/shared/api/client'
import type { DataEnvelope } from '@/shared/api/types'
import type { SceneConnection, CreateConnectionRequest } from './model'

export function createConnection(
  projectId: string,
  body: CreateConnectionRequest,
  signal?: AbortSignal,
): Promise<DataEnvelope<SceneConnection>> {
  return post(`/v1/projects/${projectId}/connections`, body, signal)
}

export function deleteConnection(
  projectId: string,
  connectionId: string,
  signal?: AbortSignal,
): Promise<void> {
  return del(`/v1/projects/${projectId}/connections/${connectionId}`, signal)
}
