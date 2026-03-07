export type PovType = 'first_person' | 'third_limited' | 'third_omniscient'
export type ProjectSourceType = 'text' | 'file' | null

export interface Project {
  id: string
  title: string
  genre: string | null
  theme: string | null
  eraLocation: string | null
  pov: PovType | null
  tone: string | null
  sourceType: ProjectSourceType
  createdAt: string
  updatedAt: string
}

export interface ProjectSummary {
  id: string
  title: string
  genre: string | null
  createdAt: string
  updatedAt: string
}

export interface UpdateProjectRequest {
  title?: string
  genre?: string | null
  theme?: string | null
  eraLocation?: string | null
  pov?: PovType | null
  tone?: string | null
}
