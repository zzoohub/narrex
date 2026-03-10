import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the shared API client
vi.mock('@/shared/api/client', () => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  del: vi.fn(),
}))

import { get, patch, del } from '@/shared/api/client'
import { listProjects, getProject, updateProject, deleteProject, getWorkspace } from './api'

const mockGet = vi.mocked(get)
const mockPatch = vi.mocked(patch)
const mockDel = vi.mocked(del)

describe('project API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listProjects', () => {
    it('calls GET /v1/projects with no params', async () => {
      const response = { data: [], meta: { limit: 20, nextCursor: null, hasMore: false } }
      mockGet.mockResolvedValue(response)

      const result = await listProjects()
      expect(mockGet).toHaveBeenCalledWith('/v1/projects', { cursor: undefined, limit: undefined }, undefined)
      expect(result).toEqual(response)
    })

    it('passes cursor and limit as query params', async () => {
      const response = { data: [], meta: { limit: 10, nextCursor: null, hasMore: false } }
      mockGet.mockResolvedValue(response)

      await listProjects({ cursor: 'abc', limit: 10 })
      expect(mockGet).toHaveBeenCalledWith('/v1/projects', { cursor: 'abc', limit: 10 }, undefined)
    })

    it('passes abort signal', async () => {
      mockGet.mockResolvedValue({ data: [], meta: { limit: 20, nextCursor: null, hasMore: false } })
      const signal = new AbortController().signal

      await listProjects(undefined, signal)
      expect(mockGet).toHaveBeenCalledWith('/v1/projects', { cursor: undefined, limit: undefined }, signal)
    })
  })

  describe('getProject', () => {
    it('calls GET /v1/projects/:id', async () => {
      const project = { id: 'p1', title: 'Test' }
      mockGet.mockResolvedValue({ data: project })

      const result = await getProject('p1')
      expect(mockGet).toHaveBeenCalledWith('/v1/projects/p1', undefined, undefined)
      expect(result.data).toEqual(project)
    })

    it('passes abort signal', async () => {
      mockGet.mockResolvedValue({ data: {} })
      const signal = new AbortController().signal

      await getProject('p1', signal)
      expect(mockGet).toHaveBeenCalledWith('/v1/projects/p1', undefined, signal)
    })
  })

  describe('updateProject', () => {
    it('calls PATCH /v1/projects/:id with body', async () => {
      const updated = { id: 'p1', title: 'Updated' }
      mockPatch.mockResolvedValue({ data: updated })

      const result = await updateProject('p1', { title: 'Updated' })
      expect(mockPatch).toHaveBeenCalledWith('/v1/projects/p1', { title: 'Updated' }, undefined)
      expect(result.data).toEqual(updated)
    })
  })

  describe('deleteProject', () => {
    it('calls DELETE /v1/projects/:id', async () => {
      mockDel.mockResolvedValue(undefined)

      await deleteProject('p1')
      expect(mockDel).toHaveBeenCalledWith('/v1/projects/p1', undefined)
    })
  })

  describe('getWorkspace', () => {
    it('calls GET /v1/projects/:id/workspace', async () => {
      const workspace = { project: {}, tracks: [], scenes: [], characters: [], relationships: [], connections: [] }
      mockGet.mockResolvedValue({ data: workspace })

      const result = await getWorkspace('p1')
      expect(mockGet).toHaveBeenCalledWith('/v1/projects/p1/workspace', undefined, undefined)
      expect(result.data).toEqual(workspace)
    })
  })
})
