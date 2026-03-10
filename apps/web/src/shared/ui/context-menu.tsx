import { createSignal, onCleanup, For, Show } from 'solid-js'
import type { JSX } from 'solid-js'
import { Portal } from 'solid-js/web'

/* ── Types ──────────────────────────────────────────────────────────── */

export interface ContextMenuItem {
  label: string
  icon?: JSX.Element
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}

export interface ContextMenuProps {
  items: (ContextMenuItem | typeof Separator)[]
  children: JSX.Element
  /** Use `true` when wrapping SVG elements — renders a `<g>` instead of `<div>`. */
  svg?: boolean
}

/** Insert between items to render a horizontal divider line. */
export const Separator = Symbol('ContextMenuSeparator')

/* ── Component ──────────────────────────────────────────────────────── */

export function ContextMenu(props: ContextMenuProps) {
  const [open, setOpen] = createSignal(false)
  const [pos, setPos] = createSignal({ x: 0, y: 0 })
  const [focusIndex, setFocusIndex] = createSignal(-1)

  let menuRef: HTMLDivElement | undefined

  /* ── helpers ─────────────────────────────────────────────────────── */

  /** Returns only actionable (non-separator) items. */
  const actionableItems = () =>
    props.items.filter((i): i is ContextMenuItem => i !== Separator)

  const actionableCount = () => actionableItems().length

  /** Map from actionable index to the DOM element. */
  const getItemEl = (idx: number): HTMLButtonElement | undefined =>
    menuRef?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')[idx]

  const close = () => {
    setOpen(false)
    setFocusIndex(-1)
  }

  /* ── open handler ───────────────────────────────────────────────── */

  const handleContextMenu: JSX.EventHandler<HTMLDivElement | SVGGElement, MouseEvent> = (e) => {
    e.preventDefault()
    e.stopPropagation()

    const x = Math.min(e.clientX, window.innerWidth - 200)
    setPos({ x, y: e.clientY })
    setOpen(true)
    setFocusIndex(-1)
  }

  /* ── global listeners (added once, cleaned up) ──────────────────── */

  const handleOutsideClick = (e: MouseEvent) => {
    if (!open()) return
    if (menuRef && !menuRef.contains(e.target as Node)) close()
  }

  const handleEscape = (e: KeyboardEvent) => {
    if (open() && e.key === 'Escape') {
      e.stopPropagation()
      close()
    }
  }

  const handleScroll = () => {
    if (open()) close()
  }

  document.addEventListener('mousedown', handleOutsideClick, true)
  document.addEventListener('keydown', handleEscape, true)
  window.addEventListener('scroll', handleScroll, true)
  onCleanup(() => {
    document.removeEventListener('mousedown', handleOutsideClick, true)
    document.removeEventListener('keydown', handleEscape, true)
    window.removeEventListener('scroll', handleScroll, true)
  })

  /* ── keyboard nav inside menu ───────────────────────────────────── */

  const handleMenuKeyDown = (e: KeyboardEvent) => {
    const count = actionableCount()
    if (count === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = focusIndex() < count - 1 ? focusIndex() + 1 : 0
      setFocusIndex(next)
      getItemEl(next)?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = focusIndex() > 0 ? focusIndex() - 1 : count - 1
      setFocusIndex(prev)
      getItemEl(prev)?.focus()
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const item = actionableItems()[focusIndex()]
      if (item && !item.disabled) {
        item.onClick()
        close()
      }
    }
  }

  /* ── render ─────────────────────────────────────────────────────── */

  // Track actionable index while iterating all items (including separators)
  let actionIdx: number

  return (
    <>
      {props.svg ? (
        <g onContextMenu={handleContextMenu}>
          {props.children}
        </g>
      ) : (
        <div onContextMenu={handleContextMenu} style={{ display: 'contents' }}>
          {props.children}
        </div>
      )}

      <Show when={open()}>
        <Portal>
          <div
            ref={menuRef}
            role="menu"
            tabIndex={-1}
            onKeyDown={handleMenuKeyDown}
            style={{
              position: 'fixed',
              left: `${pos().x}px`,
              bottom: `${window.innerHeight - pos().y}px`,
              'z-index': '9999',
            }}
            class={[
              'min-w-[180px] max-w-[260px] py-1.5 rounded-lg',
              'bg-surface-raised border border-border-default shadow-xl shadow-black/30',
              'origin-bottom-left animate-scale-in',
            ].join(' ')}
          >
            {(() => {
              actionIdx = 0
              return null
            })()}
            <For each={props.items}>
              {(item) => {
                if (item === Separator) {
                  return (
                    <div
                      role="separator"
                      class="my-1 mx-2 h-px bg-border-default"
                    />
                  )
                }

                const idx = actionIdx++
                const menuItem = item as ContextMenuItem

                return (
                  <button
                    role="menuitem"
                    type="button"
                    disabled={menuItem.disabled}
                    tabIndex={-1}
                    class={[
                      'flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left transition-colors duration-100 cursor-pointer',
                      'focus:outline-none',
                      menuItem.danger
                        ? 'text-error hover:bg-error-muted focus:bg-error-muted'
                        : 'text-fg hover:bg-surface focus:bg-surface',
                      menuItem.disabled
                        ? 'opacity-40 cursor-not-allowed pointer-events-none'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => {
                      if (!menuItem.disabled) {
                        menuItem.onClick()
                        close()
                      }
                    }}
                    onMouseEnter={() => {
                      setFocusIndex(idx)
                    }}
                  >
                    <Show when={menuItem.icon}>
                      <span class="flex-shrink-0 opacity-70">
                        {menuItem.icon}
                      </span>
                    </Show>
                    <span class="truncate">{menuItem.label}</span>
                  </button>
                )
              }}
            </For>
          </div>
        </Portal>
      </Show>
    </>
  )
}
