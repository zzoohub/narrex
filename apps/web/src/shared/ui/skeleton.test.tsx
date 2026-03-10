import { describe, it, expect } from 'vitest'
import { render } from '@solidjs/testing-library'
import { Skeleton, SkeletonCard } from './skeleton'

describe('Skeleton', () => {
  it('renders a div element', () => {
    const { container } = render(() => <Skeleton />)
    expect(container.querySelector('div')).not.toBeNull()
  })

  it('applies default height of 16px', () => {
    const { container } = render(() => <Skeleton />)
    const el = container.querySelector('div')!
    expect(el.style.height).toBe('16px')
  })

  it('applies custom height', () => {
    const { container } = render(() => <Skeleton height="32px" />)
    const el = container.querySelector('div')!
    expect(el.style.height).toBe('32px')
  })

  it('applies custom width', () => {
    const { container } = render(() => <Skeleton width="200px" />)
    const el = container.querySelector('div')!
    expect(el.style.width).toBe('200px')
  })

  it('applies default rounded-md class', () => {
    const { container } = render(() => <Skeleton />)
    const el = container.querySelector('div')!
    expect(el.className).toContain('rounded-md')
  })

  it('applies rounded-full class', () => {
    const { container } = render(() => <Skeleton rounded="full" />)
    const el = container.querySelector('div')!
    expect(el.className).toContain('rounded-full')
  })

  it('applies rounded-xl class for lg', () => {
    const { container } = render(() => <Skeleton rounded="lg" />)
    const el = container.querySelector('div')!
    expect(el.className).toContain('rounded-xl')
  })

  it('applies animate-shimmer class', () => {
    const { container } = render(() => <Skeleton />)
    const el = container.querySelector('div')!
    expect(el.className).toContain('animate-shimmer')
  })

  it('merges custom class', () => {
    const { container } = render(() => <Skeleton class="my-class" />)
    const el = container.querySelector('div')!
    expect(el.className).toContain('my-class')
  })
})

describe('SkeletonCard', () => {
  it('renders a card-like skeleton structure', () => {
    const { container } = render(() => <SkeletonCard />)
    // Should contain multiple skeleton divs
    const skeletons = container.querySelectorAll('.animate-shimmer')
    expect(skeletons.length).toBeGreaterThanOrEqual(3)
  })

  it('has card border and background', () => {
    const { container } = render(() => <SkeletonCard />)
    const card = container.querySelector('.rounded-xl')!
    expect(card.className).toContain('bg-surface')
    expect(card.className).toContain('border')
  })
})
