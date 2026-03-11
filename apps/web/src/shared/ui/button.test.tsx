import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@solidjs/testing-library'
import { Button } from './button'

describe('Button', () => {
  it('renders children text', () => {
    render(() => <Button>Click me</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Click me')
  })

  it('applies secondary variant by default', () => {
    render(() => <Button>Test</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-surface-raised')
  })

  it('applies primary variant classes', () => {
    render(() => <Button variant="primary">Test</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-accent')
  })

  it('applies ghost variant classes', () => {
    render(() => <Button variant="ghost">Test</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('text-fg-secondary')
  })

  it('applies danger variant classes', () => {
    render(() => <Button variant="danger">Test</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('text-error')
  })

  it('applies md size by default', () => {
    render(() => <Button>Test</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('h-9')
  })

  it('applies sm size classes', () => {
    render(() => <Button size="sm">Test</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('h-8')
  })

  it('applies lg size classes', () => {
    render(() => <Button size="lg">Test</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('h-11')
  })

  it('is disabled when disabled prop is true', () => {
    render(() => <Button disabled>Test</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is disabled when loading is true', () => {
    render(() => <Button loading>Test</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('shows spinner when loading', () => {
    render(() => <Button loading>Test</Button>)
    const btn = screen.getByRole('button')
    const spinner = btn.querySelector('.animate-spin')
    expect(spinner).not.toBeNull()
  })

  it('does not show spinner when not loading', () => {
    render(() => <Button>Test</Button>)
    const btn = screen.getByRole('button')
    const spinner = btn.querySelector('.animate-spin')
    expect(spinner).toBeNull()
  })

  it('renders icon when provided', () => {
    const icon = () => <span data-testid="icon">*</span>
    render(() => <Button icon={icon}>Test</Button>)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('hides icon when loading', () => {
    const icon = () => <span data-testid="icon">*</span>
    render(() => <Button icon={icon} loading>Test</Button>)
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument()
  })

  it('fires onClick handler', () => {
    const onClick = vi.fn()
    render(() => <Button onClick={onClick}>Test</Button>)
    screen.getByRole('button').click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not fire onClick when disabled', () => {
    const onClick = vi.fn()
    render(() => <Button onClick={onClick} disabled>Test</Button>)
    screen.getByRole('button').click()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('merges custom class', () => {
    render(() => <Button class="my-custom">Test</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('my-custom')
  })
})
