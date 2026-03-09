import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@solidjs/testing-library'
import { I18nProvider } from '@/shared/lib/i18n'
import { TimelinePanel, computeFitScale, computeSimultaneousBands } from './index'

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
          status: 'ai_draft', characterIds: [], moodTags: [], content: null, location: null,
          plotSummary: null, startPosition: 0, duration: 1, createdAt: '', updatedAt: '',
        },
        {
          id: 's2', trackId: 't1', projectId: 'p1', title: 'Conflict',
          status: 'empty', characterIds: [], moodTags: [], content: null, location: null,
          plotSummary: null, startPosition: 2, duration: 1, createdAt: '', updatedAt: '',
        },
        {
          id: 's3', trackId: 't2', projectId: 'p1', title: 'Parallel',
          status: 'edited', characterIds: [], moodTags: [], content: null, location: null,
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
          { id: 's1', trackId: 't1', projectId: 'p1', title: 'Opening', status: 'ai_draft', characterIds: [], moodTags: [], content: null, location: null, plotSummary: null, startPosition: 0, duration: 1, createdAt: '', updatedAt: '' },
          { id: 's2', trackId: 't1', projectId: 'p1', title: 'Conflict', status: 'empty', characterIds: [], moodTags: [], content: null, location: null, plotSummary: null, startPosition: 2, duration: 1, createdAt: '', updatedAt: '' },
        ],
      },
      {
        id: 't2', projectId: 'p1', position: 1, label: 'Sub Track', createdAt: '', updatedAt: '',
        scenes: [
          { id: 's3', trackId: 't2', projectId: 'p1', title: 'Parallel', status: 'edited', characterIds: [], moodTags: [], content: null, location: null, plotSummary: null, startPosition: 0, duration: 2, createdAt: '', updatedAt: '' },
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

  describe('timeline hint banner', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('renders timeline hint banner when not dismissed', () => {
      renderTimeline()
      expect(screen.getByText(/starting point/)).toBeInTheDocument()
    })

    it('hides hint after clicking close and persists across re-renders', async () => {
      const { unmount } = renderTimeline()
      const closeBtn = screen.getByText('Close')
      await fireEvent.click(closeBtn)
      expect(screen.queryByText(/starting point/)).not.toBeInTheDocument()
      expect(localStorage.getItem('narrex:timeline-hint-dismissed')).toBe('true')

      // Re-render: hint should stay hidden
      unmount()
      renderTimeline()
      expect(screen.queryByText(/starting point/)).not.toBeInTheDocument()
    })

    it('does not show hint when previously dismissed in localStorage', () => {
      localStorage.setItem('narrex:timeline-hint-dismissed', 'true')
      renderTimeline()
      expect(screen.queryByText(/starting point/)).not.toBeInTheDocument()
    })
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

  describe('computeFitScale', () => {
    const defaults = { trackLabelWidth: 112, minScale: 60, maxScale: 240, defaultScale: 120 }

    it('returns default scale when no scenes exist', () => {
      expect(computeFitScale(800, defaults.trackLabelWidth, [], defaults.minScale, defaults.maxScale, defaults.defaultScale)).toBe(120)
    })

    it('returns default scale when viewport is too narrow for content area', () => {
      const tracks = [{ scenes: [{ startPosition: 0, duration: 1 }] }]
      // viewport=100, label=112 → available = 100 - 112 - 48 = -60 (negative)
      expect(computeFitScale(100, defaults.trackLabelWidth, tracks, defaults.minScale, defaults.maxScale, defaults.defaultScale)).toBe(120)
    })

    it('computes scale to fit all scenes in viewport', () => {
      const tracks = [
        { scenes: [{ startPosition: 0, duration: 1 }, { startPosition: 2, duration: 1 }] },
        { scenes: [{ startPosition: 0, duration: 2 }] },
      ]
      // viewport=800, label=112, padding=48 → available=640
      // maxEnd=3 → idealScale = 640/3 ≈ 213.33
      const result = computeFitScale(800, defaults.trackLabelWidth, tracks, defaults.minScale, defaults.maxScale, defaults.defaultScale)
      expect(result).toBeCloseTo(640 / 3, 1)
    })

    it('clamps to max scale when content is very small', () => {
      const tracks = [{ scenes: [{ startPosition: 0, duration: 0.5 }] }]
      // available=640, maxEnd=0.5 → ideal=1280 → clamped to 240
      expect(computeFitScale(800, defaults.trackLabelWidth, tracks, defaults.minScale, defaults.maxScale, defaults.defaultScale)).toBe(240)
    })

    it('clamps to min scale when content is very large', () => {
      const tracks = [{ scenes: [{ startPosition: 0, duration: 100 }] }]
      // available=640, maxEnd=100 → ideal=6.4 → clamped to 60
      expect(computeFitScale(800, defaults.trackLabelWidth, tracks, defaults.minScale, defaults.maxScale, defaults.defaultScale)).toBe(60)
    })

    it('accounts for scene start positions beyond zero', () => {
      const tracks = [{ scenes: [{ startPosition: 5, duration: 3 }] }]
      // maxEnd=8 → ideal=640/8=80
      expect(computeFitScale(800, defaults.trackLabelWidth, tracks, defaults.minScale, defaults.maxScale, defaults.defaultScale)).toBe(80)
    })
  })

  describe('track collapse (no chevron)', () => {
    it('does not render chevron toggle buttons in track labels', () => {
      renderTimeline()
      expect(screen.queryByLabelText('Collapse track')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Expand track')).not.toBeInTheDocument()
    })

    it('collapses track on double-click of track label', async () => {
      renderTimeline()
      const label = screen.getByText('Main Track')
      await fireEvent.dblClick(label)
      // After collapse, should show scene count instead of clips
      expect(screen.getByText('2 scenes')).toBeInTheDocument()
    })

    it('expands collapsed track on double-click of track label', async () => {
      renderTimeline()
      const label = screen.getByText('Main Track')
      await fireEvent.dblClick(label)
      expect(screen.getByText('2 scenes')).toBeInTheDocument()
      // Double-click again to expand
      const collapsedLabel = screen.getByText('Main Track')
      await fireEvent.dblClick(collapsedLabel)
      expect(screen.getByText('Opening')).toBeInTheDocument()
    })

    it('renders resize handle at bottom of each track', () => {
      renderTimeline()
      const handles = screen.getAllByTestId('track-resize-handle')
      expect(handles).toHaveLength(2)
    })
  })

  describe('computeSimultaneousBands', () => {
    it('returns empty array for single track', () => {
      expect(computeSimultaneousBands([{ scenes: [{ startPosition: 0, duration: 1 }] }])).toEqual([])
    })

    it('returns empty array when no overlapping scenes', () => {
      const tracks = [
        { scenes: [{ startPosition: 0, duration: 1 }] },
        { scenes: [{ startPosition: 2, duration: 1 }] },
      ]
      expect(computeSimultaneousBands(tracks)).toEqual([])
    })

    it('detects overlapping scenes across tracks', () => {
      const tracks = [
        { scenes: [{ startPosition: 0, duration: 2 }] },
        { scenes: [{ startPosition: 1, duration: 2 }] },
      ]
      const bands = computeSimultaneousBands(tracks)
      expect(bands).toEqual([{ start: 1, end: 2 }])
    })

    it('detects multiple overlapping regions', () => {
      const tracks = [
        { scenes: [{ startPosition: 0, duration: 2 }, { startPosition: 5, duration: 2 }] },
        { scenes: [{ startPosition: 1, duration: 2 }, { startPosition: 6, duration: 1 }] },
      ]
      const bands = computeSimultaneousBands(tracks)
      expect(bands.length).toBe(2)
      expect(bands[0]).toEqual({ start: 1, end: 2 })
      expect(bands[1]).toEqual({ start: 6, end: 7 })
    })

    it('handles fully contained scenes', () => {
      const tracks = [
        { scenes: [{ startPosition: 0, duration: 5 }] },
        { scenes: [{ startPosition: 1, duration: 2 }] },
      ]
      const bands = computeSimultaneousBands(tracks)
      expect(bands).toEqual([{ start: 1, end: 3 }])
    })

    it('handles three tracks with pairwise overlaps', () => {
      const tracks = [
        { scenes: [{ startPosition: 0, duration: 3 }] },
        { scenes: [{ startPosition: 1, duration: 3 }] },
        { scenes: [{ startPosition: 2, duration: 3 }] },
      ]
      const bands = computeSimultaneousBands(tracks)
      // Pairs: (0,1) overlap [1,3], (0,2) overlap [2,3], (1,2) overlap [2,4]
      expect(bands.length).toBe(3)
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

  describe('track delete context menu', () => {
    it('disables remove option in context menu when track has scenes', async () => {
      renderTimeline()
      const label = screen.getByText('Main Track')
      await fireEvent.contextMenu(label)
      // The remove option should be disabled and show "(has scenes)" / "(씬 존재)"
      const removeOption = screen.getByText(/has scenes|씬 존재/)
      expect(removeOption.closest('button')).toBeDisabled()
    })

    it('does not open delete dialog when clicking disabled remove option', async () => {
      renderTimeline()
      const label = screen.getByText('Main Track')
      await fireEvent.contextMenu(label)
      const removeOption = screen.getByText(/has scenes|씬 존재/)
      await fireEvent.click(removeOption.closest('button')!)
      // Dialog should NOT appear
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(mockRemoveTrack).not.toHaveBeenCalled()
    })
  })
})
