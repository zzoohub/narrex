import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ApiError, setAccessToken, getAccessToken, get, post, patch, del } from './client'

// ---------------------------------------------------------------------------
// ApiError
// ---------------------------------------------------------------------------

describe('ApiError', () => {
  it('uses explicit message when provided', () => {
    const err = new ApiError(500, null, 'custom message')
    expect(err.message).toBe('custom message')
    expect(err.status).toBe(500)
    expect(err.problem).toBeNull()
    expect(err.name).toBe('ApiError')
  })

  it('falls back to problem.detail', () => {
    const problem = { type: 'about:blank', title: 'Not Found', status: 404, detail: 'User 42 not found' }
    const err = new ApiError(404, problem)
    expect(err.message).toBe('User 42 not found')
  })

  it('falls back to problem.title when detail is missing', () => {
    const problem = { type: 'about:blank', title: 'Forbidden', status: 403 }
    const err = new ApiError(403, problem)
    expect(err.message).toBe('Forbidden')
  })

  it('falls back to generic message when problem is null', () => {
    const err = new ApiError(503, null)
    expect(err.message).toBe('API error 503')
  })

  it('isUnauthorized returns true for 401', () => {
    expect(new ApiError(401, null).isUnauthorized).toBe(true)
    expect(new ApiError(403, null).isUnauthorized).toBe(false)
  })

  it('isNotFound returns true for 404', () => {
    expect(new ApiError(404, null).isNotFound).toBe(true)
    expect(new ApiError(500, null).isNotFound).toBe(false)
  })

  it('isValidation returns true for 422', () => {
    expect(new ApiError(422, null).isValidation).toBe(true)
    expect(new ApiError(400, null).isValidation).toBe(false)
  })

  it('isRateLimited returns true for 429', () => {
    expect(new ApiError(429, null).isRateLimited).toBe(true)
    expect(new ApiError(500, null).isRateLimited).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

describe('token management', () => {
  afterEach(() => {
    setAccessToken(null)
  })

  it('defaults to null', () => {
    setAccessToken(null)
    expect(getAccessToken()).toBeNull()
  })

  it('stores and retrieves a token', () => {
    setAccessToken('abc123')
    expect(getAccessToken()).toBe('abc123')
  })

  it('clears the token', () => {
    setAccessToken('abc123')
    setAccessToken(null)
    expect(getAccessToken()).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// HTTP helpers (get, post, patch, del)
// ---------------------------------------------------------------------------

describe('HTTP helpers', () => {
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

  function jsonResponse(body: unknown, status = 200) {
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    )
  }

  function problemResponse(body: unknown, status: number) {
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/problem+json' },
      }),
    )
  }

  // ---- buildUrl (tested through helpers) ----

  it('get() builds correct URL with base and path', async () => {
    mockFetch.mockReturnValue(jsonResponse({ ok: true }))
    await get('/v1/test')
    const url = mockFetch.mock.calls[0]![0] as string
    expect(url).toBe('http://localhost:8080/v1/test')
  })

  it('get() appends query params, skipping undefined', async () => {
    mockFetch.mockReturnValue(jsonResponse({ ok: true }))
    await get('/v1/test', { page: '1', limit: 10, cursor: undefined })
    const url = new URL(mockFetch.mock.calls[0]![0] as string)
    expect(url.searchParams.get('page')).toBe('1')
    expect(url.searchParams.get('limit')).toBe('10')
    expect(url.searchParams.has('cursor')).toBe(false)
  })

  // ---- buildHeaders ----

  it('includes Accept header', async () => {
    mockFetch.mockReturnValue(jsonResponse({}))
    await get('/v1/test')
    const init = mockFetch.mock.calls[0]![1] as RequestInit
    expect((init.headers as Record<string, string>)['Accept']).toBe('application/json')
  })

  it('includes Authorization header when token is set', async () => {
    setAccessToken('tok_xyz')
    mockFetch.mockReturnValue(jsonResponse({}))
    await get('/v1/test')
    const init = mockFetch.mock.calls[0]![1] as RequestInit
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer tok_xyz')
  })

  it('omits Authorization header when no token', async () => {
    mockFetch.mockReturnValue(jsonResponse({}))
    await get('/v1/test')
    const init = mockFetch.mock.calls[0]![1] as RequestInit
    expect((init.headers as Record<string, string>)['Authorization']).toBeUndefined()
  })

  // ---- Methods ----

  it('get() sends GET request', async () => {
    mockFetch.mockReturnValue(jsonResponse({}))
    await get('/v1/items')
    expect(mockFetch.mock.calls[0]![1].method).toBe('GET')
  })

  it('post() sends POST with JSON body', async () => {
    mockFetch.mockReturnValue(jsonResponse({ id: '1' }))
    await post('/v1/items', { name: 'test' })
    const init = mockFetch.mock.calls[0]![1] as RequestInit
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify({ name: 'test' }))
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })

  it('patch() sends PATCH with JSON body', async () => {
    mockFetch.mockReturnValue(jsonResponse({ id: '1' }))
    await patch('/v1/items/1', { name: 'updated' })
    const init = mockFetch.mock.calls[0]![1] as RequestInit
    expect(init.method).toBe('PATCH')
    expect(init.body).toBe(JSON.stringify({ name: 'updated' }))
  })

  it('del() sends DELETE request', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve(new Response(null, { status: 204 })),
    )
    await del('/v1/items/1')
    expect(mockFetch.mock.calls[0]![1].method).toBe('DELETE')
  })

  // ---- Response handling ----

  it('returns undefined for 204 No Content', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve(new Response(null, { status: 204 })),
    )
    const result = await del('/v1/items/1')
    expect(result).toBeUndefined()
  })

  it('parses JSON response on success', async () => {
    mockFetch.mockReturnValue(jsonResponse({ data: { id: '1', name: 'Test' } }))
    const result = await get<{ data: { id: string; name: string } }>('/v1/items/1')
    expect(result.data.id).toBe('1')
    expect(result.data.name).toBe('Test')
  })

  it('returns undefined for non-JSON success response', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve(new Response('OK', { status: 200, headers: { 'content-type': 'text/plain' } })),
    )
    const result = await get('/v1/health')
    expect(result).toBeUndefined()
  })

  // ---- Error handling ----

  it('throws ApiError with problem detail on error', async () => {
    const problem = { type: 'about:blank', title: 'Not Found', status: 404, detail: 'User not found' }
    mockFetch.mockReturnValue(problemResponse(problem, 404))

    try {
      await get('/v1/users/999')
      expect.fail('Expected ApiError to be thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError)
      const err = e as ApiError
      expect(err.status).toBe(404)
      expect(err.problem).toEqual(problem)
      expect(err.isNotFound).toBe(true)
    }
  })

  it('throws ApiError with null problem when error body is not JSON', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve(new Response('Internal Server Error', {
        status: 500,
        headers: { 'content-type': 'text/plain' },
      })),
    )

    try {
      await get('/v1/broken')
    } catch (e) {
      const err = e as ApiError
      expect(err.status).toBe(500)
      expect(err.problem).toBeNull()
    }
  })

  it('throws ApiError with null problem when JSON parse fails', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve(new Response('not json', {
        status: 400,
        headers: { 'content-type': 'application/json' },
      })),
    )

    try {
      await get('/v1/broken')
    } catch (e) {
      const err = e as ApiError
      expect(err.status).toBe(400)
      expect(err.problem).toBeNull()
    }
  })

  // ---- Signal support ----

  it('passes AbortSignal to fetch', async () => {
    mockFetch.mockReturnValue(jsonResponse({}))
    const controller = new AbortController()
    await get('/v1/test', undefined, controller.signal)
    const init = mockFetch.mock.calls[0]![1] as RequestInit
    expect(init.signal).toBe(controller.signal)
  })

  // ---- Credentials ----

  it('always includes credentials: include', async () => {
    mockFetch.mockReturnValue(jsonResponse({}))
    await get('/v1/test')
    const init = mockFetch.mock.calls[0]![1] as RequestInit
    expect(init.credentials).toBe('include')
  })

  // ---- Signal passing for post, patch, del ----

  it('post() passes AbortSignal to fetch', async () => {
    mockFetch.mockReturnValue(jsonResponse({ ok: true }))
    const controller = new AbortController()
    await post('/v1/items', { name: 'test' }, controller.signal)
    const init = mockFetch.mock.calls[0]![1] as RequestInit
    expect(init.signal).toBe(controller.signal)
  })

  it('patch() passes AbortSignal to fetch', async () => {
    mockFetch.mockReturnValue(jsonResponse({ ok: true }))
    const controller = new AbortController()
    await patch('/v1/items/1', { name: 'updated' }, controller.signal)
    const init = mockFetch.mock.calls[0]![1] as RequestInit
    expect(init.signal).toBe(controller.signal)
  })

  it('del() passes AbortSignal to fetch', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve(new Response(null, { status: 204 })),
    )
    const controller = new AbortController()
    await del('/v1/items/1', controller.signal)
    const init = mockFetch.mock.calls[0]![1] as RequestInit
    expect(init.signal).toBe(controller.signal)
  })

  // ---- Response with empty content-type ----

  it('handles response with no content-type header', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve(new Response(null, { status: 200 })),
    )
    const result = await get('/v1/test')
    expect(result).toBeUndefined()
  })
})
