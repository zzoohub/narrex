import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createSSEStream } from './sse'
import { ApiError, setAccessToken } from './client'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a ReadableStream from raw SSE text */
function sseStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text))
      controller.close()
    },
  })
}

/** Create a ReadableStream that emits chunks one at a time */
function chunkedSSEStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })
}

/** Collect all events from an async iterable */
async function collectEvents<T>(stream: AsyncIterable<T>): Promise<T[]> {
  const events: T[] = []
  for await (const event of stream) {
    events.push(event)
  }
  return events
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createSSEStream', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    setAccessToken(null)
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    setAccessToken(null)
  })

  it('parses a single token event', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve(new Response(sseStream('event:token\ndata:{"text":"hello"}\n\n'), {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      })),
    )

    const { stream } = createSSEStream('/v1/stream')
    const events = await collectEvents(stream)

    expect(events).toHaveLength(1)
    expect(events[0]!.event).toBe('token')
    expect(events[0]!.data).toEqual({ text: 'hello' })
  })

  it('parses multiple events of different types', async () => {
    const raw = [
      'event:token\ndata:{"text":"Hello"}\n\n',
      'event:token\ndata:{"text":" world"}\n\n',
      'event:completed\ndata:{"draft":"final"}\n\n',
    ].join('')

    mockFetch.mockReturnValue(
      Promise.resolve(new Response(sseStream(raw), {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      })),
    )

    const { stream } = createSSEStream('/v1/stream')
    const events = await collectEvents(stream)

    expect(events).toHaveLength(3)
    expect(events[0]!.event).toBe('token')
    expect(events[1]!.event).toBe('token')
    expect(events[2]!.event).toBe('completed')
    expect(events[2]!.data).toEqual({ draft: 'final' })
  })

  it('defaults event type to token when no event: line', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve(new Response(sseStream('data:{"text":"hi"}\n\n'), {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      })),
    )

    const { stream } = createSSEStream('/v1/stream')
    const events = await collectEvents(stream)

    expect(events).toHaveLength(1)
    expect(events[0]!.event).toBe('token')
  })

  it('ignores comment lines starting with colon', async () => {
    const raw = ':comment\nevent:token\ndata:{"text":"hi"}\n\n'
    mockFetch.mockReturnValue(
      Promise.resolve(new Response(sseStream(raw), {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      })),
    )

    const { stream } = createSSEStream('/v1/stream')
    const events = await collectEvents(stream)

    expect(events).toHaveLength(1)
    expect(events[0]!.data).toEqual({ text: 'hi' })
  })

  it('falls back to raw string when JSON parse fails', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve(new Response(sseStream('data:not json\n\n'), {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      })),
    )

    const { stream } = createSSEStream('/v1/stream')
    const events = await collectEvents(stream)

    expect(events).toHaveLength(1)
    expect(events[0]!.data).toBe('not json')
  })

  it('handles chunked delivery across boundaries', async () => {
    // Split the SSE data into chunks that break across line boundaries
    const chunks = [
      'event:tok',
      'en\ndata:{"text":"h',
      'ello"}\n\n',
    ]

    mockFetch.mockReturnValue(
      Promise.resolve(new Response(chunkedSSEStream(chunks), {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      })),
    )

    const { stream } = createSSEStream('/v1/stream')
    const events = await collectEvents(stream)

    expect(events).toHaveLength(1)
    expect(events[0]!.event).toBe('token')
    expect(events[0]!.data).toEqual({ text: 'hello' })
  })

  it('flushes remaining data at end of stream when terminated with newline', async () => {
    // Data line completed (ends with \n) but no trailing empty line dispatch
    mockFetch.mockReturnValue(
      Promise.resolve(new Response(sseStream('event:completed\ndata:{"done":true}\n'), {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      })),
    )

    const { stream } = createSSEStream('/v1/stream')
    const events = await collectEvents(stream)

    expect(events).toHaveLength(1)
    expect(events[0]!.event).toBe('completed')
    expect(events[0]!.data).toEqual({ done: true })
  })

  it('does not flush when data line is incomplete (no trailing newline)', async () => {
    // The data line itself has no trailing \n, so it stays in buffer
    // and never gets added to dataLines -- no event emitted
    mockFetch.mockReturnValue(
      Promise.resolve(new Response(sseStream('event:completed\ndata:{"done":true}'), {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      })),
    )

    const { stream } = createSSEStream('/v1/stream')
    const events = await collectEvents(stream)

    // Incomplete line stays in buffer, dataLines is empty, nothing flushed
    expect(events).toHaveLength(0)
  })

  it('handles multi-line data fields', async () => {
    const raw = 'event:token\ndata:line1\ndata:line2\n\n'
    mockFetch.mockReturnValue(
      Promise.resolve(new Response(sseStream(raw), {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      })),
    )

    const { stream } = createSSEStream('/v1/stream')
    const events = await collectEvents(stream)

    expect(events).toHaveLength(1)
    // multi-line data is joined with newlines
    expect(events[0]!.data).toBe('line1\nline2')
  })

  it('skips empty events (empty line with no data)', async () => {
    // Two empty lines in a row should not produce an event
    const raw = '\n\nevent:token\ndata:{"text":"hi"}\n\n'
    mockFetch.mockReturnValue(
      Promise.resolve(new Response(sseStream(raw), {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      })),
    )

    const { stream } = createSSEStream('/v1/stream')
    const events = await collectEvents(stream)

    expect(events).toHaveLength(1)
  })

  it('resets event type to token after dispatch', async () => {
    const raw = 'event:error\ndata:{"message":"oops"}\n\ndata:{"text":"ok"}\n\n'
    mockFetch.mockReturnValue(
      Promise.resolve(new Response(sseStream(raw), {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      })),
    )

    const { stream } = createSSEStream('/v1/stream')
    const events = await collectEvents(stream)

    expect(events).toHaveLength(2)
    expect(events[0]!.event).toBe('error')
    expect(events[1]!.event).toBe('token') // reset to default
  })

  // ---- Error handling ----

  it('throws ApiError on non-ok response with JSON body', async () => {
    const problem = { type: 'about:blank', title: 'Forbidden', status: 403 }
    mockFetch.mockReturnValue(
      Promise.resolve(new Response(JSON.stringify(problem), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      })),
    )

    const { stream } = createSSEStream('/v1/stream')
    try {
      await collectEvents(stream)
      expect.fail('Expected ApiError')
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError)
      expect((e as ApiError).status).toBe(403)
      expect((e as ApiError).problem).toEqual(problem)
    }
  })

  it('throws ApiError with null problem when error body is not JSON', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve(new Response('error', {
        status: 500,
        headers: { 'content-type': 'text/plain' },
      })),
    )

    const { stream } = createSSEStream('/v1/stream')
    try {
      await collectEvents(stream)
      expect.fail('Expected ApiError')
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError)
      expect((e as ApiError).problem).toBeNull()
    }
  })

  it('throws Error when response body is null', async () => {
    // Create a Response without a body
    const res = new Response(null, { status: 200, headers: { 'content-type': 'text/event-stream' } })
    // Override body to be null
    Object.defineProperty(res, 'body', { value: null })
    mockFetch.mockReturnValue(Promise.resolve(res))

    const { stream } = createSSEStream('/v1/stream')
    await expect(collectEvents(stream)).rejects.toThrow('Response body is null')
  })

  // ---- Request configuration ----

  it('defaults to POST method', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve(new Response(sseStream('data:ok\n\n'), {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      })),
    )

    const { stream } = createSSEStream('/v1/stream')
    await collectEvents(stream)

    expect(mockFetch.mock.calls[0]![1].method).toBe('POST')
  })

  it('uses specified method', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve(new Response(sseStream('data:ok\n\n'), {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      })),
    )

    const { stream } = createSSEStream('/v1/stream', { method: 'GET' })
    await collectEvents(stream)

    expect(mockFetch.mock.calls[0]![1].method).toBe('GET')
  })

  it('sends Accept: text/event-stream header', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve(new Response(sseStream('data:ok\n\n'), {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      })),
    )

    const { stream } = createSSEStream('/v1/stream')
    await collectEvents(stream)

    const init = mockFetch.mock.calls[0]![1] as RequestInit
    expect((init.headers as Record<string, string>)['Accept']).toBe('text/event-stream')
  })

  it('includes Authorization header when token is set', async () => {
    setAccessToken('tok_sse')
    mockFetch.mockReturnValue(
      Promise.resolve(new Response(sseStream('data:ok\n\n'), {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      })),
    )

    const { stream } = createSSEStream('/v1/stream')
    await collectEvents(stream)

    const init = mockFetch.mock.calls[0]![1] as RequestInit
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer tok_sse')
  })

  it('sends JSON body when provided', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve(new Response(sseStream('data:ok\n\n'), {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      })),
    )

    const { stream } = createSSEStream('/v1/stream', { body: { prompt: 'test' } })
    await collectEvents(stream)

    const init = mockFetch.mock.calls[0]![1] as RequestInit
    expect(init.body).toBe(JSON.stringify({ prompt: 'test' }))
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })

  // ---- Abort ----

  it('provides abort function that aborts the fetch', () => {
    mockFetch.mockReturnValue(new Promise(() => {})) // never resolves
    const { abort } = createSSEStream('/v1/stream')
    // Should not throw
    expect(() => abort()).not.toThrow()
  })

  // ---- Error handling for problem+json ----

  it('throws ApiError on non-ok with application/problem+json', async () => {
    const problem = { type: 'about:blank', title: 'Bad Request', status: 400 }
    mockFetch.mockReturnValue(
      Promise.resolve(new Response(JSON.stringify(problem), {
        status: 400,
        headers: { 'content-type': 'application/problem+json' },
      })),
    )

    const { stream } = createSSEStream('/v1/stream')
    try {
      await collectEvents(stream)
      expect.fail('Expected ApiError')
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError)
      expect((e as ApiError).status).toBe(400)
    }
  })

  it('handles broken JSON in error response gracefully', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve(new Response('not-json', {
        status: 422,
        headers: { 'content-type': 'application/json' },
      })),
    )

    const { stream } = createSSEStream('/v1/stream')
    try {
      await collectEvents(stream)
      expect.fail('Expected ApiError')
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError)
      expect((e as ApiError).problem).toBeNull()
    }
  })
})
