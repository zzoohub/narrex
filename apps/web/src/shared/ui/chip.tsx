import { Show } from 'solid-js'
import { IconX } from './icons'

interface ChipProps {
  label: string
  variant?: 'default' | 'accent'
  onRemove?: () => void
  class?: string
}

export function Chip(props: ChipProps) {
  const isAccent = () => props.variant === 'accent'

  return (
    <span
      class={[
        'inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-xs font-medium transition-colors',
        isAccent()
          ? 'bg-accent-muted text-accent'
          : 'bg-surface-raised text-fg-secondary border border-border-subtle',
        props.class,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {props.label}
      <Show when={props.onRemove}>
        <button
          type="button"
          onClick={props.onRemove}
          class="p-0.5 -mr-1 rounded hover:bg-surface hover:text-fg transition-colors cursor-pointer"
          aria-label={`Remove ${props.label}`}
        >
          <IconX size={12} />
        </button>
      </Show>
    </span>
  )
}
