import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/api/client', () => ({
  post: vi.fn(),
  patch: vi.fn(),
  del: vi.fn(),
}))

import { post, patch, del } from '@/shared/api/client'
import { createTrack, updateTrack, deleteTrack } from './api'

const mockPost = vi.mocked(post)
const mockPatch = vi.mocked(patch)
const mockDel = vi.mocked(del)

describe('track API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createTrack', () => {
    it('calls POST /v1/projects/:pid/tracks with body', async () => {
      const track = { id: 't1', label: 'Main' }
      mockPost.mockResolvedValue({ data: track })

      const result = await createTrack('p1', { label: 'Main', position: 0 })
      expect(mockPost).toHaveBeenCalledWith('/v1/projects/p1/tracks', { label: 'Main', position: 0 }, undefined)
      expect(result.data).toEqual(track)
    })

    it('passes abort signal', async () => {
      mockPost.mockResolvedValue({ data: {} })
      const signal = new AbortController().signal

      await createTrack('p1', { label: 'X' }, signal)
      expect(mockPost).toHaveBeenCalledWith('/v1/projects/p1/tracks', { label: 'X' }, signal)
    })
  })

  describe('updateTrack', () => {
    it('calls PATCH /v1/projects/:pid/tracks/:tid', async () => {
      const track = { id: 't1', label: 'Updated' }
      mockPatch.mockResolvedValue({ data: track })

      const result = await updateTrack('p1', 't1', { label: 'Updated' })
      expect(mockPatch).toHaveBeenCalledWith('/v1/projects/p1/tracks/t1', { label: 'Updated' }, undefined)
      expect(result.data).toEqual(track)
    })
  })

  describe('deleteTrack', () => {
    it('calls DELETE /v1/projects/:pid/tracks/:tid', async () => {
      mockDel.mockResolvedValue(undefined)

      await deleteTrack('p1', 't1')
      expect(mockDel).toHaveBeenCalledWith('/v1/projects/p1/tracks/t1', undefined)
    })
  })
})
