import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot } from 'solid-js'
import { useTheme } from './theme'

describe('useTheme', () => {
  // Hold a dispose function to clean up after each test
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

  it('returns theme, setTheme, and toggle', () => {
    createRoot((dispose) => {
      cleanup = dispose
      const result = useTheme()
      expect(typeof result.theme).toBe('function')
      expect(typeof result.setTheme).toBe('function')
      expect(typeof result.toggle).toBe('function')
    })
  })

  it('theme() returns a valid theme value', () => {
    createRoot((dispose) => {
      cleanup = dispose
      const { theme } = useTheme()
      expect(['dark', 'light']).toContain(theme())
    })
  })

  it('setTheme changes the theme signal', () => {
    createRoot((dispose) => {
      cleanup = dispose
      const { theme, setTheme } = useTheme()
      setTheme('light')
      expect(theme()).toBe('light')
      setTheme('dark')
      expect(theme()).toBe('dark')
    })
  })

  it('toggle alternates between dark and light', () => {
    createRoot((dispose) => {
      cleanup = dispose
      const { theme, setTheme, toggle } = useTheme()
      setTheme('dark')
      toggle()
      expect(theme()).toBe('light')
      toggle()
      expect(theme()).toBe('dark')
    })
  })

  it('effect applies dark class and persists to localStorage when dark', () => {
    // Store the setTheme reference so we can call it, then verify
    // side effects after createRoot returns (when effects have flushed)
    let setThemeFn: ((t: 'light' | 'dark') => void) | undefined

    createRoot((dispose) => {
      cleanup = dispose
      const { setTheme } = useTheme()
      setThemeFn = setTheme
      setTheme('dark')
    })

    // After createRoot returns, effects have been flushed
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(window.localStorage.getItem('narrex-theme')).toBe('dark')
  })

  it('effect removes dark class and persists when set to light', () => {
    let setThemeFn: ((t: 'light' | 'dark') => void) | undefined

    createRoot((dispose) => {
      cleanup = dispose
      const { setTheme } = useTheme()
      setThemeFn = setTheme
      setTheme('dark')
    })

    // Verify dark is set
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    // Now switch to light -- need a new root to create a new effect
    // Actually, the signal is module-level so we just need to change it
    // But the effect was registered in the root above which is still alive
    setThemeFn!('light')

    // The effect re-runs synchronously when a signal changes outside of a batch
    // Actually in Solid, setting a signal outside of batch/createRoot triggers
    // updates immediately.
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(window.localStorage.getItem('narrex-theme')).toBe('light')
  })
})
