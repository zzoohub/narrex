import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@solidjs/testing-library'
import { I18nProvider } from '@/shared/lib/i18n'
import { ProjectCreationView } from './index'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@tanstack/solid-router', () => ({
  Link: (props: any) => <a href={props.to}>{props.children}</a>,
  useNavigate: () => vi.fn(),
}))

vi.mock('@/features/structuring', () => ({
  streamStructure: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderCreation() {
  Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true })
  return render(() => (
    <I18nProvider initial="en">
      <ProjectCreationView />
    </I18nProvider>
  ))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProjectCreationView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page title', () => {
    renderCreation()
    expect(screen.getByText('Start a New Story')).toBeInTheDocument()
  })

  it('renders the text input area', () => {
    renderCreation()
    const textarea = screen.getByRole('textbox')
    expect(textarea).toBeInTheDocument()
  })

  it('renders the submit button', () => {
    renderCreation()
    expect(screen.getByText('Structure My Story')).toBeInTheDocument()
  })

  it('disables submit button when text is empty', () => {
    renderCreation()
    const submitBtn = screen.getByText('Structure My Story').closest('button')
    expect(submitBtn).toBeDisabled()
  })

  it('enables submit button when text is entered', async () => {
    renderCreation()
    const textarea = screen.getByRole('textbox')
    await fireEvent.input(textarea, { target: { value: 'A story about a knight who travels back in time.' } })
    const submitBtn = screen.getByText('Structure My Story').closest('button')
    expect(submitBtn).not.toBeDisabled()
  })

  it('shows file import section', () => {
    renderCreation()
    expect(screen.getByText('Browse Files')).toBeInTheDocument()
  })

  it('shows mobile fallback on small screens', () => {
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true })
    render(() => (
      <I18nProvider initial="ko">
        <ProjectCreationView />
      </I18nProvider>
    ))
    expect(screen.getByText(/데스크톱용으로 설계/)).toBeInTheDocument()
  })
})
