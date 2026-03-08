import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@solidjs/testing-library'
import { I18nProvider } from '@/shared/lib/i18n'
import { TimelinePanel } from './index'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockAddScene = vi.fn()
const mockSelectScene = vi.fn()
const mockAddTrack = vi.fn()
const mockRemoveTrack = vi.fn()
const mockUpdateTrack = vi.fn()
const mockMoveScene = vi.fn()
const mockRemoveScene = vi.fn()
const mockAddConnection = vi.fn()

vi.mock('@/features/workspace', () => ({
  useWorkspace: () => ({
    state: {
      tracks: [
        { id: 't1', projectId: 'p1', position: 0, label: 'Main Track', createdAt: '', updatedAt: '' },
        { id: 't2', projectId: 'p1', position: 1, label: 'Sub Track', createdAt: '', updatedAt: '' },
      ],
      scenes: [
        {
          id: 's1', trackId: 't1', projectId: 'p1', title: 'Opening',
          status: 'ai_draft', characterIds: [], moodTags: [], location: null,
          plotSummary: null, startPosition: 0, duration: 1, createdAt: '', updatedAt: '',
        },
        {
          id: 's2', trackId: 't1', projectId: 'p1', title: 'Conflict',
          status: 'empty', characterIds: [], moodTags: [], location: null,
          plotSummary: null, startPosition: 2, duration: 1, createdAt: '', updatedAt: '',
        },
        {
          id: 's3', trackId: 't2', projectId: 'p1', title: 'Parallel',
          status: 'edited', characterIds: [], moodTags: [], location: null,
          plotSummary: null, startPosition: 0, duration: 2, createdAt: '', updatedAt: '',
        },
      ],
      connections: [
        { id: 'conn1', projectId: 'p1', sourceSceneId: 's1', targetSceneId: 's3', connectionType: 'branch', createdAt: '' },
      ],
    },
    selectedSceneId: () => null,
    trackScenes: () => [
      {
        id: 't1', projectId: 'p1', position: 0, label: 'Main Track', createdAt: '', updatedAt: '',
        scenes: [
          { id: 's1', trackId: 't1', projectId: 'p1', title: 'Opening', status: 'ai_draft', characterIds: [], moodTags: [], location: null, plotSummary: null, startPosition: 0, duration: 1, createdAt: '', updatedAt: '' },
          { id: 's2', trackId: 't1', projectId: 'p1', title: 'Conflict', status: 'empty', characterIds: [], moodTags: [], location: null, plotSummary: null, startPosition: 2, duration: 1, createdAt: '', updatedAt: '' },
        ],
      },
      {
        id: 't2', projectId: 'p1', position: 1, label: 'Sub Track', createdAt: '', updatedAt: '',
        scenes: [
          { id: 's3', trackId: 't2', projectId: 'p1', title: 'Parallel', status: 'edited', characterIds: [], moodTags: [], location: null, plotSummary: null, startPosition: 0, duration: 2, createdAt: '', updatedAt: '' },
        ],
      },
    ],
    scenesForTrack: (trackId: string) => {
      if (trackId === 't1') return [
        { id: 's1', trackId: 't1', startPosition: 0, duration: 1, title: 'Opening', status: 'ai_draft' },
        { id: 's2', trackId: 't1', startPosition: 2, duration: 1, title: 'Conflict', status: 'empty' },
      ]
      return [
        { id: 's3', trackId: 't2', startPosition: 0, duration: 2, title: 'Parallel', status: 'edited' },
      ]
    },
    addScene: mockAddScene,
    selectScene: mockSelectScene,
    addTrack: mockAddTrack,
    removeTrack: mockRemoveTrack,
    updateTrack: mockUpdateTrack,
    moveScene: mockMoveScene,
    removeScene: mockRemoveScene,
    addConnection: mockAddConnection,
    updateScene: vi.fn(),
  }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderTimeline(props: { onCollapse?: () => void } = {}) {
  return render(() => (
    <I18nProvider initial="en">
      <TimelinePanel onCollapse={props.onCollapse} />
    </I18nProvider>
  ))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TimelinePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders track labels', () => {
    renderTimeline()
    expect(screen.getByText('Main Track')).toBeInTheDocument()
    expect(screen.getByText('Sub Track')).toBeInTheDocument()
  })

  it('renders scene clips as text', () => {
    renderTimeline()
    expect(screen.getByText('Opening')).toBeInTheDocument()
    expect(screen.getByText('Conflict')).toBeInTheDocument()
    expect(screen.getByText('Parallel')).toBeInTheDocument()
  })

  it('renders timeline hint banner', () => {
    renderTimeline()
    expect(screen.getByText(/starting point/)).toBeInTheDocument()
  })

  describe('timeline header bar', () => {
    it('renders a header bar with "Timeline" label', () => {
      renderTimeline()
      const header = screen.getByTestId('timeline-header')
      expect(header).toBeInTheDocument()
      expect(header.textContent).toContain('Timeline')
    })

    it('places collapse button inside the header bar', () => {
      const onCollapse = vi.fn()
      renderTimeline({ onCollapse })
      const header = screen.getByTestId('timeline-header')
      const collapseBtn = screen.getByLabelText('Collapse timeline')
      expect(header.contains(collapseBtn)).toBe(true)
    })

    it('places add track button inside the header bar', () => {
      renderTimeline()
      const header = screen.getByTestId('timeline-header')
      const addBtn = screen.getByText('Add Track')
      expect(header.contains(addBtn)).toBe(true)
    })

    it('calls addTrack directly on add track click (no inline input)', async () => {
      renderTimeline()
      const addBtn = screen.getByText('Add Track')
      await fireEvent.click(addBtn)
      expect(mockAddTrack).toHaveBeenCalledWith('Track 3')
    })

    it('places zoom controls inside the header bar', () => {
      renderTimeline()
      const header = screen.getByTestId('timeline-header')
      const zoomToolbar = screen.getByTestId('timeline-zoom-toolbar')
      expect(header.contains(zoomToolbar)).toBe(true)
    })
  })

  describe('zoom controls', () => {
    it('renders zoom controls in a dedicated toolbar', () => {
      renderTimeline()
      const zoomToolbar = screen.getByTestId('timeline-zoom-toolbar')
      expect(zoomToolbar).toBeInTheDocument()
      const zoomIn = screen.getByLabelText('Zoom in')
      const zoomOut = screen.getByLabelText('Zoom out')
      const fit = screen.getByLabelText('Fit')
      expect(zoomToolbar.contains(zoomIn)).toBe(true)
      expect(zoomToolbar.contains(zoomOut)).toBe(true)
      expect(zoomToolbar.contains(fit)).toBe(true)
    })

    it('keeps collapse button separate from zoom controls', () => {
      const onCollapse = vi.fn()
      renderTimeline({ onCollapse })
      const collapseBtn = screen.getByLabelText('Collapse timeline')
      const zoomToolbar = screen.getByTestId('timeline-zoom-toolbar')
      expect(zoomToolbar.contains(collapseBtn)).toBe(false)
    })

    it('renders zoom percentage display inside the toolbar', () => {
      renderTimeline()
      const zoomToolbar = screen.getByTestId('timeline-zoom-toolbar')
      expect(zoomToolbar.textContent).toContain('100%')
    })
  })
})
