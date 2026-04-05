import { splitProps } from 'solid-js'
import type { JSX } from 'solid-js'

interface TextInputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function TextInput(allProps: TextInputProps) {
  const [props, rest] = splitProps(allProps, ['label', 'class'])

  return (
    <label class="flex flex-col gap-1.5">
      {props.label && (
        <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
          {props.label}
        </span>
      )}
      <input
        {...rest}
        class={[
          'h-9 px-3 rounded-lg text-sm bg-surface border border-border-default text-fg',
          'placeholder:text-fg-muted',
          'hover:border-accent/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring',
          'transition-colors duration-150',
          props.class,
        ]
          .filter(Boolean)
          .join(' ')}
      />
    </label>
  )
}

interface TextAreaProps extends JSX.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  autoGrow?: boolean
}

export function TextArea(allProps: TextAreaProps) {
  const [props, rest] = splitProps(allProps, ['label', 'autoGrow', 'class'])
  let ref: HTMLTextAreaElement | undefined

  const adjustHeight = () => {
    if (ref && props.autoGrow) {
      ref.style.height = 'auto'
      ref.style.height = ref.scrollHeight + 'px'
    }
  }

  return (
    <label class="flex flex-col gap-1.5">
      {props.label && (
        <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
          {props.label}
        </span>
      )}
      <textarea
        {...rest}
        ref={ref}
        onInput={(e) => {
          adjustHeight()
          if (typeof rest.onInput === 'function') {
            rest.onInput(e)
          }
        }}
        class={[
          'px-3 py-2.5 rounded-lg text-sm bg-surface border border-border-default text-fg',
          'placeholder:text-fg-muted resize-none',
          'hover:border-accent/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring',
          'transition-colors duration-150',
          props.autoGrow ? 'overflow-hidden' : 'min-h-24',
          props.class,
        ]
          .filter(Boolean)
          .join(' ')}
      />
    </label>
  )
}
