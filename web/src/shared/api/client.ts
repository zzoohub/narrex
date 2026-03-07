// ---------------------------------------------------------------------------
// Base HTTP client — domain-free
// ---------------------------------------------------------------------------

import type { ProblemDetail } from './types'

// ---- Configuration --------------------------------------------------------

const BASE_URL =
  typeof import.meta !== 'undefined' && import.meta.env?.['VITE_API_BASE_URL']
    ? (import.meta.env['VITE_API_BASE_URL'] as string)
    : 'http://localhost:8080'

export { BASE_URL }

// ---- Error types ----------------------------------------------------------

export class ApiError extends Error {
  readonly status: number
  readonly problem: ProblemDetail | null

  constructor(status: number, problem: ProblemDetail | null, message?: string) {
    super(message ?? problem?.detail ?? problem?.title ?? `API error ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.problem = problem
  }

  get isUnauthorized(): boolean {
    return this.status === 401
  }

  get isNotFound(): boolean {
    return this.status === 404
  }

  get isValidation(): boolean {
    return this.status === 422
  }

  get isRateLimited(): boolean {
    return this.status === 429
  }
}

// ---- Token management -----------------------------------------------------

let accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

// ---- Core fetch helpers ---------------------------------------------------

function buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
  const url = new URL(path, BASE_URL)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    }
  }
  return url.toString()
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }
  return headers
}

async function request<T>(method: string, path: string, opts?: { body?: unknown; query?: Record<string, string | number | undefined>; signal?: AbortSignal }): Promise<T> {
  const url = buildUrl(path, opts?.query)
  const headers = buildHeaders()

  const init: RequestInit = {
    method,
    headers,
    credentials: 'include',
    signal: opts?.signal ?? null,
  }

  if (opts?.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(opts.body)
  }

  const res = await fetch(url, init)

  // 204 No Content
  if (res.status === 204) {
    return undefined as T
  }

  // Parse body
  const contentType = res.headers.get('content-type') ?? ''
  const isJson =
    contentType.includes('application/json') ||
    contentType.includes('application/problem+json')

  if (!res.ok) {
    let problem: ProblemDetail | null = null
    if (isJson) {
      try {
        problem = (await res.json()) as ProblemDetail
      } catch {
        // ignore parse errors
      }
    }
    throw new ApiError(res.status, problem)
  }

  if (isJson) {
    return (await res.json()) as T
  }

  return undefined as T
}

// Shorthand helpers
export function get<T>(path: string, query?: Record<string, string | number | undefined>, signal?: AbortSignal): Promise<T> {
  const opts: { query?: Record<string, string | number | undefined>; signal?: AbortSignal } = {}
  if (query) opts.query = query
  if (signal) opts.signal = signal
  return request<T>('GET', path, opts)
}

export function post<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const opts: { body?: unknown; signal?: AbortSignal } = { body }
  if (signal) opts.signal = signal
  return request<T>('POST', path, opts)
}

export function patch<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const opts: { body: unknown; signal?: AbortSignal } = { body }
  if (signal) opts.signal = signal
  return request<T>('PATCH', path, opts)
}

export function del<T = void>(path: string, signal?: AbortSignal): Promise<T> {
  const opts: { signal?: AbortSignal } = {}
  if (signal) opts.signal = signal
  return request<T>('DELETE', path, opts)
}
