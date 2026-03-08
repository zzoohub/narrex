import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/api/sse', () => ({
  createSSEStream: vi.fn(),
}))

import { createSSEStream } from '@/shared/api/sse'
import { streamStructure } from './api'

const mockCreateSSEStream = vi.mocked(createSSEStream)

describe('structuring API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('streamStructure', () => {
    it('calls createSSEStream with /v1/projects and body', () => {
      const mockStream = { stream: {} as AsyncIterable<unknown>, abort: vi.fn() }
      mockCreateSSEStream.mockReturnValue(mockStream)

      const body = { sourceInput: 'A knight returns to his childhood...' }
      const result = streamStructure(body)
      expect(mockCreateSSEStream).toHaveBeenCalledWith('/v1/projects', { body })
      expect(result).toBe(mockStream)
    })

    it('includes clarificationAnswers when provided', () => {
      mockCreateSSEStream.mockReturnValue({ stream: {} as AsyncIterable<unknown>, abort: vi.fn() })

      const body = { sourceInput: 'Fantasy story', clarificationAnswers: ['Fantasy', 'A knight', 'Betrayal'] }
      streamStructure(body)
      expect(mockCreateSSEStream).toHaveBeenCalledWith('/v1/projects', { body })
    })

    it('works with minimal sourceInput only', () => {
      mockCreateSSEStream.mockReturnValue({ stream: {} as AsyncIterable<unknown>, abort: vi.fn() })

      streamStructure({ sourceInput: 'minimal' })
      expect(mockCreateSSEStream).toHaveBeenCalledWith('/v1/projects', { body: { sourceInput: 'minimal' } })
    })
  })
})
