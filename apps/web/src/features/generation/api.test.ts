import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/api/sse', () => ({
  createSSEStream: vi.fn(),
}))

import { createSSEStream, type SSEEvent } from '@/shared/api/sse'
import { streamGeneration, streamEdit } from './api'

const mockCreateSSEStream = vi.mocked(createSSEStream)

describe('generation API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('streamGeneration', () => {
    it('calls createSSEStream with correct path', () => {
      const mockStream = { stream: {} as AsyncIterable<SSEEvent>, abort: vi.fn() }
      mockCreateSSEStream.mockReturnValue(mockStream)

      const result = streamGeneration('p1', 's1')
      expect(mockCreateSSEStream).toHaveBeenCalledWith('/v1/projects/p1/scenes/s1/generate')
      expect(result).toBe(mockStream)
    })

    it('includes project and scene IDs in path', () => {
      mockCreateSSEStream.mockReturnValue({ stream: {} as AsyncIterable<SSEEvent>, abort: vi.fn() })

      streamGeneration('project-abc', 'scene-xyz')
      expect(mockCreateSSEStream).toHaveBeenCalledWith('/v1/projects/project-abc/scenes/scene-xyz/generate')
    })
  })

  describe('streamEdit', () => {
    it('calls createSSEStream with correct path and body', () => {
      const mockStream = { stream: {} as AsyncIterable<SSEEvent>, abort: vi.fn() }
      mockCreateSSEStream.mockReturnValue(mockStream)

      const body = { content: 'original', direction: 'make it shorter' }
      const result = streamEdit('p1', 's1', body)
      expect(mockCreateSSEStream).toHaveBeenCalledWith(
        '/v1/projects/p1/scenes/s1/edit',
        { body },
      )
      expect(result).toBe(mockStream)
    })

    it('passes selectedText in body when provided', () => {
      mockCreateSSEStream.mockReturnValue({ stream: {} as AsyncIterable<SSEEvent>, abort: vi.fn() })

      const body = { content: 'text', selectedText: 'part of text', direction: 'expand' }
      streamEdit('p1', 's1', body)
      expect(mockCreateSSEStream).toHaveBeenCalledWith(
        '/v1/projects/p1/scenes/s1/edit',
        { body },
      )
    })
  })
})
