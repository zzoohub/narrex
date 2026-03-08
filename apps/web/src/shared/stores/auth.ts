import { createSignal } from 'solid-js'
import { setAccessToken, getAccessToken, BASE_URL, post, patch, del, ApiError } from '@/shared/api/client'

// ---- Types ------------------------------------------------------------------

export interface AuthUser {
  id: string
  name: string
  email: string
  profileImageUrl: string | null
  themePreference: string
  languagePreference: string
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
  // Try in-memory token first (e.g. after refresh within the same session).
  if (getAccessToken()) {
    const me = await fetchMe()
    if (me) {
      setUser(me)
      setAuthState('authenticated')
      return
    }
  }

  // Acquire token via httpOnly refresh cookie (no localStorage).
  const newToken = await refreshToken()
  if (newToken) {
    setAccessToken(newToken)
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
    setUser(data.data.user)
    setAuthState('authenticated')
    return true
  } catch {
    return false
  }
}

export async function logout(): Promise<void> {
  try {
    await post('/v1/auth/logout')
  } catch {
    // ignore — clear local state regardless
  }
  setAccessToken(null)
  setUser(null)
  setAuthState('unauthenticated')
}

export async function deleteAccount(): Promise<void> {
  await del('/v1/auth/me')
  setAccessToken(null)
  setUser(null)
  setAuthState('unauthenticated')
}

export async function updateProfile(data: {
  displayName?: string | null
  themePreference?: string
  languagePreference?: string
}): Promise<AuthUser> {
  const res = await patch<{ data: AuthUser }>('/v1/auth/me', data)
  setUser(res.data)
  return res.data
}

export async function uploadAvatar(file: File): Promise<AuthUser> {
  const formData = new FormData()
  formData.append('avatar', file)

  const token = getAccessToken()
  const res = await fetch(`${BASE_URL}/v1/auth/me/avatar`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
    body: formData,
  })

  if (!res.ok) {
    const problem = await res.json().catch(() => null)
    throw new ApiError(res.status, problem)
  }

  const data = (await res.json()) as { data: AuthUser }
  setUser(data.data)
  return data.data
}

// ---- Hooks ------------------------------------------------------------------

export function useAuth() {
  return {
    state: authState,
    user,
    loginWithGoogle,
    logout,
    deleteAccount,
    updateProfile,
    uploadAvatar,
  }
}

export { initAuth as default }
