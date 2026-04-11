import { createSignal, onCleanup, onMount } from 'solid-js'

const MOBILE_BREAKPOINT = 768

/**
 * Reactive signal that tracks whether the viewport is below the mobile breakpoint.
 * Safe for SSR — returns false on the server and hydrates on mount.
 */
export function useMobile() {
  const [isMobile, setIsMobile] = createSignal(false)

  if (typeof window !== 'undefined') {
    onMount(() => {
      const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
      check()
      window.addEventListener('resize', check)
      onCleanup(() => window.removeEventListener('resize', check))
    })
  }

  return isMobile
}
