import { splitProps, Show } from 'solid-js'
import type { JSX, ParentComponent } from 'solid-js'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: JSX.Element | (() => JSX.Element)
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-fg hover:bg-accent-hover active:brightness-95 shadow-sm shadow-accent/10',
  secondary:
    'bg-surface-raised text-fg border border-border-default hover:bg-surface hover:border-accent/30 active:bg-surface-raised',
  ghost:
    'text-fg-secondary hover:bg-surface-raised hover:text-fg active:bg-surface',
  danger:
    'bg-error-muted text-error hover:bg-error hover:text-white active:brightness-95',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-md',
  md: 'h-9 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-6 text-base gap-2.5 rounded-lg',
}

export const Button: ParentComponent<ButtonProps> = (allProps) => {
  const [props, rest] = splitProps(allProps, [
    'variant',
    'size',
    'loading',
    'icon',
    'children',
    'class',
    'disabled',
  ])

  return (
    <button
      {...rest}
      disabled={props.disabled || props.loading}
      class={[
        'inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer select-none',
        'focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        variantClasses[props.variant ?? 'secondary'],
        sizeClasses[props.size ?? 'md'],
        props.class,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Show when={props.loading}>
        <span class="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      </Show>
      <Show when={!props.loading && props.icon}>{typeof props.icon === 'function' ? props.icon() : props.icon}</Show>
      {props.children}
    </button>
  )
}
