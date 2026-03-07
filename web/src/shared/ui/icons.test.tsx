import { describe, it, expect } from 'vitest'
import { render } from '@solidjs/testing-library'
import { IconPlus, IconX, IconCheck, IconMoon, IconSun } from './icons'

describe('Icons', () => {
  it('renders IconPlus as SVG', () => {
    const { container } = render(() => <IconPlus />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg!.getAttribute('aria-hidden')).toBe('true')
  })

  it('applies default size of 20', () => {
    const { container } = render(() => <IconPlus />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('20')
    expect(svg.getAttribute('height')).toBe('20')
  })

  it('applies custom size', () => {
    const { container } = render(() => <IconX size={16} />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('16')
    expect(svg.getAttribute('height')).toBe('16')
  })

  it('applies custom class', () => {
    const { container } = render(() => <IconCheck class="text-green" />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('class')).toBe('text-green')
  })

  it('uses viewBox 0 0 24 24', () => {
    const { container } = render(() => <IconMoon />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24')
  })

  it('renders different icon shapes', () => {
    const { container: c1 } = render(() => <IconPlus />)
    const { container: c2 } = render(() => <IconSun />)
    const path1 = c1.querySelector('svg')!.innerHTML
    const path2 = c2.querySelector('svg')!.innerHTML
    expect(path1).not.toBe(path2)
  })
})
