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
  ],
  scenes: [
    { id: 's1', trackId: 't1', projectId: 'p1', startPosition: 0, duration: 1, status: 'ai_draft' as const, title: 'Opening', plotSummary: 'The hero arrives', location: 'Village', moodTags: ['tense'], content: 'Initial draft content', characterIds: ['c1'], createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 's2', trackId: 't1', projectId: 'p1', startPosition: 2, duration: 1, status: 'empty' as const, title: 'Scene 2', plotSummary: null, location: null, moodTags: [], content: null, characterIds: [], createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  ],
  characters: [
    { id: 'c1', projectId: 'p1', name: 'Hero', personality: 'Brave', appearance: 'Tall', secrets: null, motivation: 'Save the world', profileImageUrl: null, graphX: 100, graphY: 100, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  ],
  relationships: [],
  connections: [],
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
    WorkspaceProvider({
      get projectId() { return 'p1' },
      get children() {
        const Consumer = () => {
          ctxRef = useWorkspace()
          return null
        }
        return Consumer()
      },
    })
    disposeFn = dispose
  })

  await Promise.resolve()
  await Promise.resolve()

  return { ctx: ctxRef!, dispose: disposeFn! }
}

// ---------------------------------------------------------------------------
// Tests — auto-save, debouncing, and content persistence
// ---------------------------------------------------------------------------

describe('Workspace Auto-Save & Debouncing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    vi.mocked(projectApi.updateProject).mockResolvedValue({ data: {} as never })
    vi.mocked(sceneApi.createScene).mockResolvedValue({ data: {} as never })
    vi.mocked(sceneApi.updateScene).mockResolvedValue({ data: {} as never })
    vi.mocked(sceneApi.deleteScene).mockResolvedValue(undefined as never)
    vi.mocked(trackApi.createTrack).mockResolvedValue({ data: {} as never })
    vi.mocked(trackApi.updateTrack).mockResolvedValue({ data: {} as never })
    vi.mocked(trackApi.deleteTrack).mockResolvedValue(undefined as never)
    vi.mocked(characterApi.createCharacter).mockResolvedValue({ data: {} as never })
    vi.mocked(characterApi.updateCharacter).mockResolvedValue({ data: {} as never })
    vi.mocked(characterApi.deleteCharacter).mockResolvedValue(undefined as never)
    vi.mocked(characterApi.createRelationship).mockResolvedValue({ data: {} as never })
    vi.mocked(characterApi.updateRelationship).mockResolvedValue({ data: {} as never })
    vi.mocked(characterApi.deleteRelationship).mockResolvedValue(undefined as never)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── Save status lifecycle ─────────────────────────────────────────

  describe('save status transitions', () => {
    it('starts as saved after initial load', async () => {
      const { ctx, dispose } = await loadedWorkspace()
      expect(ctx.saveStatus()).toBe('saved')
      dispose()
    })

    it('transitions to saving on scene update, then back to saved after debounce', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      ctx.updateScene('s1', { title: 'New Title' })
      expect(ctx.saveStatus()).toBe('saving')

      vi.advanceTimersByTime(1000)
      expect(ctx.saveStatus()).toBe('saved')

      dispose()
    })

    it('transitions to saving on project update, then back to saved', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      ctx.updateProject({ genre: 'Thriller' })
      expect(ctx.saveStatus()).toBe('saving')

      vi.advanceTimersByTime(1000)
      expect(ctx.saveStatus()).toBe('saved')

      dispose()
    })

    it('transitions to error when updateScene API fails', async () => {
      vi.mocked(sceneApi.updateScene).mockRejectedValue(new Error('fail'))
      const { ctx, dispose } = await loadedWorkspace()

      ctx.updateScene('s1', { title: 'New' })
      expect(ctx.saveStatus()).toBe('saving')

      await vi.advanceTimersByTimeAsync(0)
      expect(ctx.saveStatus()).toBe('error')

      dispose()
    })

    it('transitions to error when updateProject API fails', async () => {
      vi.mocked(projectApi.updateProject).mockRejectedValue(new Error('fail'))
      const { ctx, dispose } = await loadedWorkspace()

      ctx.updateProject({ genre: 'Horror' })

      await vi.advanceTimersByTimeAsync(0)
      expect(ctx.saveStatus()).toBe('error')

      dispose()
    })

    it('resets debounce timer on rapid successive updates', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      ctx.updateScene('s1', { title: 'A' })
      expect(ctx.saveStatus()).toBe('saving')

      vi.advanceTimersByTime(500)
      ctx.updateScene('s1', { title: 'AB' })
      // Timer reset — still saving

      vi.advanceTimersByTime(500)
      // Only 500ms since last update, not yet 1000ms
      expect(ctx.saveStatus()).toBe('saving')

      vi.advanceTimersByTime(500)
      // Now 1000ms since last update
      expect(ctx.saveStatus()).toBe('saved')

      dispose()
    })
  })

  // ── Content auto-save to server ───────────────────────────────────

  describe('content save debouncing', () => {
    it('calls updateScene with content after 1500ms debounce', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      ctx.setDraftContent('s1', 'Updated content')

      // Not yet called (debounce 1500ms)
      expect(sceneApi.updateScene).not.toHaveBeenCalledWith('p1', 's1', expect.objectContaining({ content: 'Updated content' }))

      vi.advanceTimersByTime(1500)

      expect(sceneApi.updateScene).toHaveBeenCalledWith('p1', 's1', { content: 'Updated content' })

      dispose()
    })

    it('coalesces rapid content changes into single API call', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      ctx.setDraftContent('s1', 'A')
      vi.advanceTimersByTime(500)
      ctx.setDraftContent('s1', 'AB')
      vi.advanceTimersByTime(500)
      ctx.setDraftContent('s1', 'ABC')
      vi.advanceTimersByTime(1500)

      // Only the last content should be sent (one call with 'ABC')
      const contentCalls = vi.mocked(sceneApi.updateScene).mock.calls.filter(
        ([pid, sid, body]) => pid === 'p1' && sid === 's1' && 'content' in body,
      )
      expect(contentCalls.length).toBe(1)
      expect(contentCalls[0]![2]).toEqual({ content: 'ABC' })

      dispose()
    })

    it('saves content for different scenes independently', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      ctx.setDraftContent('s1', 'Content for s1')
      ctx.setDraftContent('s2', 'Content for s2')

      vi.advanceTimersByTime(1500)

      expect(sceneApi.updateScene).toHaveBeenCalledWith('p1', 's1', { content: 'Content for s1' })
      expect(sceneApi.updateScene).toHaveBeenCalledWith('p1', 's2', { content: 'Content for s2' })

      dispose()
    })

    it('sends null for empty content', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      ctx.setDraftContent('s1', '')

      vi.advanceTimersByTime(1500)

      expect(sceneApi.updateScene).toHaveBeenCalledWith('p1', 's1', { content: null })

      dispose()
    })
  })

  // ── Character update debouncing ───────────────────────────────────

  describe('character update debouncing', () => {
    it('merges multiple character field updates into single API call', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      ctx.updateCharacter('c1', { name: 'Great Hero' })
      ctx.updateCharacter('c1', { personality: 'Fearless' })
      ctx.updateCharacter('c1', { motivation: 'Justice' })

      expect(characterApi.updateCharacter).not.toHaveBeenCalled()

      vi.advanceTimersByTime(800)

      expect(characterApi.updateCharacter).toHaveBeenCalledOnce()
      expect(characterApi.updateCharacter).toHaveBeenCalledWith('p1', 'c1', {
        name: 'Great Hero',
        personality: 'Fearless',
        motivation: 'Justice',
      })

      dispose()
    })

    it('sends separate API calls for different characters', async () => {
      // Add a second character first
      vi.mocked(characterApi.createCharacter).mockImplementation(async (_pid, body) => ({
        data: {
          id: 'c2',
          projectId: 'p1',
          name: body.name,
          personality: null, appearance: null, secrets: null, motivation: null,
          profileImageUrl: null, graphX: null, graphY: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }))

      const { ctx, dispose } = await loadedWorkspace()

      ctx.addCharacter('Sidekick')
      await vi.advanceTimersByTimeAsync(0)

      vi.mocked(characterApi.updateCharacter).mockClear()

      ctx.updateCharacter('c1', { name: 'Hero v2' })
      ctx.updateCharacter('c2', { name: 'Sidekick v2' })

      vi.advanceTimersByTime(800)

      expect(characterApi.updateCharacter).toHaveBeenCalledTimes(2)
      expect(characterApi.updateCharacter).toHaveBeenCalledWith('p1', 'c1', { name: 'Hero v2' })
      expect(characterApi.updateCharacter).toHaveBeenCalledWith('p1', 'c2', { name: 'Sidekick v2' })

      dispose()
    })

    it('last field value wins when same field updated multiple times', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      ctx.updateCharacter('c1', { name: 'A' })
      ctx.updateCharacter('c1', { name: 'B' })
      ctx.updateCharacter('c1', { name: 'C' })

      vi.advanceTimersByTime(800)

      expect(characterApi.updateCharacter).toHaveBeenCalledOnce()
      expect(characterApi.updateCharacter).toHaveBeenCalledWith('p1', 'c1', { name: 'C' })

      dispose()
    })

    it('sets error status when character save fails', async () => {
      vi.mocked(characterApi.updateCharacter).mockRejectedValue(new Error('fail'))
      const { ctx, dispose } = await loadedWorkspace()

      ctx.updateCharacter('c1', { name: 'Bad Update' })

      vi.advanceTimersByTime(800)
      await vi.advanceTimersByTimeAsync(0)

      expect(ctx.saveStatus()).toBe('error')

      dispose()
    })
  })

  // ── Scene update API verification ─────────────────────────────────

  describe('scene update API calls', () => {
    it('calls updateScene API immediately on updateScene', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      ctx.updateScene('s1', { title: 'New Title', location: 'Forest' })

      expect(sceneApi.updateScene).toHaveBeenCalledWith('p1', 's1', {
        title: 'New Title',
        location: 'Forest',
      })

      dispose()
    })

    it('calls updateProject API on project config change', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      ctx.updateProject({ genre: 'Sci-Fi', theme: 'AI takeover' })

      expect(projectApi.updateProject).toHaveBeenCalledWith('p1', {
        genre: 'Sci-Fi',
        theme: 'AI takeover',
      })

      dispose()
    })
  })

  // ── Load workspace failure ────────────────────────────────────────

  describe('workspace load failure', () => {
    it('sets saveStatus to error when initial load fails', async () => {
      vi.mocked(projectApi.getWorkspace).mockRejectedValue(new Error('Cannot reach server'))

      let ctxRef: WorkspaceContextValue | undefined
      let disposeFn: (() => void) | undefined

      createRoot((dispose) => {
        WorkspaceProvider({
          get projectId() { return 'p1' },
          get children() {
            const Consumer = () => {
              ctxRef = useWorkspace()
              return null
            }
            return Consumer()
          },
        })
        disposeFn = dispose
      })

      await vi.advanceTimersByTimeAsync(0)
      await Promise.resolve()

      expect(ctxRef!.saveStatus()).toBe('error')
      expect(ctxRef!.state.project).toBeNull()
      expect(ctxRef!.state.scenes.length).toBe(0)

      disposeFn!()
    })
  })
})
