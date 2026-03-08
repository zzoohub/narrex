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

function renderConfigBar() {
  return render(() => (
    <I18nProvider initial="en">
      <ConfigBar />
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

  it('renders collapsed bar with genre chip and tone tags', () => {
    renderConfigBar()
    expect(screen.getByText('Fantasy')).toBeInTheDocument()
    expect(screen.getByText('dark')).toBeInTheDocument()
    expect(screen.getByText('epic')).toBeInTheDocument()
  })

  it('expands on click to show input fields', async () => {
    renderConfigBar()
    // Click the collapsed bar toggle
    const toggle = screen.getByText('Story Settings')
    await fireEvent.click(toggle)
    // Should show genre input with current value
    const genreInput = screen.getByDisplayValue('Fantasy')
    expect(genreInput).toBeInTheDocument()
    expect(screen.getByDisplayValue('Power')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Medieval')).toBeInTheDocument()
  })

  it('calls updateProject when genre input changes', async () => {
    renderConfigBar()
    const toggle = screen.getByText('Story Settings')
    await fireEvent.click(toggle)

    const genreInput = screen.getByDisplayValue('Fantasy')
    await fireEvent.input(genreInput, { target: { value: 'Sci-Fi' } })
    expect(mockUpdateProject).toHaveBeenCalledWith({ genre: 'Sci-Fi' })
  })
})
