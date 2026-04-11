/**
 * Creates a debounced version of a function.
 * Returns `trigger` to schedule the call and `cancel` to abort a pending call.
 */
export function debounce(fn: () => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  const trigger = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn()
      timer = undefined
    }, ms)
  }
  const cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = undefined
    }
  }
  return { trigger, cancel }
}
