import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@solidjs/testing-library'
import { Chip } from './chip'

describe('Chip', () => {
  it('renders label text', () => {
    render(() => <Chip label="Fantasy" />)
    expect(screen.getByText('Fantasy')).toBeInTheDocument()
  })

  it('applies default variant styles', () => {
    render(() => <Chip label="Default" />)
    const chip = screen.getByText('Default').closest('span')!
    expect(chip.className).toContain('bg-surface-raised')
  })

  it('applies accent variant styles', () => {
    render(() => <Chip label="Accent" variant="accent" />)
    const chip = screen.getByText('Accent').closest('span')!
    expect(chip.className).toContain('bg-accent-muted')
  })

  it('shows remove button when onRemove is provided', () => {
    render(() => <Chip label="Removable" onRemove={() => {}} />)
    expect(screen.getByRole('button', { name: 'Remove Removable' })).toBeInTheDocument()
  })

  it('does not show remove button when onRemove is not provided', () => {
    render(() => <Chip label="Static" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('calls onRemove when remove button is clicked', () => {
    const onRemove = vi.fn()
    render(() => <Chip label="Test" onRemove={onRemove} />)
    screen.getByRole('button', { name: 'Remove Test' }).click()
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('merges custom class', () => {
    render(() => <Chip label="Custom" class="extra-class" />)
    const chip = screen.getByText('Custom').closest('span')!
    expect(chip.className).toContain('extra-class')
  })
})
