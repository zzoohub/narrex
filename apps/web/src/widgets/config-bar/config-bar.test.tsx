import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@solidjs/testing-library'
import { I18nProvider } from '@/shared/lib/i18n'
import { ConfigBar } from './index'

// ---------------------------------------------------------------------------
// Mocks – workspace store
// ---------------------------------------------------------------------------

const mockUpdateProject = vi.fn()

vi.mock('@/features/workspace', () => ({
  useWorkspace: () => ({
    state: {
      project: {
        id: 'p1',
        title: 'Test',
        genre: 'Fantasy',
        theme: 'Power',
        eraLocation: 'Medieval',
        pov: 'first_person',
        tone: 'dark, epic',
      },
    },
    updateProject: mockUpdateProject,
  }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderConfigBar(open = true) {
  const onClose = vi.fn()
  const result = render(() => (
    <I18nProvider initial="en">
      <ConfigBar open={open} onClose={onClose} />
    </I18nProvider>
  ))
  return { ...result, onClose }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ConfigBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when closed', () => {
    renderConfigBar(false)
    expect(screen.queryByDisplayValue('Fantasy')).not.toBeInTheDocument()
  })

  it('renders form fields when open', () => {
    renderConfigBar(true)
    expect(screen.getByDisplayValue('Fantasy')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Power')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Medieval')).toBeInTheDocument()
  })

  it('renders tone tags when open', () => {
    renderConfigBar(true)
    expect(screen.getByText('dark')).toBeInTheDocument()
    expect(screen.getByText('epic')).toBeInTheDocument()
  })

  it('calls updateProject when genre input changes', async () => {
    renderConfigBar(true)
    const genreInput = screen.getByDisplayValue('Fantasy')
    await fireEvent.input(genreInput, { target: { value: 'Sci-Fi' } })
    expect(mockUpdateProject).toHaveBeenCalledWith({ genre: 'Sci-Fi' })
  })

  it('calls onClose when backdrop is clicked', async () => {
    const { onClose } = renderConfigBar(true)
    const backdrop = screen.getByTestId('config-backdrop')
    await fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalled()
  })
})
