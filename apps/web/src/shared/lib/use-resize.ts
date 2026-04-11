import { createSignal } from 'solid-js'

/**
 * Shared resize handler state and factory functions for resizable panels.
 * Returns isResizing signal + horizontal/vertical resize initiators.
 */
export function useResize() {
  const [isResizing, setIsResizing] = createSignal(false)

  function createHorizontalResize(
    setter: (v: number) => void,
    getter: () => number,
    min: number,
    max: number,
    direction: 1 | -1,
  ) {
    return (e: PointerEvent) => {
      setIsResizing(true)
      const startX = e.clientX
      const startSize = getter()
      const onMove = (ev: PointerEvent) => {
        const delta = (ev.clientX - startX) * direction
        setter(Math.min(max, Math.max(min, startSize + delta)))
      }
      const onUp = () => {
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        setIsResizing(false)
      }
      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }
  }

  function createVerticalResize(
    setter: (v: number) => void,
    getter: () => number,
    min: number,
    maxFn: () => number,
  ) {
    return (e: PointerEvent) => {
      setIsResizing(true)
      const startY = e.clientY
      const startSize = getter()
      const maxH = maxFn()
      const onMove = (ev: PointerEvent) => {
        const delta = startY - ev.clientY
        setter(Math.min(maxH, Math.max(min, startSize + delta)))
      }
      const onUp = () => {
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        setIsResizing(false)
      }
      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
      document.body.style.cursor = 'row-resize'
      document.body.style.userSelect = 'none'
    }
  }

  return { isResizing, createHorizontalResize, createVerticalResize }
}
