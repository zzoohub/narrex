export interface PaginationMeta {
  limit: number
  nextCursor: string | null
  hasMore: boolean
}

export interface FieldError {
  field: string
  code: string
  message?: string
}

export interface ProblemDetail {
  type: string
  title: string
  status: number
  detail?: string
  instance?: string
  errors?: FieldError[]
  requestId?: string
}

export interface DataEnvelope<T> {
  data: T
}

export interface ListEnvelope<T> {
  data: T[]
  meta: PaginationMeta
}
