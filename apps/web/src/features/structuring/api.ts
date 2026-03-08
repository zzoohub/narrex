import { createSSEStream } from '@/shared/api/sse'
import type { SSEStream } from '@/shared/api/sse'

export interface StructureRequest {
  sourceInput: string
  clarificationAnswers?: string[]
  locale?: string
}

export function streamStructure(body: StructureRequest): SSEStream {
  return createSSEStream('/v1/projects/structure', { body })
}
