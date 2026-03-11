import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRoot } from 'solid-js'

// Mock API calls
vi.mock('@/shared/api/client', () => ({
  setAccessToken: vi.fn(),
  getAccessToken: vi.fn(() => null),
  BASE_URL: 'http://localhost:8080',
  post: vi.fn(),
  patch: vi.fn(),
  del: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, _problem: any) {
      super('ApiError')
      this.status = status
    }
  },
}))

describe('auth store – isGuest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('useAuth exposes isGuest accessor', async () => {
    const { useAuth } = await import('./auth')
    createRoot((dispose) => {
      const auth = useAuth()
      expect(typeof auth.isGuest).toBe('function')
      dispose()
    })
  })

  it('isGuest is true initially (fail-closed default)', async () => {
    const { useAuth } = await import('./auth')
    createRoot((dispose) => {
      const auth = useAuth()
      expect(auth.isGuest()).toBe(true)
      dispose()
    })
  })

  it('initAuth sets isGuest to true when unauthenticated', async () => {
    const { useAuth, initAuth } = await import('./auth')
    await createRoot(async (dispose) => {
      const auth = useAuth()
      await initAuth()
      expect(auth.state()).toBe('unauthenticated')
      expect(auth.isGuest()).toBe(true)
      dispose()
    })
  })

  it('handleOAuthCallback clears isGuest on successful login', async () => {
    const { useAuth, handleOAuthCallback } = await import('./auth')
    // Mock successful callback
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          accessToken: 'test-token',
          user: { id: 'u1', displayName: 'Test', email: 'test@test.com', profileImageUrl: null, themePreference: 'system', languagePreference: 'ko' },
        },
      }),
    } as Response)

    await createRoot(async (dispose) => {
      const auth = useAuth()
      const result = await handleOAuthCallback('test-code')
      expect(result).toBe(true)
      expect(auth.state()).toBe('authenticated')
      expect(auth.isGuest()).toBe(false)
      dispose()
    })
  })

  it('logout re-enters guest mode', async () => {
    const { useAuth, handleOAuthCallback, logout } = await import('./auth')

    // First login
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          accessToken: 'test-token',
          user: { id: 'u1', displayName: 'Test', email: 'test@test.com', profileImageUrl: null, themePreference: 'system', languagePreference: 'ko' },
        },
      }),
    } as Response)

    await createRoot(async (dispose) => {
      const auth = useAuth()
      await handleOAuthCallback('test-code')
      expect(auth.isGuest()).toBe(false)

      // Mock logout API (may fail, that's ok)
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('ignored'))
      await logout()
      expect(auth.state()).toBe('unauthenticated')
      expect(auth.isGuest()).toBe(true)
      dispose()
    })
  })
})
