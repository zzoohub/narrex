export type SceneStatus = 'empty' | 'ai_draft' | 'edited' | 'needs_revision'

export interface Scene {
  id: string
  trackId: string
  projectId: string
  startPosition: number
  duration: number
  status: SceneStatus
  title: string
  plotSummary: string | null
  location: string | null
  moodTags: string[]
  content: string | null
  characterIds: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateSceneRequest {
  trackId: string
  title: string
  startPosition?: number
  duration?: number
  plotSummary?: string
  location?: string
  moodTags?: string[]
  characterIds?: string[]
}

export interface UpdateSceneRequest {
  trackId?: string
  title?: string
  startPosition?: number
  duration?: number
  plotSummary?: string | null
  location?: string | null
  moodTags?: string[]
  content?: string | null
  characterIds?: string[]
}
