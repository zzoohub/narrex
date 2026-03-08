// ---------------------------------------------------------------------------
// Generic SSE streaming utilities — domain-free
// ---------------------------------------------------------------------------
// Uses fetch + ReadableStream (not EventSource) per design doc.
// Returns an async iterable of parsed SSE events.
// ---------------------------------------------------------------------------

import { ApiError, getAccessToken, BASE_URL } from './client'

// ---- Types ----------------------------------------------------------------

export type SSEEventType =
  | 'token'
  | 'completed'
  | 'error'
  | 'progress'
  | 'clarification'

export interface SSEEvent<T = unknown> {
  event: SSEEventType
  data: T
}

export interface SSEStream<T = unknown> {
  /** Async iterable of parsed SSE events. */
  stream: AsyncIterable<SSEEvent<T>>
  /** Abort the underlying fetch request. */
  abort: () => void
}

// ---- SSE event payload shapes ---------------------------------------------

export interface SSETokenEvent {
  text: string
}

export interface SSECompletedEvent<T = unknown> {
  draft?: unknown
  data?: T
}

export interface SSEErrorEvent {
  message: string
}

export interface SSEProgressEvent {
  message: string
}

export interface SSEClarificationEvent {
  questions: Array<{ question: string; field: string }>
}

// ---- SSE parser -----------------------------------------------------------

/**
 * Parse an SSE byte stream into structured events.
 *
 * Handles the SSE protocol:
 * - Lines starting with `event:` set the event type
 * - Lines starting with `data:` append to the data buffer
 * - Empty lines dispatch the buffered event
 * - Lines starting with `:` are comments (ignored)
 */
async function* parseSSE<T = unknown>(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<SSEEvent<T>> {
  const decoder = new TextDecoder()
  let buffer = ''
  let eventType: SSEEventType = 'token'
  let dataLines: string[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    // Keep incomplete last line in buffer
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (line === '') {
        // Dispatch event
        if (dataLines.length > 0) {
          const rawData = dataLines.join('\n')
          let parsed: T
          try {
            parsed = JSON.parse(rawData) as T
          } catch {
            parsed = rawData as T
          }
          yield { event: eventType, data: parsed }
        }
        // Reset for next event
        eventType = 'token'
        dataLines = []
      } else if (line.startsWith('event:')) {
        eventType = line.slice(6).trim() as SSEEventType
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart())
      }
      // Lines starting with ':' are comments — skip
    }
  }

  // Flush remaining
  if (dataLines.length > 0) {
    const rawData = dataLines.join('\n')
    let parsed: T
    try {
      parsed = JSON.parse(rawData) as T
    } catch {
      parsed = rawData as T
    }
    yield { event: eventType, data: parsed }
  }
}

// ---- Core SSE fetch -------------------------------------------------------

export function createSSEStream<T = unknown>(
  path: string,
  opts?: { method?: 'GET' | 'POST'; body?: unknown },
): SSEStream<T> {
  const controller = new AbortController()
  const method = opts?.method ?? 'POST'

  const headers: Record<string, string> = {
    Accept: 'text/event-stream',
  }

  const token = getAccessToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const init: RequestInit = {
    method,
    headers,
    credentials: 'include',
    signal: controller.signal,
  }

  if (opts?.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(opts.body)
  }

  const url = new URL(path, BASE_URL).toString()

  async function* iterate(): AsyncGenerator<SSEEvent<T>> {
    const res = await fetch(url, init)

    if (!res.ok) {
      const contentType = res.headers.get('content-type') ?? ''
      let problem = null
      if (
        contentType.includes('application/json') ||
        contentType.includes('application/problem+json')
      ) {
        try {
          problem = await res.json()
        } catch {
          // ignore
        }
      }
      throw new ApiError(res.status, problem)
    }

    if (!res.body) {
      throw new Error('Response body is null — SSE streaming not supported')
    }

    const reader = res.body.getReader()
    try {
      yield* parseSSE<T>(reader)
    } finally {
      reader.releaseLock()
    }
  }

  return {
    stream: { [Symbol.asyncIterator]: iterate },
    abort: () => controller.abort(),
  }
}
