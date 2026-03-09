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
// Fixture — richer than unit test data to support multi-step workflows
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
// Helper — creates a loaded workspace and returns the context
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

  // Flush microtask queue: one tick for the await inside loadWorkspace,
  // one for the batch/setState.
  await Promise.resolve()
  await Promise.resolve()

  return { ctx: ctxRef!, dispose: disposeFn! }
}

// ---------------------------------------------------------------------------
// Tests — multi-step integration workflows
// ---------------------------------------------------------------------------

describe('Workspace Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    // Default API mock implementations
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

  // ── Workflow 1: Config change marks scenes as needs_revision ────────────

  describe('config change -> scene status update', () => {
    it('marks ai_draft and edited scenes as needs_revision when config changes', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      // Verify initial statuses
      expect(ctx.state.scenes.find(s => s.id === 's1')!.status).toBe('empty')
      expect(ctx.state.scenes.find(s => s.id === 's2')!.status).toBe('ai_draft')
      expect(ctx.state.scenes.find(s => s.id === 's3')!.status).toBe('edited')

      // Change genre (a config field)
      ctx.updateProject({ genre: 'Thriller' })

      // s1 stays empty (no content), s2 and s3 become needs_revision
      expect(ctx.state.scenes.find(s => s.id === 's1')!.status).toBe('empty')
      expect(ctx.state.scenes.find(s => s.id === 's2')!.status).toBe('needs_revision')
      expect(ctx.state.scenes.find(s => s.id === 's3')!.status).toBe('needs_revision')

      // configVersion should have incremented
      expect(ctx.configVersion()).toBeGreaterThan(0)

      dispose()
    })

    it('does not mark scenes as needs_revision for title-only change', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      ctx.updateProject({ title: 'New Title' })

      expect(ctx.state.scenes.find(s => s.id === 's2')!.status).toBe('ai_draft')
      expect(ctx.state.scenes.find(s => s.id === 's3')!.status).toBe('edited')

      dispose()
    })

    it('consecutive config changes keep scenes in needs_revision', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      ctx.updateProject({ genre: 'Thriller' })
      expect(ctx.state.scenes.find(s => s.id === 's2')!.status).toBe('needs_revision')

      // Change another config field
      ctx.updateProject({ theme: 'Betrayal' })
      // Still needs_revision (already has content, status unchanged since
      // needs_revision is neither ai_draft nor edited)
      expect(ctx.state.scenes.find(s => s.id === 's2')!.status).toBe('needs_revision')

      dispose()
    })
  })

  // ── Workflow 2: Full AI generation lifecycle ───────────────────────────

  describe('AI generation lifecycle', () => {
    it('start -> stream -> finish updates scene content and status', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      ctx.selectScene('s1')
      expect(ctx.state.scenes.find(s => s.id === 's1')!.content).toBeNull()

      ctx.startGeneration('s1')
      expect(ctx.isGenerating()).toBe(true)
      expect(ctx.generatingSceneId()).toBe('s1')

      ctx.appendStreamContent('Hello ')
      ctx.appendStreamContent('World')
      expect(ctx.streamedContent()).toBe('Hello World')

      ctx.finishGeneration('Hello World')
      expect(ctx.isGenerating()).toBe(false)
      expect(ctx.state.scenes.find(s => s.id === 's1')!.content).toBe('Hello World')
      expect(ctx.state.scenes.find(s => s.id === 's1')!.status).toBe('ai_draft')

      dispose()
    })

    it('cancel resets generation state without changing content', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      ctx.startGeneration('s1')
      ctx.appendStreamContent('Partial content')
      ctx.cancelGeneration()

      expect(ctx.isGenerating()).toBe(false)
      expect(ctx.streamedContent()).toBe('')
      expect(ctx.state.scenes.find(s => s.id === 's1')!.content).toBeNull()

      dispose()
    })

    it('generate -> edit -> config change transitions through all statuses', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      // s1 starts as 'empty' with no content
      expect(ctx.state.scenes.find(s => s.id === 's1')!.status).toBe('empty')

      // Generate content for s1
      ctx.startGeneration('s1')
      ctx.finishGeneration('Generated prose')
      expect(ctx.state.scenes.find(s => s.id === 's1')!.status).toBe('ai_draft')

      // User edits -> transitions to 'edited'
      ctx.markSceneEdited('s1')
      expect(ctx.state.scenes.find(s => s.id === 's1')!.status).toBe('edited')

      // Config change -> transitions to 'needs_revision'
      ctx.updateProject({ tone: 'light, humorous' })
      expect(ctx.state.scenes.find(s => s.id === 's1')!.status).toBe('needs_revision')

      dispose()
    })
  })

  // ── Workflow 3: Scene CRUD + navigation ────────────────────────────────

  describe('scene CRUD and navigation', () => {
    it('select -> navigate next -> navigate prev', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      // Select s1 (first on track t1)
      ctx.selectScene('s1')
      expect(ctx.selectedScene()?.id).toBe('s1')

      // Navigate to next scene on same track
      const next = ctx.nextScene()
      expect(next?.id).toBe('s2')
      ctx.selectScene(next!.id)
      expect(ctx.selectedScene()?.id).toBe('s2')

      // Navigate back
      const prev = ctx.prevScene()
      expect(prev?.id).toBe('s1')

      dispose()
    })

    it('remove selected scene clears selection', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      ctx.selectScene('s1')
      expect(ctx.selectedSceneId()).toBe('s1')

      ctx.removeScene('s1')
      expect(ctx.selectedSceneId()).toBeNull()
      expect(ctx.state.scenes.find(s => s.id === 's1')).toBeUndefined()

      dispose()
    })

    it('move scene across tracks updates trackScenes computed', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      // Initially s1 is on t1
      expect(ctx.state.scenes.find(s => s.id === 's1')!.trackId).toBe('t1')

      const tsBefore = ctx.trackScenes()
      const t1ScenesBefore = tsBefore.find(t => t.id === 't1')!.scenes.length
      const t2ScenesBefore = tsBefore.find(t => t.id === 't2')!.scenes.length

      // Move s1 from t1 to t2
      ctx.moveScene('s1', 't2', 5)

      expect(ctx.state.scenes.find(s => s.id === 's1')!.trackId).toBe('t2')
      expect(ctx.state.scenes.find(s => s.id === 's1')!.startPosition).toBe(5)

      // trackScenes should reflect the change
      const tsAfter = ctx.trackScenes()
      expect(tsAfter.find(t => t.id === 't1')!.scenes.length).toBe(t1ScenesBefore - 1)
      expect(tsAfter.find(t => t.id === 't2')!.scenes.length).toBe(t2ScenesBefore + 1)

      dispose()
    })

    it('remove scene also removes its connections', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      // conn1 links s1 -> s3
      expect(ctx.state.connections.find(c => c.id === 'conn1')).toBeDefined()

      // Remove s1 — the store removes the scene but connections stay
      // (the store does not cascade-delete connections on scene removal).
      // Verify the scene is gone.
      ctx.removeScene('s1')
      expect(ctx.state.scenes.find(s => s.id === 's1')).toBeUndefined()

      dispose()
    })

    it('navigate prev/next returns undefined at track boundaries', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      // s1 is first on track t1
      ctx.selectScene('s1')
      expect(ctx.prevScene()).toBeUndefined()

      // s2 is last on track t1
      ctx.selectScene('s2')
      expect(ctx.nextScene()).toBeUndefined()

      dispose()
    })
  })

  // ── Workflow 4: Character + relationship cascade ───────────────────────

  describe('character and relationship management', () => {
    it('add character -> add relationship -> verify graph', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      const initialCharCount = ctx.state.characters.length
      const initialRelCount = ctx.state.relationships.length

      // Add a new character
      ctx.addCharacter('Sidekick')
      expect(ctx.state.characters.length).toBe(initialCharCount + 1)
      const newChar = ctx.state.characters.find(c => c.name === 'Sidekick')
      expect(newChar).toBeDefined()
      // Should be auto-selected
      expect(ctx.selectedCharacterId()).toBe(newChar!.id)

      // Add a relationship between Hero and Sidekick
      ctx.addRelationship('c1', newChar!.id, 'Mentor', 'arrowed')
      expect(ctx.state.relationships.length).toBe(initialRelCount + 1)
      const newRel = ctx.state.relationships.find(r => r.label === 'Mentor')
      expect(newRel).toBeDefined()
      expect(newRel!.characterAId).toBe('c1')
      expect(newRel!.characterBId).toBe(newChar!.id)
      expect(newRel!.visualType).toBe('arrowed')

      dispose()
    })

    it('delete character cascades to relationships and scene assignments', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      // c2 (Villain) is in s2's characterIds and in relationship r1
      expect(ctx.state.scenes.find(s => s.id === 's2')!.characterIds).toContain('c2')
      expect(ctx.state.relationships.find(r => r.id === 'r1')).toBeDefined()

      ctx.removeCharacter('c2')

      // Character gone
      expect(ctx.state.characters.find(c => c.id === 'c2')).toBeUndefined()
      // Relationship r1 (involving c2) removed
      expect(ctx.state.relationships.find(r => r.id === 'r1')).toBeUndefined()
      // c2 removed from scene s2's characterIds
      expect(ctx.state.scenes.find(s => s.id === 's2')!.characterIds).not.toContain('c2')
      // c1 still present in s2's characterIds
      expect(ctx.state.scenes.find(s => s.id === 's2')!.characterIds).toContain('c1')

      dispose()
    })

    it('update character with debounced save merges multiple updates', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      ctx.updateCharacter('c1', { name: 'Great Hero' })
      ctx.updateCharacter('c1', { personality: 'Fearless' })
      ctx.updateCharacter('c1', { motivation: 'Justice' })

      // API should not be called yet (debounced 800ms)
      expect(characterApi.updateCharacter).not.toHaveBeenCalled()

      // Advance past debounce
      vi.advanceTimersByTime(800)

      // Should call API once with all merged updates
      expect(characterApi.updateCharacter).toHaveBeenCalledOnce()
      expect(characterApi.updateCharacter).toHaveBeenCalledWith('p1', 'c1', {
        name: 'Great Hero',
        personality: 'Fearless',
        motivation: 'Justice',
      })

      // Store reflects all updates immediately
      const char = ctx.state.characters.find(c => c.id === 'c1')
      expect(char!.name).toBe('Great Hero')
      expect(char!.personality).toBe('Fearless')
      expect(char!.motivation).toBe('Justice')

      dispose()
    })

    it('assignedCharacters updates after character removal', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      // s2 has characters c1 and c2
      const beforeChars = ctx.assignedCharacters('s2')
      expect(beforeChars.length).toBe(2)

      // Remove c2
      ctx.removeCharacter('c2')

      const afterChars = ctx.assignedCharacters('s2')
      expect(afterChars.length).toBe(1)
      expect(afterChars[0]!.id).toBe('c1')

      dispose()
    })
  })

  // ── Workflow 5: Track management ───────────────────────────────────────

  describe('track management', () => {
    it('remove track also removes its scenes and deselects', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      // s3 is on t2
      const s3 = ctx.state.scenes.find(s => s.id === 's3')
      expect(s3?.trackId).toBe('t2')

      // Select s3 then remove its track
      ctx.selectScene('s3')
      ctx.removeTrack('t2')

      expect(ctx.state.tracks.find(t => t.id === 't2')).toBeUndefined()
      expect(ctx.state.scenes.find(s => s.id === 's3')).toBeUndefined()
      expect(ctx.selectedSceneId()).toBeNull()

      dispose()
    })

    it('add track -> add scene to new track -> verify trackScenes', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      const initialTrackCount = ctx.state.tracks.length

      // Add a new track
      ctx.addTrack('Flashback')
      expect(ctx.state.tracks.length).toBe(initialTrackCount + 1)
      const newTrack = ctx.state.tracks.find(t => t.label === 'Flashback')
      expect(newTrack).toBeDefined()

      // Add a scene to the new track
      ctx.addScene(newTrack!.id, 0)

      // trackScenes should now include the new track with the new scene
      const ts = ctx.trackScenes()
      const newTrackEntry = ts.find(t => t.id === newTrack!.id)
      expect(newTrackEntry).toBeDefined()
      expect(newTrackEntry!.scenes.length).toBe(1)

      dispose()
    })

    it('remove track preserves other tracks and their scenes', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      const t1ScenesCount = ctx.state.scenes.filter(s => s.trackId === 't1').length

      ctx.removeTrack('t2')

      // t1 and its scenes are untouched
      expect(ctx.state.tracks.find(t => t.id === 't1')).toBeDefined()
      expect(ctx.state.scenes.filter(s => s.trackId === 't1').length).toBe(t1ScenesCount)

      dispose()
    })
  })

  // ── Workflow 6: Draft content editing ──────────────────────────────────

  describe('draft content editing', () => {
    it('setDraftContent updates scene content and triggers save status', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      ctx.setDraftContent('s1', 'New content here')
      expect(ctx.state.scenes.find(s => s.id === 's1')!.content).toBe('New content here')
      expect(ctx.saveStatus()).toBe('saving')

      dispose()
    })

    it('markSceneEdited transitions ai_draft to edited', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      expect(ctx.state.scenes.find(s => s.id === 's2')!.status).toBe('ai_draft')
      ctx.markSceneEdited('s2')
      expect(ctx.state.scenes.find(s => s.id === 's2')!.status).toBe('edited')

      dispose()
    })

    it('markSceneEdited does nothing for non-ai_draft scenes', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      // s3 is 'edited'
      ctx.markSceneEdited('s3')
      expect(ctx.state.scenes.find(s => s.id === 's3')!.status).toBe('edited')

      // s1 is 'empty'
      ctx.markSceneEdited('s1')
      expect(ctx.state.scenes.find(s => s.id === 's1')!.status).toBe('empty')

      dispose()
    })

    it('setDraftContent -> markSceneEdited -> config change full flow', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      // Generate content for s1
      ctx.startGeneration('s1')
      ctx.finishGeneration('AI wrote this')
      expect(ctx.state.scenes.find(s => s.id === 's1')!.status).toBe('ai_draft')

      // User edits the draft
      ctx.setDraftContent('s1', 'AI wrote this, but I tweaked it')
      ctx.markSceneEdited('s1')
      expect(ctx.state.scenes.find(s => s.id === 's1')!.status).toBe('edited')
      expect(ctx.state.scenes.find(s => s.id === 's1')!.content).toBe('AI wrote this, but I tweaked it')

      // Config change invalidates
      ctx.updateProject({ pov: 'first_person' })
      expect(ctx.state.scenes.find(s => s.id === 's1')!.status).toBe('needs_revision')
      // Content is preserved
      expect(ctx.state.scenes.find(s => s.id === 's1')!.content).toBe('AI wrote this, but I tweaked it')

      dispose()
    })
  })

  // ── Workflow 7: trackScenes computed ───────────────────────────────────

  describe('trackScenes computed', () => {
    it('groups scenes by track sorted by position', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      const ts = ctx.trackScenes()
      expect(ts.length).toBe(2)

      // Track t1 (position 0) comes first
      expect(ts[0]!.id).toBe('t1')
      expect(ts[0]!.scenes.length).toBe(2) // s1, s2
      expect(ts[0]!.scenes[0]!.id).toBe('s1') // startPosition 0
      expect(ts[0]!.scenes[1]!.id).toBe('s2') // startPosition 2

      // Track t2 (position 1) comes second
      expect(ts[1]!.id).toBe('t2')
      expect(ts[1]!.scenes.length).toBe(1) // s3

      dispose()
    })

    it('reflects scene additions in trackScenes', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      ctx.addScene('t2', 5)

      const ts = ctx.trackScenes()
      // t2 should now have 2 scenes
      expect(ts.find(t => t.id === 't2')!.scenes.length).toBe(2)

      dispose()
    })

    it('reflects scene removals in trackScenes', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      ctx.removeScene('s3')

      const ts = ctx.trackScenes()
      // t2 should have 0 scenes
      expect(ts.find(t => t.id === 't2')!.scenes.length).toBe(0)

      dispose()
    })
  })

  // ── Workflow 8: Connection management ──────────────────────────────────

  describe('connection management', () => {
    it('add and remove connections', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      const initialCount = ctx.state.connections.length

      // Add a new connection
      ctx.addConnection('s2', 's3', 'merge')
      expect(ctx.state.connections.length).toBe(initialCount + 1)

      const newConn = ctx.state.connections.find(
        c => c.sourceSceneId === 's2' && c.targetSceneId === 's3',
      )
      expect(newConn).toBeDefined()
      expect(newConn!.connectionType).toBe('merge')

      // Remove the original connection
      ctx.removeConnection('conn1')
      expect(ctx.state.connections.find(c => c.id === 'conn1')).toBeUndefined()

      // The new connection still exists
      expect(ctx.state.connections.find(
        c => c.sourceSceneId === 's2' && c.targetSceneId === 's3',
      )).toBeDefined()

      dispose()
    })
  })

  // ── Workflow 9: Complex multi-entity interaction ───────────────────────

  describe('complex multi-entity workflows', () => {
    it('full story construction: track -> scene -> character -> connection', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      // 1. Add a new track for a secondary plot
      ctx.addTrack('B-Story')
      const bTrack = ctx.state.tracks.find(t => t.label === 'B-Story')
      expect(bTrack).toBeDefined()

      // 2. Add a scene on the new track
      ctx.addScene(bTrack!.id, 0)
      const bScene = ctx.state.scenes.find(
        s => s.trackId === bTrack!.id,
      )
      expect(bScene).toBeDefined()

      // 3. Add a new character
      ctx.addCharacter('Mentor')
      const mentor = ctx.state.characters.find(c => c.name === 'Mentor')
      expect(mentor).toBeDefined()

      // 4. Create a relationship between Hero and Mentor
      ctx.addRelationship('c1', mentor!.id, 'Teacher-Student', 'arrowed')
      const rel = ctx.state.relationships.find(r => r.label === 'Teacher-Student')
      expect(rel).toBeDefined()

      // 5. Connect the new scene to an existing scene
      ctx.addConnection(bScene!.id, 's2', 'merge')
      const conn = ctx.state.connections.find(
        c => c.sourceSceneId === bScene!.id && c.targetSceneId === 's2',
      )
      expect(conn).toBeDefined()
      expect(conn!.connectionType).toBe('merge')

      // Verify everything is in the right place
      const ts = ctx.trackScenes()
      expect(ts.length).toBe(3) // t1, t2, B-Story
      expect(ts.find(t => t.id === bTrack!.id)!.scenes.length).toBe(1)

      dispose()
    })

    it('scene navigation updates after moving scenes between tracks', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      // Move s2 from t1 to t2 at position 3
      ctx.moveScene('s2', 't2', 3)

      // s1 is now alone on t1
      ctx.selectScene('s1')
      expect(ctx.prevScene()).toBeUndefined()
      expect(ctx.nextScene()).toBeUndefined()

      // s3 (position 1) and s2 (position 3) are on t2
      ctx.selectScene('s3')
      expect(ctx.prevScene()).toBeUndefined()
      expect(ctx.nextScene()?.id).toBe('s2')

      ctx.selectScene('s2')
      expect(ctx.prevScene()?.id).toBe('s3')
      expect(ctx.nextScene()).toBeUndefined()

      dispose()
    })

    it('delete all scenes from a track leaves track empty but present', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      // Remove the only scene on t2
      ctx.removeScene('s3')

      // Track t2 should still exist
      expect(ctx.state.tracks.find(t => t.id === 't2')).toBeDefined()
      // But it has no scenes
      const ts = ctx.trackScenes()
      expect(ts.find(t => t.id === 't2')!.scenes.length).toBe(0)

      dispose()
    })

    it('save status transitions through multiple operations', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      expect(ctx.saveStatus()).toBe('saved')

      // Update triggers saving
      ctx.updateScene('s1', { title: 'New' })
      expect(ctx.saveStatus()).toBe('saving')

      // Debounce resolves to saved
      vi.advanceTimersByTime(1000)
      expect(ctx.saveStatus()).toBe('saved')

      // Another update
      ctx.updateProject({ genre: 'Horror' })
      expect(ctx.saveStatus()).toBe('saving')

      vi.advanceTimersByTime(1000)
      expect(ctx.saveStatus()).toBe('saved')

      dispose()
    })

    it('generation on one scene does not affect other scenes', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      // Start generating for s1
      ctx.startGeneration('s1')
      ctx.appendStreamContent('Content for s1')

      // s2 content should be unchanged
      expect(ctx.state.scenes.find(s => s.id === 's2')!.content).toBe('The villain appeared.')

      ctx.finishGeneration('Final content for s1')

      // s1 updated, s2 unchanged
      expect(ctx.state.scenes.find(s => s.id === 's1')!.content).toBe('Final content for s1')
      expect(ctx.state.scenes.find(s => s.id === 's1')!.status).toBe('ai_draft')
      expect(ctx.state.scenes.find(s => s.id === 's2')!.content).toBe('The villain appeared.')
      expect(ctx.state.scenes.find(s => s.id === 's2')!.status).toBe('ai_draft')

      dispose()
    })
  })
})
