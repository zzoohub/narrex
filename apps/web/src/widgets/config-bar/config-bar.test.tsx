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
  return render(() => (
    <I18nProvider initial="en">
      <ConfigBar open={open} />
    </I18nProvider>
  ))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ConfigBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('collapses panel when closed (grid-template-rows: 0fr)', () => {
    const { container } = renderConfigBar(false)
    const panel = container.querySelector('[data-testid="config-panel"]') as HTMLElement
    expect(panel).toBeInTheDocument()
    expect(panel.style.gridTemplateRows).toBe('0fr')
  })

  it('shows form fields when open', () => {
    renderConfigBar(true)
    expect(screen.getByDisplayValue('Fantasy')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Power')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Medieval')).toBeInTheDocument()
  })

  it('shows tone tags when open', () => {
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

  it('does not render a backdrop overlay', () => {
    renderConfigBar(true)
    expect(screen.queryByTestId('config-backdrop')).not.toBeInTheDocument()
  })

  it('renders panel container even when closed (for animation)', () => {
    const { container } = renderConfigBar(false)
    const panel = container.querySelector('[data-testid="config-panel"]')
    expect(panel).toBeInTheDocument()
  })
})
