import type { ProblemDetail } from './types'

const BASE_URL =
  typeof import.meta !== 'undefined' && import.meta.env?.['VITE_API_BASE_URL']
    ? (import.meta.env['VITE_API_BASE_URL'] as string)
    : 'http://localhost:8080'

export { BASE_URL }

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

let accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

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

interface RequestOpts {
  body?: unknown | undefined
  query?: Record<string, string | number | undefined> | undefined
  signal?: AbortSignal | undefined
}

async function request<T>(method: string, path: string, opts?: RequestOpts): Promise<T> {
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

  if (res.status === 204) {
    return undefined as T
  }

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

export function get<T>(path: string, query?: Record<string, string | number | undefined>, signal?: AbortSignal): Promise<T> {
  return request<T>('GET', path, { query, signal })
}

export function post<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>('POST', path, { body, signal })
}

export function patch<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>('PATCH', path, { body, signal })
}

export function del<T = void>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>('DELETE', path, { signal })
}
