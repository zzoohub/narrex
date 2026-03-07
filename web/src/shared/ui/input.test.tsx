import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@solidjs/testing-library'
import { TextInput, TextArea } from './input'

describe('TextInput', () => {
  it('renders an input element', () => {
    render(() => <TextInput placeholder="Type here" />)
    expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument()
  })

  it('renders label when provided', () => {
    render(() => <TextInput label="Name" />)
    expect(screen.getByText('Name')).toBeInTheDocument()
  })

  it('does not render label when not provided', () => {
    render(() => <TextInput placeholder="x" />)
    expect(screen.queryByText('Name')).not.toBeInTheDocument()
  })

  it('applies custom class', () => {
    render(() => <TextInput class="custom" placeholder="x" />)
    const input = screen.getByPlaceholderText('x')
    expect(input.className).toContain('custom')
  })

  it('passes through HTML attributes', () => {
    render(() => <TextInput type="email" placeholder="email" />)
    const input = screen.getByPlaceholderText('email')
    expect(input).toHaveAttribute('type', 'email')
  })
})

describe('TextArea', () => {
  it('renders a textarea element', () => {
    render(() => <TextArea placeholder="Write something" />)
    expect(screen.getByPlaceholderText('Write something')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Write something').tagName).toBe('TEXTAREA')
  })

  it('renders label when provided', () => {
    render(() => <TextArea label="Description" />)
    expect(screen.getByText('Description')).toBeInTheDocument()
  })

  it('does not render label when not provided', () => {
    render(() => <TextArea placeholder="x" />)
    // Should not have any span label elements
    const labels = document.querySelectorAll('span.text-xs')
    expect(labels.length).toBe(0)
  })

  it('applies autoGrow overflow class', () => {
    render(() => <TextArea autoGrow placeholder="x" />)
    const textarea = screen.getByPlaceholderText('x')
    expect(textarea.className).toContain('overflow-hidden')
  })

  it('applies min-h-24 when not autoGrow', () => {
    render(() => <TextArea placeholder="x" />)
    const textarea = screen.getByPlaceholderText('x')
    expect(textarea.className).toContain('min-h-24')
  })

  it('calls onInput handler', () => {
    const onInput = vi.fn()
    render(() => <TextArea placeholder="x" onInput={onInput} />)
    const textarea = screen.getByPlaceholderText('x') as HTMLTextAreaElement
    textarea.dispatchEvent(new InputEvent('input', { bubbles: true }))
    expect(onInput).toHaveBeenCalled()
  })
})
