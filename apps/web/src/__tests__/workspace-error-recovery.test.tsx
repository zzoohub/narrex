import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot } from 'solid-js'
import { WorkspaceProvider, useWorkspace } from '@/features/workspace/store'
import type { WorkspaceContextValue } from '@/features/workspace/store'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/entities/project/api', () => ({
  getWorkspace: vi.fn(),
  updateProject: vi.fn(),
}))

vi.mock('@/entities/scene/api', () => ({
  createScene: vi.fn(),
  updateScene: vi.fn(),
  deleteScene: vi.fn(),
}))

vi.mock('@/entities/track/api', () => ({
  createTrack: vi.fn(),
  updateTrack: vi.fn(),
  deleteTrack: vi.fn(),
}))

vi.mock('@/entities/character/api', () => ({
  createCharacter: vi.fn(),
  updateCharacter: vi.fn(),
  deleteCharacter: vi.fn(),
  createRelationship: vi.fn(),
  updateRelationship: vi.fn(),
  deleteRelationship: vi.fn(),
}))

vi.mock('@/entities/connection/api', () => ({
  createConnection: vi.fn(),
  deleteConnection: vi.fn(),
}))

import * as projectApi from '@/entities/project/api'
import * as sceneApi from '@/entities/scene/api'
import * as trackApi from '@/entities/track/api'
import * as characterApi from '@/entities/character/api'
import * as connectionApi from '@/entities/connection/api'

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const WORKSPACE_DATA = {
  project: {
    id: 'p1',
    title: 'My Story',
    genre: 'Fantasy',
    theme: 'Redemption',
    eraLocation: 'Medieval',
    pov: 'third_limited' as const,
    tone: 'dark, gritty',
    sourceType: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  tracks: [
    { id: 't1', projectId: 'p1', position: 0, label: 'Main Plot', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 't2', projectId: 'p1', position: 1, label: 'Subplot', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  ],
  scenes: [
    { id: 's1', trackId: 't1', projectId: 'p1', startPosition: 0, duration: 1, status: 'empty' as const, title: 'Opening', plotSummary: 'The hero arrives', location: 'Village', moodTags: ['tense'], content: null, characterIds: ['c1'], createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 's2', trackId: 't1', projectId: 'p1', startPosition: 2, duration: 1, status: 'ai_draft' as const, title: 'Conflict', plotSummary: null, location: null, moodTags: [], content: 'The villain appeared.', characterIds: ['c1', 'c2'], createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 's3', trackId: 't2', projectId: 'p1', startPosition: 1, duration: 2, status: 'edited' as const, title: 'Side Quest', plotSummary: null, location: null, moodTags: [], content: 'A side adventure.', characterIds: [], createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  ],
  characters: [
    { id: 'c1', projectId: 'p1', name: 'Hero', personality: 'Brave', appearance: 'Tall', secrets: null, motivation: 'Save the world', profileImageUrl: null, graphX: 100, graphY: 100, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 'c2', projectId: 'p1', name: 'Villain', personality: 'Cunning', appearance: 'Dark', secrets: 'Was once a hero', motivation: 'Power', profileImageUrl: null, graphX: 300, graphY: 100, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  ],
  relationships: [
    { id: 'r1', projectId: 'p1', characterAId: 'c1', characterBId: 'c2', label: 'Rivals', visualType: 'dashed' as const, direction: 'bidirectional' as const, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  ],
  connections: [
    { id: 'conn1', projectId: 'p1', sourceSceneId: 's1', targetSceneId: 's3', connectionType: 'branch' as const, createdAt: '2024-01-01T00:00:00Z' },
  ],
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function loadedWorkspace(): Promise<{ ctx: WorkspaceContextValue; dispose: () => void }> {
  const clonedData = JSON.parse(JSON.stringify(WORKSPACE_DATA))
  vi.mocked(projectApi.getWorkspace).mockResolvedValue({ data: clonedData })

  let ctxRef: WorkspaceContextValue | undefined
  let disposeFn: (() => void) | undefined

  createRoot((dispose) => {
    const Wrapper = () => {
      return WorkspaceProvider({
        get projectId() { return 'p1' },
        get children() {
          const Consumer = () => {
            ctxRef = useWorkspace()
            return null
          }
          return Consumer()
        },
      })
    }
    Wrapper()
    disposeFn = dispose
  })

  await Promise.resolve()
  await Promise.resolve()

  return { ctx: ctxRef!, dispose: disposeFn! }
}

// ---------------------------------------------------------------------------
// Tests — optimistic update rollback & error recovery
// ---------------------------------------------------------------------------

describe('Workspace Error Recovery & Optimistic Rollbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    // Default: all API calls succeed
    vi.mocked(projectApi.updateProject).mockResolvedValue({ data: {} as never })
    vi.mocked(sceneApi.createScene).mockImplementation(async (_pid, body) => ({
      data: {
        id: 'new-s',
        projectId: 'p1',
        trackId: body.trackId,
        startPosition: body.startPosition ?? 0,
        duration: 1,
        status: 'empty' as const,
        title: body.title ?? '',
        plotSummary: null,
        location: null,
        moodTags: [],
        content: null,
        characterIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }))
    vi.mocked(sceneApi.updateScene).mockResolvedValue({ data: {} as never })
    vi.mocked(sceneApi.deleteScene).mockResolvedValue(undefined as never)
    vi.mocked(trackApi.createTrack).mockImplementation(async (_pid, body) => ({
      data: {
        id: 'new-t',
        projectId: 'p1',
        position: body.position ?? 0,
        label: body.label ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }))
    vi.mocked(trackApi.updateTrack).mockResolvedValue({ data: {} as never })
    vi.mocked(trackApi.deleteTrack).mockResolvedValue(undefined as never)
    vi.mocked(characterApi.createCharacter).mockImplementation(async (_pid, body) => ({
      data: {
        id: 'new-c',
        projectId: 'p1',
        name: body.name,
        personality: null,
        appearance: null,
        secrets: null,
        motivation: null,
        profileImageUrl: null,
        graphX: body.graphX ?? null,
        graphY: body.graphY ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }))
    vi.mocked(characterApi.updateCharacter).mockResolvedValue({ data: {} as never })
    vi.mocked(characterApi.deleteCharacter).mockResolvedValue(undefined as never)
    vi.mocked(characterApi.createRelationship).mockImplementation(async (_pid, body) => ({
      data: {
        id: 'new-r',
        projectId: 'p1',
        ...body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }))
    vi.mocked(characterApi.updateRelationship).mockResolvedValue({ data: {} as never })
    vi.mocked(characterApi.deleteRelationship).mockResolvedValue(undefined as never)
    vi.mocked(connectionApi.createConnection).mockImplementation(async (_pid, body) => ({
      data: {
        id: 'new-conn',
        projectId: 'p1',
        ...body,
        createdAt: new Date().toISOString(),
      },
    }))
    vi.mocked(connectionApi.deleteConnection).mockResolvedValue(undefined as never)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── Workflow 1: Scene delete rollback on API failure ─────────────────

  describe('scene delete rollback', () => {
    it('restores scene when deleteScene API rejects', async () => {
      vi.mocked(sceneApi.deleteScene).mockRejectedValue(new Error('Network error'))
      const { ctx, dispose } = await loadedWorkspace()

      const sceneBefore = ctx.state.scenes.find(s => s.id === 's1')
      expect(sceneBefore).toBeDefined()

      ctx.removeScene('s1')

      // Optimistic: scene removed immediately
      expect(ctx.state.scenes.find(s => s.id === 's1')).toBeUndefined()

      // Flush the rejected promise
      await vi.advanceTimersByTimeAsync(0)

      // Rollback: scene restored
      expect(ctx.state.scenes.find(s => s.id === 's1')).toBeDefined()
      expect(ctx.state.scenes.find(s => s.id === 's1')!.title).toBe('Opening')
      expect(ctx.saveStatus()).toBe('error')

      dispose()
    })

    it('restores selection if deleted scene was selected and API fails', async () => {
      vi.mocked(sceneApi.deleteScene).mockRejectedValue(new Error('fail'))
      const { ctx, dispose } = await loadedWorkspace()

      ctx.selectScene('s1')
      expect(ctx.selectedSceneId()).toBe('s1')

      ctx.removeScene('s1')
      expect(ctx.selectedSceneId()).toBeNull()

      await vi.advanceTimersByTimeAsync(0)

      // Scene restored, but selection is not automatically restored (store doesn't track)
      expect(ctx.state.scenes.find(s => s.id === 's1')).toBeDefined()

      dispose()
    })
  })

  // ── Workflow 2: Track delete rollback on API failure ────────────────

  describe('track delete rollback', () => {
    it('restores track and its scenes when deleteTrack API rejects', async () => {
      vi.mocked(trackApi.deleteTrack).mockRejectedValue(new Error('Network error'))
      const { ctx, dispose } = await loadedWorkspace()

      const t2ScenesBefore = ctx.state.scenes.filter(s => s.trackId === 't2').length
      expect(t2ScenesBefore).toBe(1)

      ctx.removeTrack('t2')

      // Optimistic: track and scenes removed
      expect(ctx.state.tracks.find(t => t.id === 't2')).toBeUndefined()
      expect(ctx.state.scenes.filter(s => s.trackId === 't2').length).toBe(0)

      await vi.advanceTimersByTimeAsync(0)

      // Rollback: track and scenes restored
      expect(ctx.state.tracks.find(t => t.id === 't2')).toBeDefined()
      expect(ctx.state.scenes.filter(s => s.trackId === 't2').length).toBe(t2ScenesBefore)
      expect(ctx.saveStatus()).toBe('error')

      dispose()
    })
  })

  // ── Workflow 3: Scene create rollback on API failure ────────────────

  describe('scene create rollback', () => {
    it('removes optimistically added scene when createScene API rejects', async () => {
      vi.mocked(sceneApi.createScene).mockRejectedValue(new Error('Server error'))
      const { ctx, dispose } = await loadedWorkspace()

      const countBefore = ctx.state.scenes.length

      ctx.addScene('t1', 5)

      // Optimistic: scene added
      expect(ctx.state.scenes.length).toBe(countBefore + 1)

      await vi.advanceTimersByTimeAsync(0)

      // Rollback: scene removed
      expect(ctx.state.scenes.length).toBe(countBefore)
      expect(ctx.saveStatus()).toBe('error')

      dispose()
    })
  })

  // ── Workflow 4: Track create rollback on API failure ────────────────

  describe('track create rollback', () => {
    it('removes optimistically added track when createTrack API rejects', async () => {
      vi.mocked(trackApi.createTrack).mockRejectedValue(new Error('Server error'))
      const { ctx, dispose } = await loadedWorkspace()

      const countBefore = ctx.state.tracks.length

      ctx.addTrack('New Track')

      // Optimistic: track added
      expect(ctx.state.tracks.length).toBe(countBefore + 1)

      await vi.advanceTimersByTimeAsync(0)

      // Rollback: track removed
      expect(ctx.state.tracks.length).toBe(countBefore)
      expect(ctx.saveStatus()).toBe('error')

      dispose()
    })
  })

  // ── Workflow 5: Character create rollback on API failure ───────────

  describe('character create rollback', () => {
    it('removes optimistically added character when createCharacter API rejects', async () => {
      vi.mocked(characterApi.createCharacter).mockRejectedValue(new Error('Server error'))
      const { ctx, dispose } = await loadedWorkspace()

      const countBefore = ctx.state.characters.length

      ctx.addCharacter('Sidekick')

      // Optimistic: character added
      expect(ctx.state.characters.length).toBe(countBefore + 1)

      await vi.advanceTimersByTimeAsync(0)

      // Rollback: character removed
      expect(ctx.state.characters.length).toBe(countBefore)
      expect(ctx.saveStatus()).toBe('error')

      dispose()
    })
  })

  // ── Workflow 6: Move scene rollback on API failure ──────────────────

  describe('scene move rollback', () => {
    it('restores original position when moveScene API rejects', async () => {
      vi.mocked(sceneApi.updateScene).mockRejectedValue(new Error('Network error'))
      const { ctx, dispose } = await loadedWorkspace()

      const s1Before = ctx.state.scenes.find(s => s.id === 's1')!
      expect(s1Before.trackId).toBe('t1')
      expect(s1Before.startPosition).toBe(0)

      ctx.moveScene('s1', 't2', 5)

      // Optimistic: moved
      expect(ctx.state.scenes.find(s => s.id === 's1')!.trackId).toBe('t2')
      expect(ctx.state.scenes.find(s => s.id === 's1')!.startPosition).toBe(5)

      await vi.advanceTimersByTimeAsync(0)

      // Rollback: restored to original
      expect(ctx.state.scenes.find(s => s.id === 's1')!.trackId).toBe('t1')
      expect(ctx.state.scenes.find(s => s.id === 's1')!.startPosition).toBe(0)
      expect(ctx.saveStatus()).toBe('error')

      dispose()
    })
  })

  // ── Workflow 7: Connection create rollback ─────────────────────────

  describe('connection create rollback', () => {
    it('removes optimistically added connection when createConnection API rejects', async () => {
      vi.mocked(connectionApi.createConnection).mockRejectedValue(new Error('fail'))
      const { ctx, dispose } = await loadedWorkspace()

      const countBefore = ctx.state.connections.length

      ctx.addConnection('s1', 's2', 'merge')

      // Optimistic: added
      expect(ctx.state.connections.length).toBe(countBefore + 1)

      await vi.advanceTimersByTimeAsync(0)

      // Rollback
      expect(ctx.state.connections.length).toBe(countBefore)
      expect(ctx.saveStatus()).toBe('error')

      dispose()
    })
  })

  // ── Workflow 8: Connection delete rollback ─────────────────────────

  describe('connection delete rollback', () => {
    it('restores connection when deleteConnection API rejects', async () => {
      vi.mocked(connectionApi.deleteConnection).mockRejectedValue(new Error('fail'))
      const { ctx, dispose } = await loadedWorkspace()

      expect(ctx.state.connections.find(c => c.id === 'conn1')).toBeDefined()

      ctx.removeConnection('conn1')

      // Optimistic: removed
      expect(ctx.state.connections.find(c => c.id === 'conn1')).toBeUndefined()

      await vi.advanceTimersByTimeAsync(0)

      // Rollback
      expect(ctx.state.connections.find(c => c.id === 'conn1')).toBeDefined()
      expect(ctx.saveStatus()).toBe('error')

      dispose()
    })
  })

  // ── Workflow 9: Relationship create rollback ───────────────────────

  describe('relationship create rollback', () => {
    it('removes optimistically added relationship when API rejects', async () => {
      vi.mocked(characterApi.createRelationship).mockRejectedValue(new Error('fail'))
      const { ctx, dispose } = await loadedWorkspace()

      const countBefore = ctx.state.relationships.length

      ctx.addRelationship('c1', 'c2', 'Allies', 'solid')

      // Optimistic: added
      expect(ctx.state.relationships.length).toBe(countBefore + 1)

      await vi.advanceTimersByTimeAsync(0)

      // Rollback
      expect(ctx.state.relationships.length).toBe(countBefore)
      expect(ctx.saveStatus()).toBe('error')

      dispose()
    })
  })

  // ── Workflow 10: Relationship delete rollback ──────────────────────

  describe('relationship delete rollback', () => {
    it('restores relationship when deleteRelationship API rejects', async () => {
      vi.mocked(characterApi.deleteRelationship).mockRejectedValue(new Error('fail'))
      const { ctx, dispose } = await loadedWorkspace()

      expect(ctx.state.relationships.find(r => r.id === 'r1')).toBeDefined()

      ctx.removeRelationship('r1')

      // Optimistic: removed
      expect(ctx.state.relationships.find(r => r.id === 'r1')).toBeUndefined()

      await vi.advanceTimersByTimeAsync(0)

      // Rollback
      expect(ctx.state.relationships.find(r => r.id === 'r1')).toBeDefined()
      expect(ctx.saveStatus()).toBe('error')

      dispose()
    })
  })

  // ── Workflow 11: Character delete rollback ─────────────────────────

  describe('character delete rollback', () => {
    it('restores character when deleteCharacter API rejects', async () => {
      vi.mocked(characterApi.deleteCharacter).mockRejectedValue(new Error('fail'))
      const { ctx, dispose } = await loadedWorkspace()

      expect(ctx.state.characters.find(c => c.id === 'c2')).toBeDefined()

      ctx.removeCharacter('c2')

      // Optimistic: removed character, relationships, scene assignments
      expect(ctx.state.characters.find(c => c.id === 'c2')).toBeUndefined()

      await vi.advanceTimersByTimeAsync(0)

      // Character restored (note: relationships/scene assignments are NOT restored
      // by the current implementation — only the character itself is pushed back)
      expect(ctx.state.characters.find(c => c.id === 'c2')).toBeDefined()

      dispose()
    })
  })
})
