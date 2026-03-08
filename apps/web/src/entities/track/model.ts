export interface Track {
  id: string
  projectId: string
  position: number
  label: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateTrackRequest {
  label?: string
  position?: number
}

export interface UpdateTrackRequest {
  label?: string | null
  position?: number
}
