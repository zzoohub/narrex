export type Locale = 'ko' | 'en' | 'es' | 'pt-BR' | 'id' | 'ja'

export type NodeStatus = 'empty' | 'ai-draft' | 'edited' | 'needs-revision'

export type RelationshipType = 'positive' | 'negative' | 'one-way'

export type POV = 'first' | 'third-limited' | 'third-omniscient'

export interface Project {
  id: string
  title: string
  genre: string
  totalScenes: number
  draftedScenes: number
  lastEdited: Date
}

export interface Character {
  id: string
  name: string
  personality: string
  appearance: string
  secrets: string
  motivation: string
  imageUrl?: string
  x: number
  y: number
}

export interface Relationship {
  id: string
  fromId: string
  toId: string
  label: string
  type: RelationshipType
}

export interface TimelineNode {
  id: string
  trackId: string
  title: string
  status: NodeStatus
  characterIds: string[]
  location: string
  moodTags: string[]
  plotSummary: string
  content: string
  position: number
}

export interface Track {
  id: string
  label: string
  nodes: TimelineNode[]
}

export interface StoryConfig {
  genre: string
  theme: string
  era: string
  pov: POV
  moodTags: string[]
}
