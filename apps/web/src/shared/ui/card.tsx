import type { ParentComponent, JSX } from 'solid-js'

interface CardProps {
  class?: string
  onClick?: JSX.EventHandler<HTMLDivElement, MouseEvent>
  interactive?: boolean
}

export const Card: ParentComponent<CardProps> = (props) => (
  <div
    onClick={props.onClick}
    role={props.interactive ? 'button' : undefined}
    tabIndex={props.interactive ? 0 : undefined}
    class={[
      'rounded-xl border border-border-default bg-surface p-5 transition-all duration-200',
      props.interactive
        ? 'cursor-pointer hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 hover:-translate-y-0.5 active:translate-y-0'
        : '',
      props.class,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {props.children}
  </div>
)
