import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRoot } from 'solid-js'
import { WorkspaceProvider, useWorkspace } from './store'
import type { WorkspaceContextValue } from './store'
import { DEMO_PROJECT_ID } from '@/shared/fixtures/demo-project'

// Mock all API modules — none should be called in demo mode
const mockGetWorkspace = vi.fn()
const mockCreateScene = vi.fn()
const mockUpdateScene = vi.fn()
const mockDeleteScene = vi.fn()
const mockCreateTrack = vi.fn()
const mockUpdateTrack = vi.fn()
const mockDeleteTrack = vi.fn()
const mockCreateCharacter = vi.fn()
const mockUpdateCharacter = vi.fn()
const mockDeleteCharacter = vi.fn()
const mockCreateRelationship = vi.fn()
const mockUpdateRelationship = vi.fn()
const mockDeleteRelationship = vi.fn()
const mockCreateConnection = vi.fn()
const mockDeleteConnection = vi.fn()
const mockUpdateProject = vi.fn()

vi.mock('@/entities/project/api', () => ({
  getWorkspace: (...args: any[]) => mockGetWorkspace(...args),
  updateProject: (...args: any[]) => mockUpdateProject(...args),
}))

vi.mock('@/entities/scene/api', () => ({
  createScene: (...args: any[]) => mockCreateScene(...args),
  updateScene: (...args: any[]) => mockUpdateScene(...args),
  deleteScene: (...args: any[]) => mockDeleteScene(...args),
}))

vi.mock('@/entities/track/api', () => ({
  createTrack: (...args: any[]) => mockCreateTrack(...args),
  updateTrack: (...args: any[]) => mockUpdateTrack(...args),
  deleteTrack: (...args: any[]) => mockDeleteTrack(...args),
}))

vi.mock('@/entities/character/api', () => ({
  createCharacter: (...args: any[]) => mockCreateCharacter(...args),
  updateCharacter: (...args: any[]) => mockUpdateCharacter(...args),
  deleteCharacter: (...args: any[]) => mockDeleteCharacter(...args),
  createRelationship: (...args: any[]) => mockCreateRelationship(...args),
  updateRelationship: (...args: any[]) => mockUpdateRelationship(...args),
  deleteRelationship: (...args: any[]) => mockDeleteRelationship(...args),
}))

vi.mock('@/entities/connection/api', () => ({
  createConnection: (...args: any[]) => mockCreateConnection(...args),
  deleteConnection: (...args: any[]) => mockDeleteConnection(...args),
}))

function renderDemoWorkspace(cb: (ws: WorkspaceContextValue) => void): Promise<void> {
  return new Promise<void>((resolve) => {
    createRoot((dispose) => {
      let wsRef: WorkspaceContextValue

      function Child() {
        wsRef = useWorkspace()
        return null
      }

      // @ts-expect-error — JSX in test
      const _el = (
        <WorkspaceProvider projectId={DEMO_PROJECT_ID} isDemo={true}>
          <Child />
        </WorkspaceProvider>
      )

      // Give onMount time to fire
      queueMicrotask(() => {
        cb(wsRef!)
        dispose()
        resolve()
      })
    })
  })
}

describe('WorkspaceProvider – demo mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads demo fixture data without calling API', async () => {
    await renderDemoWorkspace((ws) => {
      expect(ws.state.project).not.toBeNull()
      expect(ws.state.project!.id).toBe(DEMO_PROJECT_ID)
      expect(ws.state.tracks.length).toBeGreaterThanOrEqual(2)
      expect(ws.state.scenes.length).toBeGreaterThanOrEqual(8)
      expect(ws.state.characters.length).toBeGreaterThanOrEqual(4)
      expect(mockGetWorkspace).not.toHaveBeenCalled()
    })
  })

  it('addScene does not call API in demo mode', async () => {
    await renderDemoWorkspace((ws) => {
      const trackId = ws.state.tracks[0]!.id
      const initialCount = ws.state.scenes.length
      ws.addScene(trackId, 99)
      expect(ws.state.scenes.length).toBe(initialCount + 1)
      expect(mockCreateScene).not.toHaveBeenCalled()
    })
  })

  it('updateScene does not call API in demo mode', async () => {
    await renderDemoWorkspace((ws) => {
      const sceneId = ws.state.scenes[0]!.id
      ws.updateScene(sceneId, { title: 'Updated' })
      expect(ws.state.scenes.find((s) => s.id === sceneId)!.title).toBe('Updated')
      expect(mockUpdateScene).not.toHaveBeenCalled()
    })
  })

  it('removeScene does not call API in demo mode', async () => {
    await renderDemoWorkspace((ws) => {
      const sceneId = ws.state.scenes[0]!.id
      const initialCount = ws.state.scenes.length
      ws.removeScene(sceneId)
      expect(ws.state.scenes.length).toBe(initialCount - 1)
      expect(mockDeleteScene).not.toHaveBeenCalled()
    })
  })

  it('addTrack does not call API in demo mode', async () => {
    await renderDemoWorkspace((ws) => {
      const initialCount = ws.state.tracks.length
      ws.addTrack('New Track')
      expect(ws.state.tracks.length).toBe(initialCount + 1)
      expect(mockCreateTrack).not.toHaveBeenCalled()
    })
  })

  it('addCharacter does not call API in demo mode', async () => {
    await renderDemoWorkspace((ws) => {
      const initialCount = ws.state.characters.length
      ws.addCharacter('New Character')
      expect(ws.state.characters.length).toBe(initialCount + 1)
      expect(mockCreateCharacter).not.toHaveBeenCalled()
    })
  })

  it('updateProject does not call API in demo mode', async () => {
    await renderDemoWorkspace((ws) => {
      ws.updateProject({ genre: 'Sci-Fi' })
      expect(ws.state.project!.genre).toBe('Sci-Fi')
      expect(mockUpdateProject).not.toHaveBeenCalled()
    })
  })

  it('setDraftContent does not call API in demo mode', async () => {
    await renderDemoWorkspace((ws) => {
      const sceneId = ws.state.scenes[0]!.id
      ws.setDraftContent(sceneId, 'New draft content')
      expect(ws.draftContent(sceneId)).toBe('New draft content')
      expect(mockUpdateScene).not.toHaveBeenCalled()
    })
  })
})
