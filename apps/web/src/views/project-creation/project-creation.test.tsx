import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@solidjs/testing-library'
import { I18nProvider } from '@/shared/lib/i18n'
import { ProjectCreationView } from './index'
import { streamStructure } from '@/features/structuring'
import type { SSEEvent } from '@/shared/api/sse'

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

/** Stream that yields events then hangs (keeps processing state active). */
function createHangingStream(events: SSEEvent[] = []) {
  const abortFn = vi.fn()
  async function* iterate() {
    for (const event of events) yield event
    await new Promise(() => {}) // hang forever
  }
  return { stream: { [Symbol.asyncIterator]: iterate }, abort: abortFn }
}

/** Stream that yields events then completes (for-await loop exits). */
function createFinishingStream(events: SSEEvent[]) {
  const abortFn = vi.fn()
  async function* iterate() {
    for (const event of events) yield event
  }
  return { stream: { [Symbol.asyncIterator]: iterate }, abort: abortFn }
}

function renderCreation() {
  Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true })
  return render(() => (
    <I18nProvider initial="en">
      <ProjectCreationView />
    </I18nProvider>
  ))
}

async function enterTextAndSubmit() {
  const textarea = screen.getByRole('textbox')
  await fireEvent.input(textarea, {
    target: { value: 'A knight who travels back in time.' },
  })
  const btn = screen.getByText('Structure My Story').closest('button')!
  await fireEvent.click(btn)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProjectCreationView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Input state ──────────────────────────────────────────────────────────

  it('renders the page title', () => {
    renderCreation()
    expect(screen.getByText('Start a New Story')).toBeInTheDocument()
  })

  it('renders the text input area', () => {
    renderCreation()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders the submit button', () => {
    renderCreation()
    expect(screen.getByText('Structure My Story')).toBeInTheDocument()
  })

  it('disables submit button when text is empty', () => {
    renderCreation()
    const btn = screen.getByText('Structure My Story').closest('button')
    expect(btn).toBeDisabled()
  })

  it('enables submit button when text is entered', async () => {
    renderCreation()
    const textarea = screen.getByRole('textbox')
    await fireEvent.input(textarea, {
      target: { value: 'A story about a knight who travels back in time.' },
    })
    const btn = screen.getByText('Structure My Story').closest('button')
    expect(btn).not.toBeDisabled()
  })

  it('shows file import section', () => {
    renderCreation()
    expect(screen.getByText('Browse Files')).toBeInTheDocument()
  })

  it('renders sample prompt chips', () => {
    renderCreation()
    expect(screen.getByText('Try an example')).toBeInTheDocument()
    expect(screen.getByText(/reborn as the villainess/i)).toBeInTheDocument()
  })

  it('fills textarea when a sample prompt is clicked', async () => {
    renderCreation()
    const chip = screen.getByText(/reborn as the villainess/i)
    await fireEvent.click(chip)
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    expect(textarea.value.length).toBeGreaterThan(0)
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

  // ── Processing state ─────────────────────────────────────────────────────

  describe('processing state', () => {
    it('shows progress bar with correct aria attributes', async () => {
      vi.mocked(streamStructure).mockReturnValue(createHangingStream())
      renderCreation()
      await enterTextAndSubmit()

      await waitFor(() => {
        const bar = screen.getByRole('progressbar')
        expect(bar).toHaveAttribute('aria-valuemin', '0')
        expect(bar).toHaveAttribute('aria-valuemax', '100')
        expect(bar).toHaveAttribute('aria-valuenow')
      })
    })

    it('shows step indicators in progress sidebar', async () => {
      vi.mocked(streamStructure).mockReturnValue(createHangingStream())
      renderCreation()
      await enterTextAndSubmit()

      await waitFor(() => {
        expect(screen.getByText('Finding characters')).toBeInTheDocument()
        expect(screen.getByText('Building timeline')).toBeInTheDocument()
        expect(screen.getByText('Setting up world')).toBeInTheDocument()
      })
    })

    it('shows cancel button', async () => {
      vi.mocked(streamStructure).mockReturnValue(createHangingStream())
      renderCreation()
      await enterTextAndSubmit()

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument()
      })
    })

    it('displays phase heading when progress event arrives', async () => {
      vi.mocked(streamStructure).mockReturnValue(
        createHangingStream([
          { event: 'progress', data: { message: 'Finding characters' } },
        ]),
      )
      renderCreation()
      await enterTextAndSubmit()

      await waitFor(() => {
        expect(screen.getByText('Characters')).toBeInTheDocument()
      })
    })

    it('shows streaming token text in preview area', async () => {
      vi.mocked(streamStructure).mockReturnValue(
        createHangingStream([
          { event: 'progress', data: { message: 'Finding characters' } },
          { event: 'token', data: { text: 'Camilla is a cunning villainess' } },
        ]),
      )
      renderCreation()
      await enterTextAndSubmit()

      await waitFor(() => {
        const matches = screen.getAllByText(/Camilla is a cunning villainess/)
        expect(matches.length).toBeGreaterThan(0)
      })
    })

    it('shows elapsed timer starting at 0:00', async () => {
      vi.mocked(streamStructure).mockReturnValue(createHangingStream())
      renderCreation()
      await enterTextAndSubmit()

      await waitFor(() => {
        expect(screen.getByText('0:00')).toBeInTheDocument()
      })
    })

    it('cancel returns to input state preserving content', async () => {
      vi.mocked(streamStructure).mockReturnValue(createHangingStream())
      renderCreation()
      await enterTextAndSubmit()

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument()
      })

      await fireEvent.click(screen.getByText('Cancel'))

      await waitFor(() => {
        expect(screen.getByText('Structure My Story')).toBeInTheDocument()
        const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
        expect(textarea.value).toBe('A knight who travels back in time.')
      })
    })

    it('shows completion card after completed event', async () => {
      vi.mocked(streamStructure).mockReturnValue(
        createFinishingStream([
          {
            event: 'completed',
            data: {
              data: {
                project: { id: 'p1' },
                characterCount: 4,
                sceneCount: 12,
                trackCount: 2,
              },
            },
          },
        ]),
      )
      renderCreation()
      await enterTextAndSubmit()

      await waitFor(
        () => {
          expect(screen.getByText('Your story is ready')).toBeInTheDocument()
        },
        { timeout: 2000 },
      )
    })

    it('completion card shows Open Workspace button', async () => {
      vi.mocked(streamStructure).mockReturnValue(
        createFinishingStream([
          {
            event: 'completed',
            data: { data: { project: { id: 'p1' } } },
          },
        ]),
      )
      renderCreation()
      await enterTextAndSubmit()

      await waitFor(
        () => {
          expect(screen.getByText('Open Workspace')).toBeInTheDocument()
        },
        { timeout: 2000 },
      )
    })

    it('advances step completion on phase transitions', async () => {
      vi.mocked(streamStructure).mockReturnValue(
        createHangingStream([
          { event: 'progress', data: { message: 'Finding characters' } },
          { event: 'progress', data: { message: 'Building timeline' } },
        ]),
      )
      renderCreation()
      await enterTextAndSubmit()

      await waitFor(() => {
        // Timeline phase heading should appear
        expect(screen.getByText('Timeline')).toBeInTheDocument()
        // Characters phase heading should also be visible
        expect(screen.getByText('Characters')).toBeInTheDocument()
      })
    })
  })
})
