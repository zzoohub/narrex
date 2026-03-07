import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@solidjs/testing-library'
import { Card } from './card'

describe('Card', () => {
  it('renders children', () => {
    render(() => <Card><p>Card content</p></Card>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('applies base card styles', () => {
    render(() => <Card><p>Test</p></Card>)
    const card = screen.getByText('Test').parentElement!
    expect(card.className).toContain('rounded-xl')
    expect(card.className).toContain('bg-surface')
  })

  it('does not have role=button when not interactive', () => {
    render(() => <Card><p>Test</p></Card>)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('has role=button when interactive', () => {
    render(() => <Card interactive><p>Test</p></Card>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('sets tabIndex=0 when interactive', () => {
    render(() => <Card interactive><p>Test</p></Card>)
    expect(screen.getByRole('button')).toHaveAttribute('tabindex', '0')
  })

  it('applies hover styles when interactive', () => {
    render(() => <Card interactive><p>Test</p></Card>)
    const card = screen.getByRole('button')
    expect(card.className).toContain('cursor-pointer')
  })

  it('handles onClick', () => {
    const onClick = vi.fn()
    render(() => <Card interactive onClick={onClick}><p>Test</p></Card>)
    screen.getByRole('button').click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('merges custom class', () => {
    render(() => <Card class="custom-class"><p>Test</p></Card>)
    const card = screen.getByText('Test').parentElement!
    expect(card.className).toContain('custom-class')
  })
})
