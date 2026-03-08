import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/api/client', () => ({
  get: vi.fn(),
  post: vi.fn(),
}))

import { get, post } from '@/shared/api/client'
import { listDrafts, getDraft, saveDraft } from './api'

const mockGet = vi.mocked(get)
const mockPost = vi.mocked(post)

describe('draft API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listDrafts', () => {
    it('calls GET /v1/projects/:pid/scenes/:sid/drafts', async () => {
      const drafts = [{ id: 'd1', version: 1 }]
      mockGet.mockResolvedValue({ data: drafts })

      const result = await listDrafts('p1', 's1')
      expect(mockGet).toHaveBeenCalledWith('/v1/projects/p1/scenes/s1/drafts', undefined, undefined)
      expect(result.data).toEqual(drafts)
    })

    it('passes abort signal', async () => {
      mockGet.mockResolvedValue({ data: [] })
      const signal = new AbortController().signal

      await listDrafts('p1', 's1', signal)
      expect(mockGet).toHaveBeenCalledWith('/v1/projects/p1/scenes/s1/drafts', undefined, signal)
    })
  })

  describe('getDraft', () => {
    it('calls GET /v1/projects/:pid/scenes/:sid/drafts/:version', async () => {
      const draft = { id: 'd1', version: 2, content: 'text' }
      mockGet.mockResolvedValue({ data: draft })

      const result = await getDraft('p1', 's1', 2)
      expect(mockGet).toHaveBeenCalledWith('/v1/projects/p1/scenes/s1/drafts/2', undefined, undefined)
      expect(result.data).toEqual(draft)
    })
  })

  describe('saveDraft', () => {
    it('calls POST /v1/projects/:pid/scenes/:sid/drafts with body', async () => {
      const draft = { id: 'd1', version: 1, content: 'new content' }
      mockPost.mockResolvedValue({ data: draft })

      const body = { content: 'new content' }
      const result = await saveDraft('p1', 's1', body)
      expect(mockPost).toHaveBeenCalledWith('/v1/projects/p1/scenes/s1/drafts', body, undefined)
      expect(result.data).toEqual(draft)
    })
  })
})
