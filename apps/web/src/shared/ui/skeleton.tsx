interface SkeletonProps {
  class?: string
  width?: string
  height?: string
  rounded?: 'sm' | 'md' | 'lg' | 'full'
}

const roundedMap = {
  sm: 'rounded',
  md: 'rounded-md',
  lg: 'rounded-xl',
  full: 'rounded-full',
}

export function Skeleton(props: SkeletonProps) {
  return (
    <div
      class={[
        'bg-gradient-to-r from-skeleton-base via-skeleton-shine to-skeleton-base bg-[length:200%_100%] animate-shimmer',
        roundedMap[props.rounded ?? 'md'],
        props.class,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        width: props.width,
        height: props.height ?? '16px',
      }}
    />
  )
}

export function SkeletonCard() {
  return (
    <div class="rounded-xl border border-border-default bg-surface p-5 space-y-3">
      <Skeleton width="60%" height="20px" />
      <Skeleton width="40%" height="12px" />
      <div class="pt-2">
        <Skeleton width="100%" height="6px" rounded="full" />
      </div>
      <Skeleton width="50%" height="12px" />
    </div>
  )
}
