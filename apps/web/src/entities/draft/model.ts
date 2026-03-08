export type DraftSource = 'ai_generation' | 'ai_edit' | 'manual'

export interface Draft {
  id: string
  sceneId: string
  version: number
  content: string
  charCount: number
  source: DraftSource
  editDirection: string | null
  model: string | null
  provider: string | null
  tokenCountInput: number | null
  tokenCountOutput: number | null
  createdAt: string
}

export interface DraftSummary {
  id: string
  version: number
  charCount: number
  source: DraftSource
  editDirection: string | null
  createdAt: string
}

export interface CreateDraftRequest {
  content: string
}

export interface EditDraftRequest {
  content: string
  selectedText?: string | null
  direction: string
}
