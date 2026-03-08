import { createSignal } from 'solid-js'
import { setAccessToken, getAccessToken, BASE_URL } from '@/shared/api/client'

// ---- Types ------------------------------------------------------------------

export interface AuthUser {
  id: string
  name: string
  email: string
  profileImageUrl: string | null
}

type AuthState = 'loading' | 'authenticated' | 'unauthenticated'

// ---- Signals ----------------------------------------------------------------

const [authState, setAuthState] = createSignal<AuthState>('loading')
const [user, setUser] = createSignal<AuthUser | null>(null)

// ---- API calls --------------------------------------------------------------

async function fetchMe(): Promise<AuthUser | null> {
  const token = getAccessToken()
  if (!token) return null
  try {
    const res = await fetch(`${BASE_URL}/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    })
    if (!res.ok) return null
    const data = (await res.json()) as { data: AuthUser }
    return data.data
  } catch {
    return null
  }
}

async function refreshToken(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) return null
    const data = (await res.json()) as { data: { accessToken: string } }
    return data.data.accessToken
  } catch {
    return null
  }
}

// ---- Actions ----------------------------------------------------------------

export async function initAuth(): Promise<void> {
  // Try existing token from localStorage
  const stored = localStorage.getItem('narrex_access_token')
  if (stored) {
    setAccessToken(stored)
    const me = await fetchMe()
    if (me) {
      setUser(me)
      setAuthState('authenticated')
      return
    }
  }

  // Try refresh
  const newToken = await refreshToken()
  if (newToken) {
    setAccessToken(newToken)
    localStorage.setItem('narrex_access_token', newToken)
    const me = await fetchMe()
    if (me) {
      setUser(me)
      setAuthState('authenticated')
      return
    }
  }

  setAuthState('unauthenticated')
}

export function loginWithGoogle(): void {
  // Redirect to API's Google OAuth endpoint
  window.location.href = `${BASE_URL}/v1/auth/google`
}

export async function handleOAuthCallback(code: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/v1/auth/google/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      credentials: 'include',
    })
    if (!res.ok) return false
    const data = (await res.json()) as { data: { accessToken: string; user: AuthUser } }
    setAccessToken(data.data.accessToken)
    localStorage.setItem('narrex_access_token', data.data.accessToken)
    setUser(data.data.user)
    setAuthState('authenticated')
    return true
  } catch {
    return false
  }
}

export function logout(): void {
  setAccessToken(null)
  localStorage.removeItem('narrex_access_token')
  setUser(null)
  setAuthState('unauthenticated')
}

// ---- Hooks ------------------------------------------------------------------

export function useAuth() {
  return {
    state: authState,
    user,
    loginWithGoogle,
    logout,
  }
}

export { initAuth as default }
