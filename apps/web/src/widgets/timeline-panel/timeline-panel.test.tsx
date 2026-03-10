import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@solidjs/testing-library'
import { I18nProvider } from '@/shared/lib/i18n'
import { TimelinePanel, computeFitScale, computeSimultaneousBands, computeTimelineWidth } from './index'

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

let mockSelectedSceneId: string | null = null

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
    selectedSceneId: () => mockSelectedSceneId,
    prevScene: () => {
      if (mockSelectedSceneId === 's2') return { id: 's1', trackId: 't1', startPosition: 0, duration: 1, title: 'Opening', status: 'ai_draft' } as any
      return undefined
    },
    nextScene: () => {
      if (mockSelectedSceneId === 's1') return { id: 's2', trackId: 't1', startPosition: 2, duration: 1, title: 'Conflict', status: 'empty' } as any
      return undefined
    },
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
      <TimelinePanel {...(props.onCollapse ? { onCollapse: props.onCollapse } : {})} />
    </I18nProvider>
  ))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TimelinePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelectedSceneId = null
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

  describe('computeTimelineWidth', () => {
    it('returns at least viewportWidth when content is small', () => {
      // contentEnd=5, scale=120, viewportWidth=800, labelWidth=112
      // contentPx = 5 * 120 = 600, viewportContent = 800 - 112 = 688
      // max(600, 688) + 688 = 1376
      const result = computeTimelineWidth(5, 120, 800, 112)
      expect(result).toBe(688 + 688)
    })

    it('extends beyond content when content is larger than viewport', () => {
      // contentEnd=20, scale=120, viewportWidth=800, labelWidth=112
      // contentPx = 20 * 120 = 2400, viewportContent = 688
      // max(2400, 688) + 688 = 3088
      const result = computeTimelineWidth(20, 120, 800, 112)
      expect(result).toBe(2400 + 688)
    })

    it('handles zero viewport gracefully', () => {
      const result = computeTimelineWidth(5, 120, 0, 112)
      // viewportContent = max(0, 0-112) = 0, contentPx = 600
      // max(600, 0) + 0 = 600
      expect(result).toBe(600)
    })

    it('always provides scrollable space beyond content', () => {
      const contentEnd = 10
      const scale = 120
      const vp = 800
      const lw = 112
      const result = computeTimelineWidth(contentEnd, scale, vp, lw)
      const contentPx = contentEnd * scale
      expect(result).toBeGreaterThan(contentPx)
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

  describe('add scene button in track label', () => {
    it('renders add-scene button inside each track label area', () => {
      renderTimeline()
      const buttons = screen.getAllByLabelText('Add scene')
      expect(buttons).toHaveLength(2)
    })

    it('calls addScene with track id and end position on click', async () => {
      renderTimeline()
      const buttons = screen.getAllByLabelText('Add scene')
      // First track (t1): scenes end at max(0+1, 2+1) = 3
      await fireEvent.click(buttons[0]!)
      expect(mockAddScene).toHaveBeenCalledWith('t1', 3)
    })

    it('shows add-scene button even when track is collapsed', async () => {
      renderTimeline()
      // Collapse first track
      const label = screen.getByText('Main Track')
      await fireEvent.dblClick(label)
      expect(screen.getByText('2 scenes')).toBeInTheDocument()
      // Button should still be present
      const buttons = screen.getAllByLabelText('Add scene')
      expect(buttons.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('connection lines', () => {
    it('renders connection paths with sufficient visibility', () => {
      const { container } = renderTimeline()
      const svgHtml = container.innerHTML
      // Mock has one connection (s1 → s3, branch) — path should be rendered
      expect(svgHtml).toContain('<path')
      // Stroke width must be >= 2 for good visibility
      expect(svgHtml).toMatch(/stroke-width="[2-9]/)
      // Opacity must be >= 0.8 for good visibility
      expect(svgHtml).toMatch(/opacity="0\.[89]/)
    })

    it('renders branch connections with accent color and solid stroke', () => {
      const { container } = renderTimeline()
      const svgHtml = container.innerHTML
      expect(svgHtml).toContain('stroke="var(--accent)"')
      // Branch connections should NOT have a dasharray (solid line)
      // Check that the path with accent color has stroke-dasharray="none"
      expect(svgHtml).toContain('stroke-dasharray="none"')
    })
  })

  describe('keyboard shortcuts', () => {
    describe('zoom (Ctrl/⌘ + =/−)', () => {
      it('Ctrl+= zooms in', async () => {
        renderTimeline()
        await fireEvent.keyDown(document, { key: '=', ctrlKey: true })
        expect(screen.getByTestId('timeline-zoom-toolbar').textContent).toContain('125%')
      })

      it('Ctrl+- zooms out', async () => {
        renderTimeline()
        await fireEvent.keyDown(document, { key: '-', ctrlKey: true })
        expect(screen.getByTestId('timeline-zoom-toolbar').textContent).toContain('75%')
      })

      it('Meta+= zooms in on macOS', async () => {
        renderTimeline()
        await fireEvent.keyDown(document, { key: '=', metaKey: true })
        expect(screen.getByTestId('timeline-zoom-toolbar').textContent).toContain('125%')
      })

      it('Meta+- zooms out on macOS', async () => {
        renderTimeline()
        await fireEvent.keyDown(document, { key: '-', metaKey: true })
        expect(screen.getByTestId('timeline-zoom-toolbar').textContent).toContain('75%')
      })

      it('clamps zoom in at max scale', async () => {
        renderTimeline()
        // Zoom in many times to exceed max
        for (let i = 0; i < 10; i++) {
          await fireEvent.keyDown(document, { key: '=', ctrlKey: true })
        }
        // MAX_SCALE=240, DEFAULT_SCALE=120 → 200% max
        expect(screen.getByTestId('timeline-zoom-toolbar').textContent).toContain('200%')
      })

      it('clamps zoom out at min scale', async () => {
        renderTimeline()
        for (let i = 0; i < 10; i++) {
          await fireEvent.keyDown(document, { key: '-', ctrlKey: true })
        }
        // MIN_SCALE=60, DEFAULT_SCALE=120 → 50% min
        expect(screen.getByTestId('timeline-zoom-toolbar').textContent).toContain('50%')
      })
    })

    describe('fit to window (Shift+Z)', () => {
      it('Shift+Z resets zoom to fit', async () => {
        renderTimeline()
        // Change zoom first
        await fireEvent.keyDown(document, { key: '=', ctrlKey: true })
        expect(screen.getByTestId('timeline-zoom-toolbar').textContent).toContain('125%')
        // Fit
        await fireEvent.keyDown(document, { key: 'Z', shiftKey: true })
        expect(screen.getByTestId('timeline-zoom-toolbar').textContent).toContain('100%')
      })

      it('lowercase shift+z also works', async () => {
        renderTimeline()
        await fireEvent.keyDown(document, { key: '=', ctrlKey: true })
        await fireEvent.keyDown(document, { key: 'z', shiftKey: true })
        expect(screen.getByTestId('timeline-zoom-toolbar').textContent).toContain('100%')
      })

      it('Ctrl+Shift+Z does not trigger fit (reserved for undo)', async () => {
        renderTimeline()
        await fireEvent.keyDown(document, { key: '=', ctrlKey: true })
        expect(screen.getByTestId('timeline-zoom-toolbar').textContent).toContain('125%')
        await fireEvent.keyDown(document, { key: 'Z', shiftKey: true, ctrlKey: true })
        // Should remain at 125%
        expect(screen.getByTestId('timeline-zoom-toolbar').textContent).toContain('125%')
      })
    })

    describe('track navigation (ArrowUp/ArrowDown)', () => {
      it('ArrowDown from track 1 selects nearest scene on track 2', async () => {
        mockSelectedSceneId = 's1' // t1, position 0
        renderTimeline()
        await fireEvent.keyDown(document, { key: 'ArrowDown' })
        // s3 on t2 at position 0 is nearest
        expect(mockSelectScene).toHaveBeenCalledWith('s3')
      })

      it('ArrowUp from track 2 selects nearest scene on track 1', async () => {
        mockSelectedSceneId = 's3' // t2, position 0
        renderTimeline()
        await fireEvent.keyDown(document, { key: 'ArrowUp' })
        // s1 on t1 at position 0 is nearest (closer than s2 at position 2)
        expect(mockSelectScene).toHaveBeenCalledWith('s1')
      })

      it('ArrowUp on topmost track does nothing', async () => {
        mockSelectedSceneId = 's1' // already on t1 (top)
        renderTimeline()
        await fireEvent.keyDown(document, { key: 'ArrowUp' })
        expect(mockSelectScene).not.toHaveBeenCalled()
      })

      it('ArrowDown on bottommost track does nothing', async () => {
        mockSelectedSceneId = 's3' // on t2 (bottom)
        renderTimeline()
        await fireEvent.keyDown(document, { key: 'ArrowDown' })
        expect(mockSelectScene).not.toHaveBeenCalled()
      })

      it('selects nearest scene by position when multiple on target track', async () => {
        mockSelectedSceneId = 's3' // t2, position 0
        renderTimeline()
        await fireEvent.keyDown(document, { key: 'ArrowUp' })
        // t1 has s1(pos=0) and s2(pos=2), s1 is nearest to pos 0
        expect(mockSelectScene).toHaveBeenCalledWith('s1')
      })
    })

    describe('duplicate scene (Ctrl/⌘+D)', () => {
      it('Ctrl+D duplicates selected scene after its end', async () => {
        mockSelectedSceneId = 's1' // t1, pos=0, dur=1 → end=1
        renderTimeline()
        await fireEvent.keyDown(document, { key: 'd', ctrlKey: true })
        expect(mockAddScene).toHaveBeenCalledWith('t1', 1)
      })

      it('Meta+D duplicates on macOS', async () => {
        mockSelectedSceneId = 's2' // t1, pos=2, dur=1 → end=3
        renderTimeline()
        await fireEvent.keyDown(document, { key: 'd', metaKey: true })
        expect(mockAddScene).toHaveBeenCalledWith('t1', 3)
      })

      it('does nothing when no scene selected', async () => {
        mockSelectedSceneId = null
        renderTimeline()
        await fireEvent.keyDown(document, { key: 'd', ctrlKey: true })
        expect(mockAddScene).not.toHaveBeenCalled()
      })
    })

    describe('does not fire in text inputs', () => {
      it('Shift+Z does not trigger fit when typing in input', async () => {
        renderTimeline()
        await fireEvent.keyDown(document, { key: '=', ctrlKey: true })
        expect(screen.getByTestId('timeline-zoom-toolbar').textContent).toContain('125%')
        // Simulate keydown with target being an input
        const input = document.createElement('input')
        document.body.appendChild(input)
        await fireEvent.keyDown(input, { key: 'Z', shiftKey: true })
        // Should still be 125%
        expect(screen.getByTestId('timeline-zoom-toolbar').textContent).toContain('125%')
        document.body.removeChild(input)
      })

      it('Ctrl+D does not duplicate when typing in input', async () => {
        mockSelectedSceneId = 's1'
        renderTimeline()
        const input = document.createElement('input')
        document.body.appendChild(input)
        await fireEvent.keyDown(input, { key: 'd', ctrlKey: true })
        expect(mockAddScene).not.toHaveBeenCalled()
        document.body.removeChild(input)
      })
    })

    describe('horizontal scroll (wheel)', () => {
      it('redirects vertical wheel to horizontal scroll', () => {
        const { container } = renderTimeline()
        const body = container.querySelector('.flex-1.overflow-auto') as HTMLElement
        expect(body).toBeTruthy()
        // Fire a vertical wheel event (mouse wheel)
        const event = new WheelEvent('wheel', { deltaY: 100, deltaX: 0, bubbles: true })
        const spy = vi.spyOn(event, 'preventDefault')
        body.dispatchEvent(event)
        expect(spy).toHaveBeenCalled()
      })

      it('preserves Ctrl+wheel for zoom (does not scroll)', () => {
        const { container } = renderTimeline()
        const body = container.querySelector('.flex-1.overflow-auto') as HTMLElement
        const event = new WheelEvent('wheel', { deltaY: -100, deltaX: 0, ctrlKey: true, bubbles: true })
        const spy = vi.spyOn(event, 'preventDefault')
        body.dispatchEvent(event)
        // Should still call preventDefault (for zoom), not for scroll
        expect(spy).toHaveBeenCalled()
      })
    })
  })

  describe('keyboard shortcuts modal', () => {
    it('renders shortcuts help button in header', () => {
      renderTimeline()
      const header = screen.getByTestId('timeline-header')
      const btn = screen.getByLabelText(/Keyboard shortcuts|단축키/)
      expect(header.contains(btn)).toBe(true)
    })

    it('opens modal on button click', async () => {
      renderTimeline()
      await fireEvent.click(screen.getByLabelText(/Keyboard shortcuts|단축키/))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('? key opens modal', async () => {
      renderTimeline()
      await fireEvent.keyDown(document, { key: '?' })
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('Escape closes modal', async () => {
      renderTimeline()
      await fireEvent.click(screen.getByLabelText(/Keyboard shortcuts|단축키/))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      await fireEvent.keyDown(document, { key: 'Escape' })
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('displays shortcut entries', async () => {
      renderTimeline()
      await fireEvent.click(screen.getByLabelText(/Keyboard shortcuts|단축키/))
      expect(screen.getByText(/Zoom in|줌 인/)).toBeInTheDocument()
      expect(screen.getByText(/Zoom out|줌 아웃/)).toBeInTheDocument()
      expect(screen.getByText(/Duplicate|복제/)).toBeInTheDocument()
    })

    it('blocks other shortcuts when modal is open', async () => {
      renderTimeline()
      await fireEvent.click(screen.getByLabelText(/Keyboard shortcuts|단축키/))
      const zoomBefore = screen.getByTestId('timeline-zoom-toolbar').textContent
      await fireEvent.keyDown(document, { key: '=', ctrlKey: true })
      // Zoom should not change
      expect(screen.getByTestId('timeline-zoom-toolbar').textContent).toBe(zoomBefore)
    })
  })

  describe('track context menu', () => {
    it('shows add scene option in track context menu', async () => {
      renderTimeline()
      const label = screen.getByText('Main Track')
      await fireEvent.contextMenu(label)
      expect(screen.getByText(/Add Scene|씬 추가/)).toBeInTheDocument()
    })

    it('calls addScene when clicking add scene in context menu', async () => {
      renderTimeline()
      const label = screen.getByText('Main Track')
      await fireEvent.contextMenu(label)
      const addOption = screen.getByText(/Add Scene|씬 추가/)
      await fireEvent.click(addOption.closest('button')!)
      expect(mockAddScene).toHaveBeenCalledWith('t1', expect.any(Number))
    })

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
