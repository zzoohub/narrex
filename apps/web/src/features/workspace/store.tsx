import {
  createContext,
  useContext,
  createSignal,
  createMemo,
  batch,
  onCleanup,
  onMount,
} from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import type { ParentComponent } from 'solid-js'
import type { Project } from '@/entities/project'
import type { Scene } from '@/entities/scene'
import type { Track } from '@/entities/track'
import type { Character, CharacterRelationship } from '@/entities/character'
import type { SceneConnection } from '@/entities/connection'

import * as projectApi from '@/entities/project/api'
import * as sceneApi from '@/entities/scene/api'
import * as trackApi from '@/entities/track/api'
import * as characterApi from '@/entities/character/api'
import * as connectionApi from '@/entities/connection/api'

// ---- Types ------------------------------------------------------------------

type SaveStatus = 'saved' | 'saving' | 'error'

interface WorkspaceState {
  project: Project | null
  tracks: Track[]
  scenes: Scene[]
  characters: Character[]
  relationships: CharacterRelationship[]
  connections: SceneConnection[]
}

interface WorkspaceActions {
  loadWorkspace: (projectId: string) => Promise<void>

  addScene: (trackId: string, startPosition: number) => void
  updateScene: (sceneId: string, updates: Partial<Pick<Scene, 'title' | 'plotSummary' | 'location' | 'moodTags' | 'characterIds' | 'startPosition' | 'duration' | 'trackId' | 'status'>>) => void
  markSceneEdited: (sceneId: string) => void
  removeScene: (sceneId: string) => void
  moveScene: (sceneId: string, newTrackId: string, newStartPosition: number) => void
  selectScene: (sceneId: string | null) => void

  addTrack: (label: string) => void
  updateTrack: (trackId: string, label: string) => void
  removeTrack: (trackId: string) => void

  addCharacter: (name: string) => void
  updateCharacter: (charId: string, updates: Partial<Pick<Character, 'name' | 'personality' | 'appearance' | 'secrets' | 'motivation' | 'profileImageUrl' | 'graphX' | 'graphY'>>) => void
  removeCharacter: (charId: string) => void
  selectCharacter: (charId: string | null) => void

  addRelationship: (characterAId: string, characterBId: string, label: string, visualType: CharacterRelationship['visualType']) => void
  updateRelationship: (relId: string, updates: Partial<Pick<CharacterRelationship, 'label' | 'visualType' | 'direction'>>) => void
  removeRelationship: (relId: string) => void

  addConnection: (sourceSceneId: string, targetSceneId: string, connectionType: SceneConnection['connectionType']) => void
  removeConnection: (connId: string) => void

  updateProject: (updates: Partial<Pick<Project, 'title' | 'genre' | 'theme' | 'eraLocation' | 'pov' | 'tone'>>) => void

  setDraftContent: (sceneId: string, content: string) => void
  startGeneration: (sceneId: string) => void
  appendStreamContent: (text: string) => void
  finishGeneration: (finalContent: string) => void
  cancelGeneration: () => void
  setSaveStatus: (status: SaveStatus) => void
}

export interface WorkspaceContextValue extends WorkspaceActions {
  readonly state: WorkspaceState
  readonly selectedSceneId: () => string | null
  readonly selectedCharacterId: () => string | null
  readonly saveStatus: () => SaveStatus
  readonly isGenerating: () => boolean
  readonly generatingSceneId: () => string | null
  readonly streamedContent: () => string
  readonly projectId: string

  readonly selectedScene: () => Scene | undefined
  readonly selectedCharacter: () => Character | undefined
  scenesForTrack: (trackId: string) => Scene[]
  assignedCharacters: (sceneId: string) => Character[]
  readonly trackScenes: () => Array<Track & { scenes: Scene[] }>
  readonly prevScene: () => Scene | undefined
  readonly nextScene: () => Scene | undefined
  draftContent: (sceneId: string) => string
  readonly configVersion: () => number
}

// ---- Helpers ----------------------------------------------------------------

function tempId(): string {
  return `temp_${crypto.randomUUID()}`
}

function debounce(fn: () => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  const trigger = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { fn(); timer = undefined }, ms)
  }
  const cancel = () => { if (timer) { clearTimeout(timer); timer = undefined } }
  return { trigger, cancel }
}

// ---- Context ----------------------------------------------------------------

const WorkspaceContext = createContext<WorkspaceContextValue>()

export const WorkspaceProvider: ParentComponent<{ projectId: string }> = (props) => {
  const [state, setState] = createStore<WorkspaceState>({
    project: null,
    tracks: [],
    scenes: [],
    characters: [],
    relationships: [],
    connections: [],
  })

  const [selectedSceneId, setSelectedSceneId] = createSignal<string | null>(null)
  const [selectedCharacterId, setSelectedCharacterId] = createSignal<string | null>(null)
  const [saveStatus, setSaveStatus] = createSignal<SaveStatus>('saved')
  const [isGenerating, setIsGenerating] = createSignal(false)
  const [generatingSceneId, setGeneratingSceneId] = createSignal<string | null>(null)
  const [streamedContent, setStreamedContent] = createSignal('')
  const [configVersion, setConfigVersion] = createSignal(0)

  // Auto-save debounce
  const autoSave = debounce(() => {
    setSaveStatus('saved')
  }, 1000)

  // Per-character debounced API saves
  const charPendingUpdates = new Map<string, Partial<Character>>()
  const charSaveTimers = new Map<string, ReturnType<typeof setTimeout>>()

  function flushCharacterSave(charId: string) {
    const pending = charPendingUpdates.get(charId)
    if (pending) {
      charPendingUpdates.delete(charId)
      characterApi.updateCharacter(props.projectId, charId, pending).catch(() => setSaveStatus('error'))
    }
    charSaveTimers.delete(charId)
  }

  // Content auto-save (debounced per scene)
  const contentSaveTimers = new Map<string, ReturnType<typeof setTimeout>>()

  function saveContentToServer(sceneId: string, content: string) {
    const existing = contentSaveTimers.get(sceneId)
    if (existing) clearTimeout(existing)
    contentSaveTimers.set(sceneId, setTimeout(() => {
      contentSaveTimers.delete(sceneId)
      sceneApi.updateScene(props.projectId, sceneId, { content: content || null })
        .catch(() => setSaveStatus('error'))
    }, 1500))
  }

  onCleanup(() => {
    autoSave.cancel()
    for (const timer of charSaveTimers.values()) clearTimeout(timer)
    // Flush any pending character saves on cleanup
    for (const charId of charPendingUpdates.keys()) flushCharacterSave(charId)
    for (const timer of contentSaveTimers.values()) clearTimeout(timer)
  })

  function markSaving() {
    setSaveStatus('saving')
    autoSave.trigger()
  }

  // ---- Load workspace ----

  async function loadWorkspace(projectId: string): Promise<void> {
    try {
      const { data } = await projectApi.getWorkspace(projectId)
      batch(() => {
        setState('project', data.project)
        setState('tracks', data.tracks)
        setState('scenes', data.scenes)
        setState('characters', data.characters)
        setState('relationships', data.relationships)
        setState('connections', data.connections)
        setSelectedSceneId(null)
        setSelectedCharacterId(null)
        setSaveStatus('saved')
      })
    } catch {
      setSaveStatus('error')
    }
  }

  onMount(() => {
    void loadWorkspace(props.projectId)
  })

  // ---- Computed ----

  const selectedScene = createMemo(() => {
    const id = selectedSceneId()
    return id ? state.scenes.find((s) => s.id === id) : undefined
  })

  const selectedCharacter = createMemo(() => {
    const id = selectedCharacterId()
    return id ? state.characters.find((c) => c.id === id) : undefined
  })

  function scenesForTrack(trackId: string): Scene[] {
    return state.scenes
      .filter((s) => s.trackId === trackId)
      .sort((a, b) => a.startPosition - b.startPosition)
  }

  function assignedCharacters(sceneId: string): Character[] {
    const scene = state.scenes.find((s) => s.id === sceneId)
    if (!scene) return []
    return state.characters.filter((c) => scene.characterIds.includes(c.id))
  }

  const trackScenes = createMemo(() =>
    [...state.tracks]
      .sort((a, b) => a.position - b.position)
      .map((track) => ({
        ...track,
        scenes: scenesForTrack(track.id),
      })),
  )

  const currentTrackSorted = createMemo(() => {
    const scene = selectedScene()
    if (!scene) return []
    return state.scenes
      .filter((s) => s.trackId === scene.trackId)
      .sort((a, b) => a.startPosition - b.startPosition)
  })

  const prevScene = createMemo(() => {
    const sorted = currentTrackSorted()
    const id = selectedSceneId()
    if (!id) return undefined
    const idx = sorted.findIndex((s) => s.id === id)
    return idx > 0 ? sorted[idx - 1] : undefined
  })

  const nextScene = createMemo(() => {
    const sorted = currentTrackSorted()
    const id = selectedSceneId()
    if (!id) return undefined
    const idx = sorted.findIndex((s) => s.id === id)
    return idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : undefined
  })

  function draftContent(sceneId: string): string {
    const scene = state.scenes.find((s) => s.id === sceneId)
    return scene?.content ?? ''
  }

  // ---- Scene CRUD ----

  function addScene(trackId: string, startPosition: number): void {
    const id = tempId()
    const now = new Date().toISOString()
    const newScene: Scene = {
      id,
      trackId,
      projectId: props.projectId,
      title: '',
      status: 'empty',
      characterIds: [],
      location: null,
      moodTags: [],
      content: null,
      plotSummary: null,
      startPosition,
      duration: 1,
      createdAt: now,
      updatedAt: now,
    }
    setState(produce((s) => { s.scenes.push(newScene) }))
    setSelectedSceneId(id)

    sceneApi.createScene(props.projectId, { trackId, title: '', startPosition }).then(
      ({ data }) => {
        setState(produce((s) => {
          const idx = s.scenes.findIndex((sc) => sc.id === id)
          if (idx !== -1) s.scenes[idx] = data
        }))
        setSelectedSceneId(data.id)
      },
      () => {
        setState(produce((s) => {
          const idx = s.scenes.findIndex((sc) => sc.id === id)
          if (idx !== -1) s.scenes.splice(idx, 1)
        }))
        setSaveStatus('error')
      },
    )
  }

  function updateScene(sceneId: string, updates: Partial<Scene>): void {
    setState(produce((s) => {
      const scene = s.scenes.find((sc) => sc.id === sceneId)
      if (scene) Object.assign(scene, updates)
    }))
    markSaving()
    sceneApi.updateScene(props.projectId, sceneId, updates).catch(() => setSaveStatus('error'))
  }

  function removeScene(sceneId: string): void {
    const idx = state.scenes.findIndex((s) => s.id === sceneId)
    if (idx === -1) return
    const snapshot = { ...state.scenes[idx]! }

    batch(() => {
      setState(produce((s) => { s.scenes.splice(idx, 1) }))
      if (selectedSceneId() === sceneId) setSelectedSceneId(null)
    })

    sceneApi.deleteScene(props.projectId, sceneId).catch(() => {
      setState(produce((s) => { s.scenes.splice(idx, 0, snapshot) }))
      setSaveStatus('error')
    })
  }

  function moveScene(sceneId: string, newTrackId: string, newStartPosition: number): void {
    const scene = state.scenes.find((s) => s.id === sceneId)
    if (!scene) return
    const prev = { trackId: scene.trackId, startPosition: scene.startPosition }

    setState(produce((s) => {
      const sc = s.scenes.find((x) => x.id === sceneId)
      if (sc) { sc.trackId = newTrackId; sc.startPosition = newStartPosition }
    }))

    sceneApi.updateScene(props.projectId, sceneId, { trackId: newTrackId, startPosition: newStartPosition }).catch(() => {
      setState(produce((s) => {
        const sc = s.scenes.find((x) => x.id === sceneId)
        if (sc) { sc.trackId = prev.trackId; sc.startPosition = prev.startPosition }
      }))
      setSaveStatus('error')
    })
  }

  function markSceneEdited(sceneId: string): void {
    const scene = state.scenes.find((s) => s.id === sceneId)
    if (scene && scene.status === 'ai_draft') {
      setState(produce((s) => {
        const sc = s.scenes.find((x) => x.id === sceneId)
        if (sc) sc.status = 'edited'
      }))
      markSaving()
      sceneApi.updateScene(props.projectId, sceneId, { status: 'edited' } as any).catch(() => setSaveStatus('error'))
    }
  }

  function selectScene(sceneId: string | null): void {
    setSelectedSceneId(sceneId)
  }

  // ---- Track CRUD ----

  function addTrack(label: string): void {
    const id = tempId()
    const maxPos = state.tracks.reduce((m, t) => Math.max(m, t.position), -1) + 1
    const now = new Date().toISOString()
    const newTrack: Track = { id, projectId: props.projectId, position: maxPos, label, createdAt: now, updatedAt: now }
    setState(produce((s) => { s.tracks.push(newTrack) }))

    trackApi.createTrack(props.projectId, { label, position: maxPos }).then(
      ({ data }) => {
        setState(produce((s) => {
          const idx = s.tracks.findIndex((t) => t.id === id)
          if (idx !== -1) s.tracks[idx] = data
        }))
      },
      () => {
        setState(produce((s) => {
          const idx = s.tracks.findIndex((t) => t.id === id)
          if (idx !== -1) s.tracks.splice(idx, 1)
        }))
        setSaveStatus('error')
      },
    )
  }

  function updateTrack(trackId: string, label: string): void {
    setState(produce((s) => {
      const track = s.tracks.find((t) => t.id === trackId)
      if (track) track.label = label
    }))
    markSaving()
    trackApi.updateTrack(props.projectId, trackId, { label }).catch(() => setSaveStatus('error'))
  }

  function removeTrack(trackId: string): void {
    const idx = state.tracks.findIndex((t) => t.id === trackId)
    if (idx === -1) return
    const trackSnap = { ...state.tracks[idx]! }
    const sceneSnaps = state.scenes.filter((s) => s.trackId === trackId).map((s) => ({ ...s }))

    batch(() => {
      setState(produce((s) => {
        s.tracks.splice(idx, 1)
        s.scenes = s.scenes.filter((sc) => sc.trackId !== trackId)
      }))
      const selId = selectedSceneId()
      if (selId && sceneSnaps.some((sc) => sc.id === selId)) setSelectedSceneId(null)
    })

    trackApi.deleteTrack(props.projectId, trackId).catch(() => {
      setState(produce((s) => {
        s.tracks.splice(idx, 0, trackSnap)
        s.scenes.push(...sceneSnaps)
      }))
      setSaveStatus('error')
    })
  }

  // ---- Character CRUD ----

  function addCharacter(name: string): void {
    const id = tempId()
    const now = new Date().toISOString()
    const newChar: Character = {
      id, projectId: props.projectId, name,
      personality: null, appearance: null, secrets: null, motivation: null,
      profileImageUrl: null,
      graphX: 100 + Math.random() * 200,
      graphY: 100 + Math.random() * 200,
      createdAt: now, updatedAt: now,
    }
    setState(produce((s) => { s.characters.push(newChar) }))
    setSelectedCharacterId(id)

    characterApi.createCharacter(props.projectId, { name, graphX: newChar.graphX!, graphY: newChar.graphY! }).then(
      ({ data }) => {
        setState(produce((s) => {
          const idx = s.characters.findIndex((c) => c.id === id)
          if (idx !== -1) s.characters[idx] = data
        }))
        setSelectedCharacterId(data.id)
      },
      () => {
        setState(produce((s) => {
          const idx = s.characters.findIndex((c) => c.id === id)
          if (idx !== -1) s.characters.splice(idx, 1)
        }))
        setSaveStatus('error')
      },
    )
  }

  function updateCharacter(charId: string, updates: Partial<Character>): void {
    // Update store immediately (optimistic)
    setState(produce((s) => {
      const char = s.characters.find((c) => c.id === charId)
      if (char) Object.assign(char, updates)
    }))
    markSaving()

    // Merge pending updates and debounce API call per character
    const existing = charPendingUpdates.get(charId) ?? {}
    charPendingUpdates.set(charId, { ...existing, ...updates })

    const prevTimer = charSaveTimers.get(charId)
    if (prevTimer) clearTimeout(prevTimer)
    charSaveTimers.set(charId, setTimeout(() => flushCharacterSave(charId), 800))
  }

  function removeCharacter(charId: string): void {
    const idx = state.characters.findIndex((c) => c.id === charId)
    if (idx === -1) return
    const snapshot = { ...state.characters[idx]! }

    batch(() => {
      setState(produce((s) => {
        s.characters.splice(idx, 1)
        for (const scene of s.scenes) {
          const ci = scene.characterIds.indexOf(charId)
          if (ci !== -1) scene.characterIds.splice(ci, 1)
        }
        s.relationships = s.relationships.filter(
          (r) => r.characterAId !== charId && r.characterBId !== charId,
        )
      }))
      if (selectedCharacterId() === charId) setSelectedCharacterId(null)
    })

    characterApi.deleteCharacter(props.projectId, charId).catch(() => {
      setState(produce((s) => { s.characters.push(snapshot) }))
      setSaveStatus('error')
    })
  }

  function selectCharacter(charId: string | null): void {
    setSelectedCharacterId(charId)
  }

  // ---- Relationship CRUD ----

  function addRelationship(characterAId: string, characterBId: string, label: string, visualType: CharacterRelationship['visualType']): void {
    const id = tempId()
    const now = new Date().toISOString()
    const newRel: CharacterRelationship = {
      id, projectId: props.projectId,
      characterAId, characterBId, label, visualType,
      direction: 'bidirectional',
      createdAt: now, updatedAt: now,
    }
    setState(produce((s) => { s.relationships.push(newRel) }))

    characterApi.createRelationship(props.projectId, { characterAId, characterBId, label, visualType, direction: 'bidirectional' }).then(
      ({ data }) => {
        setState(produce((s) => {
          const idx = s.relationships.findIndex((r) => r.id === id)
          if (idx !== -1) s.relationships[idx] = data
        }))
      },
      () => {
        setState(produce((s) => {
          const idx = s.relationships.findIndex((r) => r.id === id)
          if (idx !== -1) s.relationships.splice(idx, 1)
        }))
        setSaveStatus('error')
      },
    )
  }

  function updateRelationship(relId: string, updates: Partial<CharacterRelationship>): void {
    setState(produce((s) => {
      const rel = s.relationships.find((r) => r.id === relId)
      if (rel) Object.assign(rel, updates)
    }))
    markSaving()
    characterApi.updateRelationship(props.projectId, relId, updates).catch(() => setSaveStatus('error'))
  }

  function removeRelationship(relId: string): void {
    const idx = state.relationships.findIndex((r) => r.id === relId)
    if (idx === -1) return
    const snapshot = { ...state.relationships[idx]! }
    setState(produce((s) => { s.relationships.splice(idx, 1) }))

    characterApi.deleteRelationship(props.projectId, relId).catch(() => {
      setState(produce((s) => { s.relationships.splice(idx, 0, snapshot) }))
      setSaveStatus('error')
    })
  }

  // ---- Connection CRUD ----

  function addConnection(sourceSceneId: string, targetSceneId: string, connectionType: SceneConnection['connectionType']): void {
    const id = tempId()
    const now = new Date().toISOString()
    const newConn: SceneConnection = { id, projectId: props.projectId, sourceSceneId, targetSceneId, connectionType, createdAt: now }
    setState(produce((s) => { s.connections.push(newConn) }))

    connectionApi.createConnection(props.projectId, { sourceSceneId, targetSceneId, connectionType }).then(
      ({ data }) => {
        setState(produce((s) => {
          const idx = s.connections.findIndex((c) => c.id === id)
          if (idx !== -1) s.connections[idx] = data
        }))
      },
      () => {
        setState(produce((s) => {
          const idx = s.connections.findIndex((c) => c.id === id)
          if (idx !== -1) s.connections.splice(idx, 1)
        }))
        setSaveStatus('error')
      },
    )
  }

  function removeConnection(connId: string): void {
    const idx = state.connections.findIndex((c) => c.id === connId)
    if (idx === -1) return
    const snapshot = { ...state.connections[idx]! }
    setState(produce((s) => { s.connections.splice(idx, 1) }))

    connectionApi.deleteConnection(props.projectId, connId).catch(() => {
      setState(produce((s) => { s.connections.splice(idx, 0, snapshot) }))
      setSaveStatus('error')
    })
  }

  // ---- Project / Config ----

  function updateProjectAction(updates: Partial<Pick<Project, 'title' | 'genre' | 'theme' | 'eraLocation' | 'pov' | 'tone'>>): void {
    // Check if any generation-relevant config fields changed
    const configFields = ['genre', 'theme', 'eraLocation', 'pov', 'tone'] as const
    const isConfigChange = configFields.some((f) => f in updates)

    setState(produce((s) => {
      if (s.project) Object.assign(s.project, updates)
      // Mark scenes with existing drafts as needs_revision
      if (isConfigChange) {
        for (const scene of s.scenes) {
          if (scene.status === 'ai_draft' || scene.status === 'edited') {
            if (scene.content && scene.content.length > 0) {
              scene.status = 'needs_revision'
            }
          }
        }
      }
    }))
    if (isConfigChange) setConfigVersion((v) => v + 1)
    markSaving()
    projectApi.updateProject(props.projectId, updates).catch(() => setSaveStatus('error'))
  }

  // ---- Draft content ----

  function setDraftContent(sceneId: string, content: string): void {
    setState(produce((s) => {
      const scene = s.scenes.find((sc) => sc.id === sceneId)
      if (scene) scene.content = content
    }))
    markSaving()
    saveContentToServer(sceneId, content)
  }

  // ---- Generation ----

  function startGeneration(sceneId: string): void {
    batch(() => {
      setIsGenerating(true)
      setGeneratingSceneId(sceneId)
      setStreamedContent('')
    })
  }

  function appendStreamContent(text: string): void {
    setStreamedContent((prev) => prev + text)
  }

  function finishGeneration(finalContent: string): void {
    const sceneId = generatingSceneId()
    batch(() => {
      if (sceneId) {
        setState(produce((s) => {
          const scene = s.scenes.find((x) => x.id === sceneId)
          if (scene) {
            scene.status = 'ai_draft'
            scene.content = finalContent
          }
        }))
      }
      setIsGenerating(false)
      setGeneratingSceneId(null)
      setStreamedContent('')
    })
    markSaving()
  }

  function cancelGeneration(): void {
    batch(() => {
      setIsGenerating(false)
      setGeneratingSceneId(null)
      setStreamedContent('')
    })
  }

  // ---- Context value ----

  const value: WorkspaceContextValue = {
    state,
    selectedSceneId,
    selectedCharacterId,
    saveStatus,
    isGenerating,
    generatingSceneId,
    streamedContent,
    projectId: props.projectId,

    selectedScene,
    selectedCharacter,
    scenesForTrack,
    assignedCharacters,
    trackScenes,
    prevScene,
    nextScene,
    draftContent,

    configVersion,

    loadWorkspace,
    addScene,
    updateScene,
    removeScene,
    moveScene,
    markSceneEdited,
    selectScene,
    addTrack,
    updateTrack,
    removeTrack,
    addCharacter,
    updateCharacter,
    removeCharacter,
    selectCharacter,
    addRelationship,
    updateRelationship,
    removeRelationship,
    addConnection,
    removeConnection,
    updateProject: updateProjectAction,
    setDraftContent,
    startGeneration,
    appendStreamContent,
    finishGeneration,
    cancelGeneration,
    setSaveStatus,
  }

  return (
    <WorkspaceContext.Provider value={value}>
      {props.children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within a WorkspaceProvider')
  return ctx
}
