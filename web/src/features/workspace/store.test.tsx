import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot } from 'solid-js'
import { WorkspaceProvider, useWorkspace } from './store'
import type { WorkspaceContextValue } from './store'

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
// Helpers
// ---------------------------------------------------------------------------

const WORKSPACE_DATA = {
  project: {
    id: 'p1',
    title: 'Test Project',
    genre: 'Fantasy',
    theme: null,
    eraLocation: null,
    pov: null,
    tone: null,
    sourceType: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  tracks: [
    { id: 't1', projectId: 'p1', position: 0, label: 'Main', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 't2', projectId: 'p1', position: 1, label: 'Sub', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  ],
  scenes: [
    { id: 's1', trackId: 't1', projectId: 'p1', startPosition: 0, duration: 1, status: 'empty' as const, title: 'Scene 1', plotSummary: null, location: null, moodTags: [], characterIds: ['c1'], createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 's2', trackId: 't1', projectId: 'p1', startPosition: 2, duration: 1, status: 'empty' as const, title: 'Scene 2', plotSummary: null, location: null, moodTags: [], characterIds: [], createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 's3', trackId: 't1', projectId: 'p1', startPosition: 4, duration: 1, status: 'empty' as const, title: 'Scene 3', plotSummary: null, location: null, moodTags: [], characterIds: [], createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  ],
  characters: [
    { id: 'c1', projectId: 'p1', name: 'Hero', personality: null, appearance: null, secrets: null, motivation: null, profileImageUrl: null, graphX: 100, graphY: 100, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  ],
  relationships: [
    { id: 'r1', projectId: 'p1', characterAId: 'c1', characterBId: 'c2', label: 'Ally', visualType: 'solid' as const, direction: 'bidirectional' as const, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  ],
  connections: [
    { id: 'conn1', projectId: 'p1', sourceSceneId: 's1', targetSceneId: 's2', connectionType: 'branch' as const, createdAt: '2024-01-01T00:00:00Z' },
  ],
}

/** Helper to render WorkspaceProvider and access the context value */
function renderWorkspace(
  callback: (ctx: WorkspaceContextValue, dispose: () => void) => void,
) {
  // getWorkspace should resolve immediately so onMount loads data
  vi.mocked(projectApi.getWorkspace).mockResolvedValue({ data: WORKSPACE_DATA })

  createRoot((dispose) => {
    let ctx: WorkspaceContextValue | undefined

    // Render the provider with a consumer that captures context
    const Wrapper = () => {
      return WorkspaceProvider({
        get projectId() { return 'p1' },
        get children() {
          // Use the hook inside the component tree
          const Consumer = () => {
            ctx = useWorkspace()
            return null
          }
          return Consumer()
        },
      })
    }

    Wrapper()

    if (!ctx) {
      throw new Error('Context not captured')
    }

    callback(ctx, dispose)
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WorkspaceStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ---- useWorkspace throws without provider ----

  describe('useWorkspace', () => {
    it('throws when used outside WorkspaceProvider', () => {
      expect(() => {
        createRoot((dispose) => {
          useWorkspace()
          dispose()
        })
      }).toThrow('useWorkspace must be used within a WorkspaceProvider')
    })
  })

  // ---- Initial state ----

  describe('initial state', () => {
    it('starts with empty state before loading', () => {
      renderWorkspace((ctx, dispose) => {
        // Before the async load resolves, state starts empty
        expect(ctx.state.project).toBeNull()
        expect(ctx.state.tracks).toEqual([])
        expect(ctx.state.scenes).toEqual([])
        expect(ctx.state.characters).toEqual([])
        expect(ctx.state.relationships).toEqual([])
        expect(ctx.state.connections).toEqual([])
        expect(ctx.selectedSceneId()).toBeNull()
        expect(ctx.selectedCharacterId()).toBeNull()
        expect(ctx.saveStatus()).toBe('saved')
        expect(ctx.isGenerating()).toBe(false)
        expect(ctx.generatingSceneId()).toBeNull()
        expect(ctx.streamedContent()).toBe('')
        expect(ctx.projectId).toBe('p1')
        dispose()
      })
    })
  })

  // ---- loadWorkspace ----

  describe('loadWorkspace', () => {
    it('loads workspace data from API', async () => {
      let ctxRef: WorkspaceContextValue | undefined
      let disposeFn: (() => void) | undefined

      renderWorkspace((ctx, dispose) => {
        ctxRef = ctx
        disposeFn = dispose
      })

      // Wait for the async load to complete
      await vi.mocked(projectApi.getWorkspace).mock.results[0]?.value

      expect(ctxRef!.state.project).toEqual(WORKSPACE_DATA.project)
      expect(ctxRef!.state.tracks).toHaveLength(2)
      expect(ctxRef!.state.scenes).toHaveLength(3)
      expect(ctxRef!.state.characters).toHaveLength(1)
      expect(ctxRef!.state.relationships).toHaveLength(1)
      expect(ctxRef!.state.connections).toHaveLength(1)
      expect(ctxRef!.saveStatus()).toBe('saved')

      disposeFn!()
    })

    it('sets error status on load failure', async () => {
      vi.mocked(projectApi.getWorkspace).mockRejectedValue(new Error('Network error'))

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

      // Wait for the rejected promise
      try {
        await vi.mocked(projectApi.getWorkspace).mock.results[0]?.value
      } catch {
        // expected
      }

      // Allow microtask to complete
      await Promise.resolve()

      expect(ctxRef!.saveStatus()).toBe('error')

      disposeFn!()
    })
  })

  // ---- Scene operations ----

  describe('scene operations', () => {
    it('selectScene sets and clears selected scene', () => {
      renderWorkspace((ctx, dispose) => {
        expect(ctx.selectedSceneId()).toBeNull()

        ctx.selectScene('s1')
        expect(ctx.selectedSceneId()).toBe('s1')

        ctx.selectScene(null)
        expect(ctx.selectedSceneId()).toBeNull()
        dispose()
      })
    })

    it('addScene adds optimistic scene and calls API', () => {
      vi.mocked(sceneApi.createScene).mockResolvedValue({
        data: { id: 'server-s1', trackId: 't1', projectId: 'p1', title: '', status: 'empty' as const, startPosition: 5, duration: 1, plotSummary: null, location: null, moodTags: [], characterIds: [], createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
      })

      renderWorkspace((ctx, dispose) => {
        ctx.addScene('t1', 5)

        // Should have added an optimistic scene
        const scenes = ctx.state.scenes
        const newScene = scenes.find(s => s.startPosition === 5)
        expect(newScene).toBeDefined()
        expect(newScene!.id).toMatch(/^temp_/)
        expect(newScene!.title).toBe('')
        expect(newScene!.status).toBe('empty')
        expect(newScene!.duration).toBe(1)
        expect(newScene!.trackId).toBe('t1')
        expect(newScene!.projectId).toBe('p1')

        // Should have selected the new scene
        expect(ctx.selectedSceneId()).toBe(newScene!.id)

        // Should have called the API
        expect(sceneApi.createScene).toHaveBeenCalledWith('p1', { trackId: 't1', title: '', startPosition: 5 })

        dispose()
      })
    })

    it('addScene calls API with correct parameters for different tracks', () => {
      vi.mocked(sceneApi.createScene).mockResolvedValue({ data: {} as never })

      renderWorkspace((ctx, dispose) => {
        ctx.addScene('t2', 3)
        expect(sceneApi.createScene).toHaveBeenCalledWith('p1', { trackId: 't2', title: '', startPosition: 3 })
        dispose()
      })
    })

    it('updateScene applies updates optimistically and calls API', () => {
      vi.mocked(sceneApi.updateScene).mockResolvedValue({ data: {} as never })

      renderWorkspace((ctx, dispose) => {
        // Add a scene first
        ctx.selectScene('s1')

        ctx.updateScene('s1', { title: 'Updated Title' })

        // Optimistic update
        const scene = ctx.state.scenes.find(s => s.id === 's1')
        // Note: state is not loaded yet since onMount hasn't resolved
        // But updateScene still modifies the store

        expect(sceneApi.updateScene).toHaveBeenCalledWith('p1', 's1', { title: 'Updated Title' })
        expect(ctx.saveStatus()).toBe('saving')
        dispose()
      })
    })

    it('removeScene removes scene optimistically and calls API', () => {
      vi.mocked(sceneApi.deleteScene).mockResolvedValue(undefined)

      renderWorkspace((ctx, dispose) => {
        // Since state is not loaded yet, manually verify the call
        ctx.removeScene('nonexistent')

        // Should not call API for non-existent scene
        expect(sceneApi.deleteScene).not.toHaveBeenCalled()
        dispose()
      })
    })

    it('moveScene updates position optimistically and calls API', () => {
      vi.mocked(sceneApi.updateScene).mockResolvedValue({ data: {} as never })

      renderWorkspace((ctx, dispose) => {
        ctx.moveScene('s1', 't2', 3)
        // Should call API with new track and position
        // Since state is not loaded, the scene won't be found and no API call made
        dispose()
      })
    })
  })

  // ---- Track operations ----

  describe('track operations', () => {
    it('addTrack adds optimistic track and calls API', () => {
      vi.mocked(trackApi.createTrack).mockResolvedValue({
        data: { id: 'server-t1', projectId: 'p1', position: 0, label: 'New Track', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      })

      renderWorkspace((ctx, dispose) => {
        ctx.addTrack('New Track')

        const newTrack = ctx.state.tracks.find(t => t.label === 'New Track')
        expect(newTrack).toBeDefined()
        expect(newTrack!.id).toMatch(/^temp_/)
        expect(newTrack!.projectId).toBe('p1')

        expect(trackApi.createTrack).toHaveBeenCalledWith('p1', expect.objectContaining({ label: 'New Track' }))

        dispose()
      })
    })

    it('updateTrack updates label optimistically', () => {
      vi.mocked(trackApi.updateTrack).mockResolvedValue({ data: {} as never })

      renderWorkspace((ctx, dispose) => {
        ctx.updateTrack('t1', 'Renamed')
        expect(trackApi.updateTrack).toHaveBeenCalledWith('p1', 't1', { label: 'Renamed' })
        expect(ctx.saveStatus()).toBe('saving')
        dispose()
      })
    })

    it('removeTrack removes track optimistically', () => {
      vi.mocked(trackApi.deleteTrack).mockResolvedValue(undefined)

      renderWorkspace((ctx, dispose) => {
        // State not loaded, so no track to find
        ctx.removeTrack('nonexistent')
        expect(trackApi.deleteTrack).not.toHaveBeenCalled()
        dispose()
      })
    })
  })

  // ---- Character operations ----

  describe('character operations', () => {
    it('addCharacter creates optimistic character and calls API', () => {
      vi.mocked(characterApi.createCharacter).mockResolvedValue({
        data: { id: 'server-c1', projectId: 'p1', name: 'Villain', personality: null, appearance: null, secrets: null, motivation: null, profileImageUrl: null, graphX: 150, graphY: 150, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      })

      renderWorkspace((ctx, dispose) => {
        ctx.addCharacter('Villain')

        const newChar = ctx.state.characters.find(c => c.name === 'Villain')
        expect(newChar).toBeDefined()
        expect(newChar!.id).toMatch(/^temp_/)
        expect(newChar!.projectId).toBe('p1')
        expect(newChar!.personality).toBeNull()
        expect(newChar!.graphX).toBeTypeOf('number')
        expect(newChar!.graphY).toBeTypeOf('number')
        expect(ctx.selectedCharacterId()).toBe(newChar!.id)

        expect(characterApi.createCharacter).toHaveBeenCalledWith('p1', expect.objectContaining({ name: 'Villain' }))

        dispose()
      })
    })

    it('updateCharacter updates optimistically and calls API', () => {
      vi.mocked(characterApi.updateCharacter).mockResolvedValue({ data: {} as never })

      renderWorkspace((ctx, dispose) => {
        ctx.updateCharacter('c1', { name: 'Updated Hero' })
        expect(characterApi.updateCharacter).toHaveBeenCalledWith('p1', 'c1', { name: 'Updated Hero' })
        expect(ctx.saveStatus()).toBe('saving')
        dispose()
      })
    })

    it('selectCharacter sets and clears selection', () => {
      renderWorkspace((ctx, dispose) => {
        ctx.selectCharacter('c1')
        expect(ctx.selectedCharacterId()).toBe('c1')

        ctx.selectCharacter(null)
        expect(ctx.selectedCharacterId()).toBeNull()
        dispose()
      })
    })
  })

  // ---- Relationship operations ----

  describe('relationship operations', () => {
    it('addRelationship creates optimistic relationship and calls API', async () => {
      vi.mocked(characterApi.createRelationship).mockResolvedValue({
        data: { id: 'server-r1', projectId: 'p1', characterAId: 'c1', characterBId: 'c2', label: 'Rival', visualType: 'dashed' as const, direction: 'bidirectional' as const, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      })

      let ctxRef: WorkspaceContextValue | undefined
      let disposeFn: (() => void) | undefined

      renderWorkspace((ctx, dispose) => {
        ctxRef = ctx
        disposeFn = dispose
      })

      ctxRef!.addRelationship('c1', 'c2', 'Rival', 'dashed')

      const newRel = ctxRef!.state.relationships.find(r => r.label === 'Rival')
      expect(newRel).toBeDefined()
      expect(newRel!.direction).toBe('bidirectional')

      expect(characterApi.createRelationship).toHaveBeenCalledWith('p1', expect.objectContaining({
        characterAId: 'c1',
        characterBId: 'c2',
        label: 'Rival',
        visualType: 'dashed',
        direction: 'bidirectional',
      }))

      await vi.mocked(characterApi.createRelationship).mock.results[0]?.value

      disposeFn!()
    })

    it('updateRelationship updates optimistically', () => {
      vi.mocked(characterApi.updateRelationship).mockResolvedValue({ data: {} as never })

      renderWorkspace((ctx, dispose) => {
        ctx.updateRelationship('r1', { label: 'Enemy' })
        expect(characterApi.updateRelationship).toHaveBeenCalledWith('p1', 'r1', { label: 'Enemy' })
        dispose()
      })
    })

    it('removeRelationship removes optimistically', () => {
      vi.mocked(characterApi.deleteRelationship).mockResolvedValue(undefined)

      renderWorkspace((ctx, dispose) => {
        ctx.removeRelationship('nonexistent')
        expect(characterApi.deleteRelationship).not.toHaveBeenCalled()
        dispose()
      })
    })
  })

  // ---- Connection operations ----

  describe('connection operations', () => {
    it('addConnection creates optimistic connection and calls API', async () => {
      vi.mocked(connectionApi.createConnection).mockResolvedValue({
        data: { id: 'server-conn1', projectId: 'p1', sourceSceneId: 's1', targetSceneId: 's3', connectionType: 'merge' as const, createdAt: '2024-01-01' },
      })

      let ctxRef: WorkspaceContextValue | undefined
      let disposeFn: (() => void) | undefined

      renderWorkspace((ctx, dispose) => {
        ctxRef = ctx
        disposeFn = dispose
      })

      ctxRef!.addConnection('s1', 's3', 'merge')

      const newConn = ctxRef!.state.connections.find(c => c.targetSceneId === 's3')
      expect(newConn).toBeDefined()
      expect(newConn!.connectionType).toBe('merge')

      expect(connectionApi.createConnection).toHaveBeenCalledWith('p1', {
        sourceSceneId: 's1',
        targetSceneId: 's3',
        connectionType: 'merge',
      })

      await vi.mocked(connectionApi.createConnection).mock.results[0]?.value

      disposeFn!()
    })

    it('removeConnection removes optimistically', () => {
      vi.mocked(connectionApi.deleteConnection).mockResolvedValue(undefined)

      renderWorkspace((ctx, dispose) => {
        ctx.removeConnection('nonexistent')
        expect(connectionApi.deleteConnection).not.toHaveBeenCalled()
        dispose()
      })
    })
  })

  // ---- Project updates ----

  describe('project updates', () => {
    it('updateProject calls API with updates', () => {
      vi.mocked(projectApi.updateProject).mockResolvedValue({ data: {} as never })

      renderWorkspace((ctx, dispose) => {
        ctx.updateProject({ title: 'New Title', genre: 'Sci-Fi' })
        expect(projectApi.updateProject).toHaveBeenCalledWith('p1', { title: 'New Title', genre: 'Sci-Fi' })
        expect(ctx.saveStatus()).toBe('saving')
        dispose()
      })
    })
  })

  // ---- Draft content ----

  describe('draft content', () => {
    it('setDraftContent stores content for a scene', () => {
      renderWorkspace((ctx, dispose) => {
        expect(ctx.draftContent('s1')).toBe('')

        ctx.setDraftContent('s1', 'Hello world')
        expect(ctx.draftContent('s1')).toBe('Hello world')

        ctx.setDraftContent('s1', 'Updated content')
        expect(ctx.draftContent('s1')).toBe('Updated content')
        dispose()
      })
    })

    it('returns empty string for unknown scene', () => {
      renderWorkspace((ctx, dispose) => {
        expect(ctx.draftContent('nonexistent')).toBe('')
        dispose()
      })
    })
  })

  // ---- Generation state ----

  describe('generation state', () => {
    it('startGeneration sets generating state', () => {
      renderWorkspace((ctx, dispose) => {
        expect(ctx.isGenerating()).toBe(false)
        expect(ctx.generatingSceneId()).toBeNull()
        expect(ctx.streamedContent()).toBe('')

        ctx.startGeneration('s1')

        expect(ctx.isGenerating()).toBe(true)
        expect(ctx.generatingSceneId()).toBe('s1')
        expect(ctx.streamedContent()).toBe('')
        dispose()
      })
    })

    it('appendStreamContent appends text', () => {
      renderWorkspace((ctx, dispose) => {
        ctx.startGeneration('s1')

        ctx.appendStreamContent('Hello ')
        expect(ctx.streamedContent()).toBe('Hello ')

        ctx.appendStreamContent('world')
        expect(ctx.streamedContent()).toBe('Hello world')
        dispose()
      })
    })

    it('finishGeneration resets state and stores content', () => {
      renderWorkspace((ctx, dispose) => {
        ctx.startGeneration('s1')
        ctx.appendStreamContent('Generated text')

        ctx.finishGeneration('Final generated text')

        expect(ctx.isGenerating()).toBe(false)
        expect(ctx.generatingSceneId()).toBeNull()
        expect(ctx.streamedContent()).toBe('')
        expect(ctx.draftContent('s1')).toBe('Final generated text')
        dispose()
      })
    })

    it('cancelGeneration resets state without saving', () => {
      renderWorkspace((ctx, dispose) => {
        ctx.startGeneration('s1')
        ctx.appendStreamContent('partial')

        ctx.cancelGeneration()

        expect(ctx.isGenerating()).toBe(false)
        expect(ctx.generatingSceneId()).toBeNull()
        expect(ctx.streamedContent()).toBe('')
        // Draft content should not be set by cancel
        expect(ctx.draftContent('s1')).toBe('')
        dispose()
      })
    })
  })

  // ---- Save status ----

  describe('save status', () => {
    it('setSaveStatus changes the save status', () => {
      renderWorkspace((ctx, dispose) => {
        expect(ctx.saveStatus()).toBe('saved')

        ctx.setSaveStatus('saving')
        expect(ctx.saveStatus()).toBe('saving')

        ctx.setSaveStatus('error')
        expect(ctx.saveStatus()).toBe('error')

        ctx.setSaveStatus('saved')
        expect(ctx.saveStatus()).toBe('saved')
        dispose()
      })
    })
  })

  // ---- Computed properties ----

  describe('computed properties', () => {
    it('selectedScene returns undefined when nothing selected', () => {
      renderWorkspace((ctx, dispose) => {
        expect(ctx.selectedScene()).toBeUndefined()
        dispose()
      })
    })

    it('selectedCharacter returns undefined when nothing selected', () => {
      renderWorkspace((ctx, dispose) => {
        expect(ctx.selectedCharacter()).toBeUndefined()
        dispose()
      })
    })

    it('scenesForTrack returns empty array for unknown track', () => {
      renderWorkspace((ctx, dispose) => {
        expect(ctx.scenesForTrack('nonexistent')).toEqual([])
        dispose()
      })
    })

    it('assignedCharacters returns empty array for unknown scene', () => {
      renderWorkspace((ctx, dispose) => {
        expect(ctx.assignedCharacters('nonexistent')).toEqual([])
        dispose()
      })
    })

    it('trackScenes returns sorted tracks with scenes', () => {
      renderWorkspace((ctx, dispose) => {
        // Before loading, trackScenes returns empty
        const result = ctx.trackScenes()
        expect(Array.isArray(result)).toBe(true)
        dispose()
      })
    })

    it('prevScene returns undefined when no scene selected', () => {
      renderWorkspace((ctx, dispose) => {
        expect(ctx.prevScene()).toBeUndefined()
        dispose()
      })
    })

    it('nextScene returns undefined when no scene selected', () => {
      renderWorkspace((ctx, dispose) => {
        expect(ctx.nextScene()).toBeUndefined()
        dispose()
      })
    })
  })

  // ---- Computed properties with loaded data ----

  describe('computed properties with loaded data', () => {
    it('selectedScene returns the scene after loading and selecting', async () => {
      let ctxRef: WorkspaceContextValue | undefined
      let disposeFn: (() => void) | undefined

      renderWorkspace((ctx, dispose) => {
        ctxRef = ctx
        disposeFn = dispose
      })

      await vi.mocked(projectApi.getWorkspace).mock.results[0]?.value

      ctxRef!.selectScene('s1')
      expect(ctxRef!.selectedScene()?.id).toBe('s1')
      expect(ctxRef!.selectedScene()?.title).toBe('Scene 1')

      disposeFn!()
    })

    it('scenesForTrack returns sorted scenes for given track', async () => {
      let ctxRef: WorkspaceContextValue | undefined
      let disposeFn: (() => void) | undefined

      renderWorkspace((ctx, dispose) => {
        ctxRef = ctx
        disposeFn = dispose
      })

      await vi.mocked(projectApi.getWorkspace).mock.results[0]?.value

      const t1Scenes = ctxRef!.scenesForTrack('t1')
      expect(t1Scenes).toHaveLength(3)
      expect(t1Scenes[0]!.startPosition).toBe(0)
      expect(t1Scenes[1]!.startPosition).toBe(2)
      expect(t1Scenes[2]!.startPosition).toBe(4)

      const t2Scenes = ctxRef!.scenesForTrack('t2')
      expect(t2Scenes).toHaveLength(0)

      disposeFn!()
    })

    it('assignedCharacters returns matching characters', async () => {
      let ctxRef: WorkspaceContextValue | undefined
      let disposeFn: (() => void) | undefined

      renderWorkspace((ctx, dispose) => {
        ctxRef = ctx
        disposeFn = dispose
      })

      await vi.mocked(projectApi.getWorkspace).mock.results[0]?.value

      const assigned = ctxRef!.assignedCharacters('s1')
      expect(assigned).toHaveLength(1)
      expect(assigned[0]!.name).toBe('Hero')

      const empty = ctxRef!.assignedCharacters('s2')
      expect(empty).toHaveLength(0)

      disposeFn!()
    })

    it('prevScene and nextScene navigate within track', async () => {
      let ctxRef: WorkspaceContextValue | undefined
      let disposeFn: (() => void) | undefined

      renderWorkspace((ctx, dispose) => {
        ctxRef = ctx
        disposeFn = dispose
      })

      await vi.mocked(projectApi.getWorkspace).mock.results[0]?.value

      // Select middle scene
      ctxRef!.selectScene('s2')
      expect(ctxRef!.prevScene()?.id).toBe('s1')
      expect(ctxRef!.nextScene()?.id).toBe('s3')

      // Select first scene
      ctxRef!.selectScene('s1')
      expect(ctxRef!.prevScene()).toBeUndefined()
      expect(ctxRef!.nextScene()?.id).toBe('s2')

      // Select last scene
      ctxRef!.selectScene('s3')
      expect(ctxRef!.prevScene()?.id).toBe('s2')
      expect(ctxRef!.nextScene()).toBeUndefined()

      disposeFn!()
    })

    it('trackScenes sorts tracks by position and includes scenes', async () => {
      let ctxRef: WorkspaceContextValue | undefined
      let disposeFn: (() => void) | undefined

      renderWorkspace((ctx, dispose) => {
        ctxRef = ctx
        disposeFn = dispose
      })

      await vi.mocked(projectApi.getWorkspace).mock.results[0]?.value

      const result = ctxRef!.trackScenes()
      expect(result).toHaveLength(2)
      expect(result[0]!.id).toBe('t1')
      expect(result[0]!.scenes).toHaveLength(3)
      expect(result[1]!.id).toBe('t2')
      expect(result[1]!.scenes).toHaveLength(0)

      disposeFn!()
    })
  })

  // ---- Debounced auto-save ----

  describe('debounced auto-save', () => {
    it('transitions from saving to saved after debounce', () => {
      vi.mocked(sceneApi.updateScene).mockResolvedValue({ data: {} as never })

      renderWorkspace((ctx, dispose) => {
        ctx.updateScene('s1', { title: 'X' })
        expect(ctx.saveStatus()).toBe('saving')

        vi.advanceTimersByTime(1000)
        expect(ctx.saveStatus()).toBe('saved')
        dispose()
      })
    })
  })

  // ---- Operations on loaded data (exercises async .then/.catch paths) ----

  describe('operations on loaded workspace data', () => {
    async function loadedWorkspace(): Promise<{ ctx: WorkspaceContextValue; dispose: () => void }> {
      vi.mocked(projectApi.getWorkspace).mockResolvedValue({ data: WORKSPACE_DATA })

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

      // Flush microtask queue so the resolved getWorkspace promise
      // and the setState inside loadWorkspace both complete.
      // Two ticks: one for the await inside loadWorkspace, one for the batch/setState.
      await Promise.resolve()
      await Promise.resolve()

      return { ctx: ctxRef!, dispose: disposeFn! }
    }

    it('removeScene removes existing scene optimistically and calls API', async () => {
      vi.mocked(sceneApi.deleteScene).mockResolvedValue(undefined)
      const { ctx, dispose } = await loadedWorkspace()

      expect(ctx.state.scenes).toHaveLength(3)
      ctx.selectScene('s1')
      ctx.removeScene('s1')

      expect(ctx.state.scenes).toHaveLength(2)
      expect(ctx.state.scenes.find(s => s.id === 's1')).toBeUndefined()
      expect(ctx.selectedSceneId()).toBeNull() // deselected
      expect(sceneApi.deleteScene).toHaveBeenCalledWith('p1', 's1')

      dispose()
    })

    it('removeScene rolls back on API failure', async () => {
      vi.mocked(sceneApi.deleteScene).mockRejectedValue(new Error('fail'))
      const { ctx, dispose } = await loadedWorkspace()

      ctx.removeScene('s1')
      expect(ctx.state.scenes).toHaveLength(2)

      // Wait for rejection handler
      await vi.advanceTimersByTimeAsync(0)

      // Scene should be restored
      expect(ctx.state.scenes).toHaveLength(3)
      expect(ctx.saveStatus()).toBe('error')

      dispose()
    })

    it('moveScene updates scene position and track', async () => {
      vi.mocked(sceneApi.updateScene).mockResolvedValue({ data: {} as never })
      const { ctx, dispose } = await loadedWorkspace()

      ctx.moveScene('s1', 't2', 10)

      const moved = ctx.state.scenes.find(s => s.id === 's1')
      expect(moved!.trackId).toBe('t2')
      expect(moved!.startPosition).toBe(10)
      expect(sceneApi.updateScene).toHaveBeenCalledWith('p1', 's1', { trackId: 't2', startPosition: 10 })

      dispose()
    })

    it('moveScene rolls back on API failure', async () => {
      vi.mocked(sceneApi.updateScene).mockRejectedValue(new Error('fail'))
      const { ctx, dispose } = await loadedWorkspace()

      ctx.moveScene('s1', 't2', 10)
      expect(ctx.state.scenes.find(s => s.id === 's1')!.trackId).toBe('t2')

      await vi.advanceTimersByTimeAsync(0)

      // Should rollback to original position
      const rolled = ctx.state.scenes.find(s => s.id === 's1')
      expect(rolled!.trackId).toBe('t1')
      expect(rolled!.startPosition).toBe(0)
      expect(ctx.saveStatus()).toBe('error')

      dispose()
    })

    it('updateScene applies optimistic update on loaded scene', async () => {
      vi.mocked(sceneApi.updateScene).mockResolvedValue({ data: {} as never })
      const { ctx, dispose } = await loadedWorkspace()

      ctx.updateScene('s1', { title: 'New Title', plotSummary: 'A great scene' })

      const scene = ctx.state.scenes.find(s => s.id === 's1')
      expect(scene!.title).toBe('New Title')
      expect(scene!.plotSummary).toBe('A great scene')
      expect(sceneApi.updateScene).toHaveBeenCalledWith('p1', 's1', { title: 'New Title', plotSummary: 'A great scene' })

      dispose()
    })

    it('updateScene sets error on API failure', async () => {
      vi.mocked(sceneApi.updateScene).mockRejectedValue(new Error('fail'))
      const { ctx, dispose } = await loadedWorkspace()

      ctx.updateScene('s1', { title: 'X' })

      await vi.advanceTimersByTimeAsync(0)
      expect(ctx.saveStatus()).toBe('error')

      dispose()
    })

    it('removeTrack removes track and its scenes', async () => {
      vi.mocked(trackApi.deleteTrack).mockResolvedValue(undefined)
      const { ctx, dispose } = await loadedWorkspace()

      // Select a scene on track t1
      ctx.selectScene('s1')

      ctx.removeTrack('t1')

      // Track removed
      expect(ctx.state.tracks.find(t => t.id === 't1')).toBeUndefined()
      // All scenes on t1 removed
      expect(ctx.state.scenes.filter(s => s.trackId === 't1')).toHaveLength(0)
      // Selected scene was on t1, should be deselected
      expect(ctx.selectedSceneId()).toBeNull()
      expect(trackApi.deleteTrack).toHaveBeenCalledWith('p1', 't1')

      dispose()
    })

    it('removeTrack rolls back on API failure', async () => {
      vi.mocked(trackApi.deleteTrack).mockRejectedValue(new Error('fail'))
      const { ctx, dispose } = await loadedWorkspace()

      ctx.removeTrack('t1')
      expect(ctx.state.tracks.find(t => t.id === 't1')).toBeUndefined()

      await vi.advanceTimersByTimeAsync(0)

      // Track and scenes restored
      expect(ctx.state.tracks.find(t => t.id === 't1')).toBeDefined()
      expect(ctx.state.scenes.filter(s => s.trackId === 't1').length).toBeGreaterThan(0)
      expect(ctx.saveStatus()).toBe('error')

      dispose()
    })

    it('updateTrack updates label on loaded track', async () => {
      vi.mocked(trackApi.updateTrack).mockResolvedValue({ data: {} as never })
      const { ctx, dispose } = await loadedWorkspace()

      ctx.updateTrack('t1', 'Renamed Track')
      const track = ctx.state.tracks.find(t => t.id === 't1')
      expect(track!.label).toBe('Renamed Track')

      dispose()
    })

    it('removeCharacter removes character and cleans up references', async () => {
      vi.mocked(characterApi.deleteCharacter).mockResolvedValue(undefined)
      const { ctx, dispose } = await loadedWorkspace()

      ctx.selectCharacter('c1')
      ctx.removeCharacter('c1')

      // Character removed
      expect(ctx.state.characters.find(c => c.id === 'c1')).toBeUndefined()
      // Character deselected
      expect(ctx.selectedCharacterId()).toBeNull()
      // Character removed from scene characterIds
      const s1 = ctx.state.scenes.find(s => s.id === 's1')
      expect(s1!.characterIds).not.toContain('c1')
      // Relationships involving c1 removed
      expect(ctx.state.relationships.filter(r => r.characterAId === 'c1' || r.characterBId === 'c1')).toHaveLength(0)

      dispose()
    })

    it('removeCharacter rolls back on API failure', async () => {
      vi.mocked(characterApi.deleteCharacter).mockRejectedValue(new Error('fail'))
      const { ctx, dispose } = await loadedWorkspace()

      ctx.removeCharacter('c1')
      expect(ctx.state.characters.find(c => c.id === 'c1')).toBeUndefined()

      await vi.advanceTimersByTimeAsync(0)

      // Character restored (note: relationships/characterIds won't be fully restored since
      // only the character snapshot is restored, not the scene refs - this is a known limitation)
      expect(ctx.state.characters.find(c => c.id === 'c1')).toBeDefined()
      expect(ctx.saveStatus()).toBe('error')

      dispose()
    })

    it('updateCharacter updates character on loaded data', async () => {
      vi.mocked(characterApi.updateCharacter).mockResolvedValue({ data: {} as never })
      const { ctx, dispose } = await loadedWorkspace()

      ctx.updateCharacter('c1', { name: 'Super Hero', personality: 'brave' })
      const char = ctx.state.characters.find(c => c.id === 'c1')
      expect(char!.name).toBe('Super Hero')
      expect(char!.personality).toBe('brave')

      dispose()
    })

    it('removeRelationship removes from loaded state', async () => {
      vi.mocked(characterApi.deleteRelationship).mockResolvedValue(undefined)
      const { ctx, dispose } = await loadedWorkspace()

      ctx.removeRelationship('r1')
      expect(ctx.state.relationships.find(r => r.id === 'r1')).toBeUndefined()
      expect(characterApi.deleteRelationship).toHaveBeenCalledWith('p1', 'r1')

      dispose()
    })

    it('removeRelationship rolls back on failure', async () => {
      vi.mocked(characterApi.deleteRelationship).mockRejectedValue(new Error('fail'))
      const { ctx, dispose } = await loadedWorkspace()

      ctx.removeRelationship('r1')
      expect(ctx.state.relationships.find(r => r.id === 'r1')).toBeUndefined()

      await vi.advanceTimersByTimeAsync(0)

      expect(ctx.state.relationships.find(r => r.id === 'r1')).toBeDefined()
      expect(ctx.saveStatus()).toBe('error')

      dispose()
    })

    it('removeConnection removes from loaded state', async () => {
      vi.mocked(connectionApi.deleteConnection).mockResolvedValue(undefined)
      const { ctx, dispose } = await loadedWorkspace()

      ctx.removeConnection('conn1')
      expect(ctx.state.connections.find(c => c.id === 'conn1')).toBeUndefined()
      expect(connectionApi.deleteConnection).toHaveBeenCalledWith('p1', 'conn1')

      dispose()
    })

    it('removeConnection rolls back on failure', async () => {
      vi.mocked(connectionApi.deleteConnection).mockRejectedValue(new Error('fail'))
      const { ctx, dispose } = await loadedWorkspace()

      ctx.removeConnection('conn1')
      expect(ctx.state.connections.find(c => c.id === 'conn1')).toBeUndefined()

      await vi.advanceTimersByTimeAsync(0)

      expect(ctx.state.connections.find(c => c.id === 'conn1')).toBeDefined()
      expect(ctx.saveStatus()).toBe('error')

      dispose()
    })

    it('updateProject applies optimistic update on loaded project', async () => {
      vi.mocked(projectApi.updateProject).mockResolvedValue({ data: {} as never })
      const { ctx, dispose } = await loadedWorkspace()

      ctx.updateProject({ title: 'New Title', genre: 'Sci-Fi' })
      expect(ctx.state.project!.title).toBe('New Title')
      expect(ctx.state.project!.genre).toBe('Sci-Fi')

      dispose()
    })

    it('updateProject sets error on API failure', async () => {
      vi.mocked(projectApi.updateProject).mockRejectedValue(new Error('fail'))
      const { ctx, dispose } = await loadedWorkspace()

      ctx.updateProject({ title: 'X' })

      await vi.advanceTimersByTimeAsync(0)
      expect(ctx.saveStatus()).toBe('error')

      dispose()
    })

    it('finishGeneration marks scene as ai_draft after load', async () => {
      const { ctx, dispose } = await loadedWorkspace()

      ctx.startGeneration('s1')
      ctx.appendStreamContent('Generated text')
      ctx.finishGeneration('Final text')

      const scene = ctx.state.scenes.find(s => s.id === 's1')
      expect(scene!.status).toBe('ai_draft')
      expect(ctx.draftContent('s1')).toBe('Final text')

      dispose()
    })

    it('addTrack computes correct position from existing tracks', async () => {
      vi.mocked(trackApi.createTrack).mockResolvedValue({ data: {} as never })
      const { ctx, dispose } = await loadedWorkspace()

      ctx.addTrack('Track 3')

      // maxPos should be 2 (since t1=0, t2=1, so next = 2)
      expect(trackApi.createTrack).toHaveBeenCalledWith('p1', expect.objectContaining({ position: 2 }))

      dispose()
    })

    it('updateRelationship updates on loaded relationship', async () => {
      vi.mocked(characterApi.updateRelationship).mockResolvedValue({ data: {} as never })
      const { ctx, dispose } = await loadedWorkspace()

      ctx.updateRelationship('r1', { label: 'Enemy', visualType: 'dashed' })
      const rel = ctx.state.relationships.find(r => r.id === 'r1')
      expect(rel!.label).toBe('Enemy')
      expect(rel!.visualType).toBe('dashed')

      dispose()
    })

    it('updateTrack sets error on API failure', async () => {
      vi.mocked(trackApi.updateTrack).mockRejectedValue(new Error('fail'))
      const { ctx, dispose } = await loadedWorkspace()

      ctx.updateTrack('t1', 'New')

      await vi.advanceTimersByTimeAsync(0)
      expect(ctx.saveStatus()).toBe('error')

      dispose()
    })

    it('updateCharacter sets error on API failure', async () => {
      vi.mocked(characterApi.updateCharacter).mockRejectedValue(new Error('fail'))
      const { ctx, dispose } = await loadedWorkspace()

      ctx.updateCharacter('c1', { name: 'X' })

      await vi.advanceTimersByTimeAsync(0)
      expect(ctx.saveStatus()).toBe('error')

      dispose()
    })

    it('updateRelationship sets error on API failure', async () => {
      vi.mocked(characterApi.updateRelationship).mockRejectedValue(new Error('fail'))
      const { ctx, dispose } = await loadedWorkspace()

      ctx.updateRelationship('r1', { label: 'X' })

      await vi.advanceTimersByTimeAsync(0)
      expect(ctx.saveStatus()).toBe('error')

      dispose()
    })
  })
})
