import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/api/client', () => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  del: vi.fn(),
}))

import { get, post, patch, del } from '@/shared/api/client'
import { createScene, getScene, updateScene, deleteScene } from './api'

const mockGet = vi.mocked(get)
const mockPost = vi.mocked(post)
const mockPatch = vi.mocked(patch)
const mockDel = vi.mocked(del)

describe('scene API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createScene', () => {
    it('calls POST /v1/projects/:pid/scenes with body', async () => {
      const scene = { id: 's1', title: 'Scene 1' }
      mockPost.mockResolvedValue({ data: scene })

      const body = { trackId: 't1', title: 'Scene 1', startPosition: 0 }
      const result = await createScene('p1', body)
      expect(mockPost).toHaveBeenCalledWith('/v1/projects/p1/scenes', body, undefined)
      expect(result.data).toEqual(scene)
    })

    it('passes abort signal', async () => {
      mockPost.mockResolvedValue({ data: {} })
      const signal = new AbortController().signal

      await createScene('p1', { trackId: 't1', title: 'X' }, signal)
      expect(mockPost).toHaveBeenCalledWith('/v1/projects/p1/scenes', { trackId: 't1', title: 'X' }, signal)
    })
  })

  describe('getScene', () => {
    it('calls GET /v1/projects/:pid/scenes/:sid', async () => {
      const scene = { id: 's1', latestDraft: null }
      mockGet.mockResolvedValue({ data: scene })

      const result = await getScene('p1', 's1')
      expect(mockGet).toHaveBeenCalledWith('/v1/projects/p1/scenes/s1', undefined, undefined)
      expect(result.data).toEqual(scene)
    })
  })

  describe('updateScene', () => {
    it('calls PATCH /v1/projects/:pid/scenes/:sid', async () => {
      const scene = { id: 's1', title: 'Updated' }
      mockPatch.mockResolvedValue({ data: scene })

      const result = await updateScene('p1', 's1', { title: 'Updated' })
      expect(mockPatch).toHaveBeenCalledWith('/v1/projects/p1/scenes/s1', { title: 'Updated' }, undefined)
      expect(result.data).toEqual(scene)
    })
  })

  describe('deleteScene', () => {
    it('calls DELETE /v1/projects/:pid/scenes/:sid', async () => {
      mockDel.mockResolvedValue(undefined)

      await deleteScene('p1', 's1')
      expect(mockDel).toHaveBeenCalledWith('/v1/projects/p1/scenes/s1', undefined)
    })
  })
})
