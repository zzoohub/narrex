import { createEffect, onCleanup, Show } from 'solid-js'
import { Portal } from 'solid-js/web'
import { useI18n } from '@/shared/lib/i18n'
import { Button } from './button'

export interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  confirmLabel: string
  confirmVariant?: 'primary' | 'danger'
  confirmDisabled?: boolean
  onConfirm: () => void
  cancelLabel?: string
}

export function Dialog(props: DialogProps) {
  const { t } = useI18n()

  let dialogRef: HTMLDivElement | undefined
  let previousFocus: HTMLElement | null = null

  const getFocusableEls = (): HTMLElement[] => {
    if (!dialogRef) return []
    return Array.from(
      dialogRef.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    )
  }

  const trapFocus = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return

    const focusable = getFocusableEls()
    if (focusable.length === 0) {
      e.preventDefault()
      return
    }

    const first = focusable[0]!
    const last = focusable[focusable.length - 1]!

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      props.onClose()
    }
    trapFocus(e)
  }

  if (typeof document !== 'undefined') {
    createEffect(() => {
      if (props.open) {
        previousFocus = document.activeElement as HTMLElement | null

        requestAnimationFrame(() => {
          const focusable = getFocusableEls()
          focusable.at(-1)?.focus()
        })

        document.addEventListener('keydown', handleKeyDown, true)
      } else {
        document.removeEventListener('keydown', handleKeyDown, true)
        previousFocus?.focus()
      }
    })

    onCleanup(() => {
      document.removeEventListener('keydown', handleKeyDown, true)
    })
  }

  return (
    <Show when={props.open}>
      <Portal>
        <div
          class="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={props.onClose}
          aria-hidden="true"
        />

        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
          aria-describedby={props.description ? 'dialog-desc' : undefined}
          class={[
            'fixed z-[9999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            'w-[calc(100%-2rem)] max-w-md',
            'rounded-xl border border-border-default bg-surface-raised p-6 shadow-2xl shadow-black/40',
            'animate-scale-in origin-center',
          ].join(' ')}
        >
          <h2
            id="dialog-title"
            class="text-lg font-semibold text-fg leading-tight"
          >
            {props.title}
          </h2>

          <Show when={props.description}>
            <p
              id="dialog-desc"
              class="mt-2 text-sm text-fg-muted leading-relaxed"
            >
              {props.description}
            </p>
          </Show>

          <div class="mt-6 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={props.onClose}>
              {props.cancelLabel ?? t('common.cancel')}
            </Button>
            <Button
              variant={props.confirmVariant ?? 'primary'}
              disabled={props.confirmDisabled}
              onClick={() => {
                props.onConfirm()
                props.onClose()
              }}
            >
              {props.confirmLabel}
            </Button>
          </div>
        </div>
      </Portal>
    </Show>
  )
}
