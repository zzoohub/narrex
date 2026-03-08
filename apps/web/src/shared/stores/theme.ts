import { createSignal, createEffect } from 'solid-js'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'narrex-theme'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const [theme, setThemeSignal] = createSignal<Theme>(getInitialTheme())

export function useTheme() {
  createEffect(() => {
    const t = theme()
    if (typeof document === 'undefined') return
    document.documentElement.classList.toggle('dark', t === 'dark')
    localStorage.setItem(STORAGE_KEY, t)
  })

  const toggle = () => setThemeSignal((t) => (t === 'dark' ? 'light' : 'dark'))

  return { theme, setTheme: setThemeSignal, toggle }
}
