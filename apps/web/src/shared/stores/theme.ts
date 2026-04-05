import { createSignal, createEffect, onCleanup } from 'solid-js'

export type ThemePreference = 'system' | 'light' | 'dark'
type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'narrex-theme'

function getInitialPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'system' || stored === 'light' || stored === 'dark') return stored
  return 'system'
}

function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref === 'system') {
    if (typeof window === 'undefined') return 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return pref
}

const [preference, setPreference] = createSignal<ThemePreference>(getInitialPreference())
const [resolvedTheme, setResolvedTheme] = createSignal<ResolvedTheme>(resolveTheme(getInitialPreference()))

export function useTheme() {
  createEffect(() => {
    const pref = preference()
    setResolvedTheme(resolveTheme(pref))

    if (pref === 'system' && typeof window !== 'undefined') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = (e: MediaQueryListEvent) => setResolvedTheme(e.matches ? 'dark' : 'light')
      mql.addEventListener('change', handler)
      onCleanup(() => mql.removeEventListener('change', handler))
    }
  })

  createEffect(() => {
    const t = resolvedTheme()
    if (typeof document === 'undefined') return
    document.documentElement.classList.toggle('dark', t === 'dark')
    localStorage.setItem(STORAGE_KEY, preference())
  })

  const toggle = () => setPreference(p => resolveTheme(p) === 'dark' ? 'light' : 'dark')

  return { theme: resolvedTheme, preference, setPreference, toggle }
}
