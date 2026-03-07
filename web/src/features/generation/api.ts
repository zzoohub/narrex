import { createSSEStream } from '@/shared/api/sse'
import type { SSEStream } from '@/shared/api/sse'
import type { EditDraftRequest } from '@/entities/draft'

export function streamGeneration(projectId: string, sceneId: string): SSEStream {
  return createSSEStream(`/v1/projects/${projectId}/scenes/${sceneId}/generate`)
}

export function streamEdit(projectId: string, sceneId: string, body: EditDraftRequest): SSEStream {
  return createSSEStream(
    `/v1/projects/${projectId}/scenes/${sceneId}/edit`,
    { body },
  )
}
