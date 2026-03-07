import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/api/client', () => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  del: vi.fn(),
}))

import { get, post, patch, del } from '@/shared/api/client'
import {
  createCharacter,
  getCharacter,
  updateCharacter,
  deleteCharacter,
  createRelationship,
  updateRelationship,
  deleteRelationship,
} from './api'

const mockGet = vi.mocked(get)
const mockPost = vi.mocked(post)
const mockPatch = vi.mocked(patch)
const mockDel = vi.mocked(del)

describe('character API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createCharacter', () => {
    it('calls POST /v1/projects/:pid/characters', async () => {
      const char = { id: 'c1', name: 'Hero' }
      mockPost.mockResolvedValue({ data: char })

      const result = await createCharacter('p1', { name: 'Hero' })
      expect(mockPost).toHaveBeenCalledWith('/v1/projects/p1/characters', { name: 'Hero' }, undefined)
      expect(result.data).toEqual(char)
    })
  })

  describe('getCharacter', () => {
    it('calls GET /v1/projects/:pid/characters/:cid', async () => {
      const char = { id: 'c1', name: 'Hero' }
      mockGet.mockResolvedValue({ data: char })

      const result = await getCharacter('p1', 'c1')
      expect(mockGet).toHaveBeenCalledWith('/v1/projects/p1/characters/c1', undefined, undefined)
      expect(result.data).toEqual(char)
    })
  })

  describe('updateCharacter', () => {
    it('calls PATCH /v1/projects/:pid/characters/:cid', async () => {
      const char = { id: 'c1', name: 'Updated Hero' }
      mockPatch.mockResolvedValue({ data: char })

      const result = await updateCharacter('p1', 'c1', { name: 'Updated Hero' })
      expect(mockPatch).toHaveBeenCalledWith('/v1/projects/p1/characters/c1', { name: 'Updated Hero' }, undefined)
      expect(result.data).toEqual(char)
    })
  })

  describe('deleteCharacter', () => {
    it('calls DELETE /v1/projects/:pid/characters/:cid', async () => {
      mockDel.mockResolvedValue(undefined)

      await deleteCharacter('p1', 'c1')
      expect(mockDel).toHaveBeenCalledWith('/v1/projects/p1/characters/c1', undefined)
    })
  })

  describe('createRelationship', () => {
    it('calls POST /v1/projects/:pid/relationships', async () => {
      const rel = { id: 'r1', label: 'Ally' }
      mockPost.mockResolvedValue({ data: rel })

      const body = { characterAId: 'c1', characterBId: 'c2', label: 'Ally', visualType: 'solid' as const, direction: 'bidirectional' as const }
      const result = await createRelationship('p1', body)
      expect(mockPost).toHaveBeenCalledWith('/v1/projects/p1/relationships', body, undefined)
      expect(result.data).toEqual(rel)
    })
  })

  describe('updateRelationship', () => {
    it('calls PATCH /v1/projects/:pid/relationships/:rid', async () => {
      const rel = { id: 'r1', label: 'Rival' }
      mockPatch.mockResolvedValue({ data: rel })

      const result = await updateRelationship('p1', 'r1', { label: 'Rival' })
      expect(mockPatch).toHaveBeenCalledWith('/v1/projects/p1/relationships/r1', { label: 'Rival' }, undefined)
      expect(result.data).toEqual(rel)
    })
  })

  describe('deleteRelationship', () => {
    it('calls DELETE /v1/projects/:pid/relationships/:rid', async () => {
      mockDel.mockResolvedValue(undefined)

      await deleteRelationship('p1', 'r1')
      expect(mockDel).toHaveBeenCalledWith('/v1/projects/p1/relationships/r1', undefined)
    })
  })
})
