import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot } from 'solid-js'
import { useTheme, type ThemePreference } from './theme'

describe('useTheme', () => {
  let cleanup: (() => void) | undefined

  afterEach(() => {
    cleanup?.()
    cleanup = undefined
    try {
      window.localStorage.removeItem('narrex-theme')
    } catch {
      // ignore
    }
    document.documentElement.classList.remove('dark', 'light')
    vi.restoreAllMocks()
  })

  it('returns theme, preference, setPreference, and toggle', () => {
    createRoot((dispose) => {
      cleanup = dispose
      const result = useTheme()
      expect(typeof result.theme).toBe('function')
      expect(typeof result.preference).toBe('function')
      expect(typeof result.setPreference).toBe('function')
      expect(typeof result.toggle).toBe('function')
    })
  })

  it('theme() returns a valid resolved theme value', () => {
    createRoot((dispose) => {
      cleanup = dispose
      const { theme } = useTheme()
      expect(['dark', 'light']).toContain(theme())
    })
  })

  it('setPreference changes the preference signal', () => {
    createRoot((dispose) => {
      cleanup = dispose
      const { preference, setPreference } = useTheme()
      setPreference('light')
      expect(preference()).toBe('light')
      setPreference('dark')
      expect(preference()).toBe('dark')
      setPreference('system')
      expect(preference()).toBe('system')
    })
  })

  it('toggle changes the resolved theme', () => {
    // Use separate createRoot calls to allow effects to flush between them
    let setPreferenceFn: ((p: ThemePreference) => void) | undefined
    let toggleFn: (() => void) | undefined
    let themeFn: (() => 'light' | 'dark') | undefined

    createRoot((dispose) => {
      cleanup = dispose
      const { theme, setPreference, toggle } = useTheme()
      setPreferenceFn = setPreference
      toggleFn = toggle
      themeFn = theme
      setPreference('dark')
    })

    // After createRoot, effects have flushed, so resolvedTheme should be 'dark'
    expect(themeFn!()).toBe('dark')

    toggleFn!()
    // toggle sets preference to 'light' (since resolved was dark)
    // The effect re-runs synchronously when signal changes outside batch
    expect(themeFn!()).toBe('light')

    toggleFn!()
    expect(themeFn!()).toBe('dark')
  })

  it('effect applies dark class and persists to localStorage when dark', () => {
    createRoot((dispose) => {
      cleanup = dispose
      const { setPreference } = useTheme()
      setPreference('dark')
    })

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(window.localStorage.getItem('narrex-theme')).toBe('dark')
  })

  it('effect removes dark class and persists when set to light', () => {
    let setPreferenceFn: ((p: ThemePreference) => void) | undefined

    createRoot((dispose) => {
      cleanup = dispose
      const { setPreference } = useTheme()
      setPreferenceFn = setPreference
      setPreference('dark')
    })

    expect(document.documentElement.classList.contains('dark')).toBe(true)

    setPreferenceFn!('light')

    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(window.localStorage.getItem('narrex-theme')).toBe('light')
  })
})
