import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/api/client', () => ({
  post: vi.fn(),
  del: vi.fn(),
}))

import { post, del } from '@/shared/api/client'
import { createConnection, deleteConnection } from './api'

const mockPost = vi.mocked(post)
const mockDel = vi.mocked(del)

describe('connection API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createConnection', () => {
    it('calls POST /v1/projects/:pid/connections', async () => {
      const conn = { id: 'conn1', sourceSceneId: 's1', targetSceneId: 's2', connectionType: 'branch' }
      mockPost.mockResolvedValue({ data: conn })

      const body = { sourceSceneId: 's1', targetSceneId: 's2', connectionType: 'branch' as const }
      const result = await createConnection('p1', body)
      expect(mockPost).toHaveBeenCalledWith('/v1/projects/p1/connections', body, undefined)
      expect(result.data).toEqual(conn)
    })

    it('passes abort signal', async () => {
      mockPost.mockResolvedValue({ data: {} })
      const signal = new AbortController().signal

      const body = { sourceSceneId: 's1', targetSceneId: 's2', connectionType: 'merge' as const }
      await createConnection('p1', body, signal)
      expect(mockPost).toHaveBeenCalledWith('/v1/projects/p1/connections', body, signal)
    })
  })

  describe('deleteConnection', () => {
    it('calls DELETE /v1/projects/:pid/connections/:cid', async () => {
      mockDel.mockResolvedValue(undefined)

      await deleteConnection('p1', 'conn1')
      expect(mockDel).toHaveBeenCalledWith('/v1/projects/p1/connections/conn1', undefined)
    })

    it('passes abort signal', async () => {
      mockDel.mockResolvedValue(undefined)
      const signal = new AbortController().signal

      await deleteConnection('p1', 'conn1', signal)
      expect(mockDel).toHaveBeenCalledWith('/v1/projects/p1/connections/conn1', signal)
    })
  })
})
