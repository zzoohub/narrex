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

function makeWorkspaceData() {
  return {
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
      { id: 's2', trackId: 't1', projectId: 'p1', startPosition: 2, duration: 1, status: 'ai_draft' as const, title: 'Conflict', plotSummary: 'A showdown', location: null, moodTags: [], content: 'The villain appeared.', characterIds: ['c1', 'c2'], createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
      { id: 's3', trackId: 't2', projectId: 'p1', startPosition: 0, duration: 1, status: 'edited' as const, title: 'Side Quest', plotSummary: 'An adventure', location: 'Forest', moodTags: ['adventure'], content: 'A side adventure begins.', characterIds: [], createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    ],
    characters: [
      { id: 'c1', projectId: 'p1', name: 'Hero', personality: 'Brave', appearance: 'Tall', secrets: null, motivation: 'Save the world', profileImageUrl: null, graphX: 100, graphY: 100, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
      { id: 'c2', projectId: 'p1', name: 'Villain', personality: 'Cunning', appearance: 'Dark', secrets: 'Was once a hero', motivation: 'Power', profileImageUrl: null, graphX: 300, graphY: 100, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    ],
    relationships: [
      { id: 'r1', projectId: 'p1', characterAId: 'c1', characterBId: 'c2', label: 'Rivals', visualType: 'dashed' as const, direction: 'bidirectional' as const, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    ],
    connections: [],
  }
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function loadedWorkspace(): Promise<{ ctx: WorkspaceContextValue; dispose: () => void }> {
  vi.mocked(projectApi.getWorkspace).mockResolvedValue({ data: makeWorkspaceData() })

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
// Tests — full scene lifecycle, concurrent ops, and edge cases
// ---------------------------------------------------------------------------

describe('Workspace Full Lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

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
        personality: null, appearance: null, secrets: null, motivation: null,
        profileImageUrl: null, graphX: body.graphX ?? null, graphY: body.graphY ?? null,
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

  // ── Complete scene status lifecycle ───────────────────────────────

  describe('full scene status lifecycle', () => {
    it('empty → ai_draft → edited → needs_revision → ai_draft (full cycle)', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      // Step 1: Start with empty scene
      const scene = () => ctx.state.scenes.find(s => s.id === 's1')!
      expect(scene().status).toBe('empty')
      expect(scene().content).toBeNull()

      // Step 2: Generate → ai_draft
      ctx.startGeneration('s1')
      expect(ctx.isGenerating()).toBe(true)
      ctx.appendStreamContent('Once upon a time...')
      ctx.finishGeneration('Once upon a time, in a land far away.')
      expect(scene().status).toBe('ai_draft')
      expect(scene().content).toBe('Once upon a time, in a land far away.')
      expect(ctx.isGenerating()).toBe(false)

      // Step 3: Edit → edited
      ctx.markSceneEdited('s1')
      expect(scene().status).toBe('edited')

      // Step 4: Config change → needs_revision
      ctx.updateProject({ tone: 'light, humorous' })
      expect(scene().status).toBe('needs_revision')
      // Content preserved
      expect(scene().content).toBe('Once upon a time, in a land far away.')

      // Step 5: Re-generate → back to ai_draft
      ctx.startGeneration('s1')
      ctx.finishGeneration('In a bright and cheerful kingdom...')
      expect(scene().status).toBe('ai_draft')
      expect(scene().content).toBe('In a bright and cheerful kingdom...')

      dispose()
    })

    it('empty scene stays empty through title-only project update', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      expect(ctx.state.scenes.find(s => s.id === 's1')!.status).toBe('empty')

      ctx.updateProject({ title: 'New Title' })

      expect(ctx.state.scenes.find(s => s.id === 's1')!.status).toBe('empty')

      dispose()
    })

    it('needs_revision stays needs_revision on subsequent config changes', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      // s2 is ai_draft with content
      expect(ctx.state.scenes.find(s => s.id === 's2')!.status).toBe('ai_draft')

      ctx.updateProject({ genre: 'Horror' })
      expect(ctx.state.scenes.find(s => s.id === 's2')!.status).toBe('needs_revision')

      ctx.updateProject({ theme: 'Fear' })
      // Still needs_revision (not ai_draft or edited, so the guard skips it)
      expect(ctx.state.scenes.find(s => s.id === 's2')!.status).toBe('needs_revision')

      dispose()
    })
  })

  // ── Generation while editing ─────────────────────────────────────

  describe('generation isolation', () => {
    it('generating scene s1 does not affect content of s2', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      const s2Content = ctx.state.scenes.find(s => s.id === 's2')!.content

      ctx.startGeneration('s1')
      ctx.appendStreamContent('New content for s1')
      ctx.finishGeneration('New content for s1')

      expect(ctx.state.scenes.find(s => s.id === 's2')!.content).toBe(s2Content)

      dispose()
    })

    it('cancelling generation preserves original content', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      expect(ctx.state.scenes.find(s => s.id === 's1')!.content).toBeNull()

      ctx.startGeneration('s1')
      ctx.appendStreamContent('Partial...')
      expect(ctx.streamedContent()).toBe('Partial...')

      ctx.cancelGeneration()

      expect(ctx.isGenerating()).toBe(false)
      expect(ctx.streamedContent()).toBe('')
      expect(ctx.state.scenes.find(s => s.id === 's1')!.content).toBeNull()
      expect(ctx.state.scenes.find(s => s.id === 's1')!.status).toBe('empty')

      dispose()
    })

    it('sequential generations on same scene overwrite content', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      // First generation
      ctx.startGeneration('s1')
      ctx.finishGeneration('First draft')
      expect(ctx.state.scenes.find(s => s.id === 's1')!.content).toBe('First draft')
      expect(ctx.state.scenes.find(s => s.id === 's1')!.status).toBe('ai_draft')

      // Second generation (regenerate)
      ctx.startGeneration('s1')
      ctx.finishGeneration('Second draft')
      expect(ctx.state.scenes.find(s => s.id === 's1')!.content).toBe('Second draft')
      expect(ctx.state.scenes.find(s => s.id === 's1')!.status).toBe('ai_draft')

      dispose()
    })
  })

  // ── Multi-entity cascade: build then tear down ────────────────────

  describe('build-up and tear-down cascade', () => {
    it('build: track → scene → character → assign → connect, then teardown in reverse', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      // ── Build up ──
      // 1. Add track
      ctx.addTrack('Flashback')
      const fbTrack = ctx.state.tracks.find(t => t.label === 'Flashback')
      expect(fbTrack).toBeDefined()

      // 2. Add scene on new track
      ctx.addScene(fbTrack!.id, 0)
      const fbScene = ctx.state.scenes.find(s => s.trackId === fbTrack!.id)
      expect(fbScene).toBeDefined()

      // 3. Add character
      ctx.addCharacter('Mentor')
      const mentor = ctx.state.characters.find(c => c.name === 'Mentor')
      expect(mentor).toBeDefined()

      // 4. Create relationship
      ctx.addRelationship('c1', mentor!.id, 'Teacher', 'arrowed')
      const rel = ctx.state.relationships.find(r => r.label === 'Teacher')
      expect(rel).toBeDefined()

      // 5. Connect scenes
      ctx.addConnection(fbScene!.id, 's1', 'merge')
      const conn = ctx.state.connections.find(
        c => c.sourceSceneId === fbScene!.id && c.targetSceneId === 's1',
      )
      expect(conn).toBeDefined()

      // Verify full state
      expect(ctx.state.tracks.length).toBe(3)
      expect(ctx.state.characters.length).toBe(3)
      expect(ctx.state.relationships.length).toBe(2)
      expect(ctx.state.connections.length).toBe(1)

      // ── Tear down ──
      // 1. Remove connection
      ctx.removeConnection(conn!.id)
      expect(ctx.state.connections.length).toBe(0)

      // 2. Remove relationship
      ctx.removeRelationship(rel!.id)
      expect(ctx.state.relationships.find(r => r.label === 'Teacher')).toBeUndefined()

      // 3. Remove character (cascade: also removes any relationships + scene assignments)
      ctx.removeCharacter(mentor!.id)
      expect(ctx.state.characters.find(c => c.name === 'Mentor')).toBeUndefined()

      // 4. Remove track (cascade: also removes scenes on that track)
      ctx.removeTrack(fbTrack!.id)
      expect(ctx.state.tracks.find(t => t.label === 'Flashback')).toBeUndefined()
      expect(ctx.state.scenes.filter(s => s.trackId === fbTrack!.id).length).toBe(0)

      // Original data intact
      expect(ctx.state.tracks.length).toBe(2)
      expect(ctx.state.characters.length).toBe(2)
      expect(ctx.state.relationships.length).toBe(1) // original r1

      dispose()
    })
  })

  // ── Config version tracking ───────────────────────────────────────

  describe('config version tracking', () => {
    it('increments configVersion on generation-relevant config changes', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      const v0 = ctx.configVersion()

      ctx.updateProject({ genre: 'Thriller' })
      expect(ctx.configVersion()).toBe(v0 + 1)

      ctx.updateProject({ theme: 'Betrayal' })
      expect(ctx.configVersion()).toBe(v0 + 2)

      ctx.updateProject({ pov: 'first_person' })
      expect(ctx.configVersion()).toBe(v0 + 3)

      ctx.updateProject({ eraLocation: 'Modern' })
      expect(ctx.configVersion()).toBe(v0 + 4)

      ctx.updateProject({ tone: 'light' })
      expect(ctx.configVersion()).toBe(v0 + 5)

      dispose()
    })

    it('does not increment configVersion on title change', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      const v0 = ctx.configVersion()

      ctx.updateProject({ title: 'New Title' })
      expect(ctx.configVersion()).toBe(v0)

      dispose()
    })
  })

  // ── Simultaneous add + select patterns ────────────────────────────

  describe('add-and-select patterns', () => {
    it('addScene auto-selects the new scene', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      ctx.addScene('t1', 5)

      // New scene should be selected
      expect(ctx.selectedSceneId()).not.toBeNull()
      const newScene = ctx.state.scenes.find(s => s.startPosition === 5 && s.trackId === 't1')
      expect(newScene).toBeDefined()
      expect(ctx.selectedSceneId()).toBe(newScene!.id)

      dispose()
    })

    it('addCharacter auto-selects the new character', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      ctx.addCharacter('New Char')

      expect(ctx.selectedCharacterId()).not.toBeNull()
      const newChar = ctx.state.characters.find(c => c.name === 'New Char')
      expect(newChar).toBeDefined()
      expect(ctx.selectedCharacterId()).toBe(newChar!.id)

      dispose()
    })

    it('ID replacement: temp ID → server ID after API response', async () => {
      let resolvePromise: (value: any) => void
      vi.mocked(sceneApi.createScene).mockImplementation(() => new Promise(r => { resolvePromise = r }))

      const { ctx, dispose } = await loadedWorkspace()

      ctx.addScene('t1', 10)

      // Has temp ID
      const tempScene = ctx.state.scenes.find(s => s.startPosition === 10)
      expect(tempScene).toBeDefined()
      expect(tempScene!.id).toMatch(/^temp_/)
      const tempId = tempScene!.id

      // Resolve with server ID
      resolvePromise!({
        data: {
          id: 'server-s99',
          projectId: 'p1',
          trackId: 't1',
          startPosition: 10,
          duration: 1,
          status: 'empty',
          title: '',
          plotSummary: null,
          location: null,
          moodTags: [],
          content: null,
          characterIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      })

      await vi.advanceTimersByTimeAsync(0)

      // Temp ID replaced with server ID
      expect(ctx.state.scenes.find(s => s.id === tempId)).toBeUndefined()
      expect(ctx.state.scenes.find(s => s.id === 'server-s99')).toBeDefined()
      // Selection updated to server ID
      expect(ctx.selectedSceneId()).toBe('server-s99')

      dispose()
    })
  })

  // ── Draft content + generation interplay ──────────────────────────

  describe('draft content and generation interplay', () => {
    it('setDraftContent then generate overwrites manual content', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      // s2 has content 'The villain appeared.'
      ctx.setDraftContent('s2', 'User manually typed this')
      expect(ctx.state.scenes.find(s => s.id === 's2')!.content).toBe('User manually typed this')

      // Generate replaces it
      ctx.startGeneration('s2')
      ctx.finishGeneration('AI generated new content')
      expect(ctx.state.scenes.find(s => s.id === 's2')!.content).toBe('AI generated new content')
      expect(ctx.state.scenes.find(s => s.id === 's2')!.status).toBe('ai_draft')

      dispose()
    })

    it('draftContent accessor returns empty string for null content', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      // s1 has null content
      expect(ctx.draftContent('s1')).toBe('')

      dispose()
    })

    it('draftContent accessor returns content string', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      // s2 has content
      expect(ctx.draftContent('s2')).toBe('The villain appeared.')

      dispose()
    })

    it('draftContent returns empty string for non-existent scene', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      expect(ctx.draftContent('nonexistent')).toBe('')

      dispose()
    })
  })

  // ── assignedCharacters computed ───────────────────────────────────

  describe('assignedCharacters reflects live state', () => {
    it('returns characters assigned to scene', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      // s2 has characterIds ['c1', 'c2']
      const chars = ctx.assignedCharacters('s2')
      expect(chars.length).toBe(2)
      expect(chars.map(c => c.name).sort()).toEqual(['Hero', 'Villain'])

      dispose()
    })

    it('reflects removal of character from scene', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      ctx.removeCharacter('c2')

      const chars = ctx.assignedCharacters('s2')
      expect(chars.length).toBe(1)
      expect(chars[0]!.name).toBe('Hero')

      dispose()
    })

    it('returns empty array for scene with no characters', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      expect(ctx.assignedCharacters('s3').length).toBe(0)

      dispose()
    })

    it('returns empty array for non-existent scene', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      expect(ctx.assignedCharacters('nonexistent').length).toBe(0)

      dispose()
    })
  })
})
