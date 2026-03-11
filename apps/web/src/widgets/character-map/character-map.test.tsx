import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@solidjs/testing-library'
import { I18nProvider } from '@/shared/lib/i18n'
import { CharacterMap, getNodeRadius, getConnectionCount } from './index'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockAddCharacter = vi.fn()
const mockUpdateCharacter = vi.fn()
const mockRemoveCharacter = vi.fn()
const mockSelectCharacter = vi.fn()
const mockAddRelationship = vi.fn()
const mockRemoveRelationship = vi.fn()

vi.mock('@/features/workspace', () => ({
  useWorkspace: () => ({
    state: {
      characters: [
        {
          id: 'c1', projectId: 'p1', name: 'Hero',
          personality: 'Brave', appearance: 'Tall', secrets: null, motivation: 'Save the world',
          profileImageUrl: null, graphX: 100, graphY: 100,
          createdAt: '', updatedAt: '',
        },
        {
          id: 'c2', projectId: 'p1', name: 'Villain',
          personality: 'Cunning', appearance: 'Dark', secrets: 'Hidden past', motivation: 'Power',
          profileImageUrl: null, graphX: 300, graphY: 100,
          createdAt: '', updatedAt: '',
        },
      ],
      relationships: [
        {
          id: 'r1', projectId: 'p1', characterAId: 'c1', characterBId: 'c2',
          label: 'Enemy', visualType: 'solid', direction: 'bidirectional',
          createdAt: '', updatedAt: '',
        },
      ],
    },
    addCharacter: mockAddCharacter,
    updateCharacter: mockUpdateCharacter,
    removeCharacter: mockRemoveCharacter,
    selectCharacter: mockSelectCharacter,
    addRelationship: mockAddRelationship,
    removeRelationship: mockRemoveRelationship,
    updateRelationship: vi.fn(),
  }),
}))

// D3 needs a bit of mocking since we're in jsdom
vi.mock('d3', () => ({
  forceSimulation: () => ({
    force: vi.fn().mockReturnThis(),
    nodes: vi.fn().mockReturnValue([]),
    on: vi.fn().mockReturnThis(),
    alpha: vi.fn().mockReturnThis(),
    restart: vi.fn(),
    stop: vi.fn(),
    tick: vi.fn(),
    alphaTarget: vi.fn().mockReturnThis(),
  }),
  forceLink: () => ({
    id: vi.fn().mockReturnThis(),
    distance: vi.fn().mockReturnThis(),
    links: vi.fn().mockReturnThis(),
  }),
  forceManyBody: () => ({ strength: vi.fn().mockReturnThis() }),
  forceCenter: () => ({}),
  forceX: () => ({ strength: vi.fn().mockReturnThis() }),
  forceY: () => ({ strength: vi.fn().mockReturnThis() }),
  forceCollide: () => ({ radius: vi.fn().mockReturnThis() }),
  drag: () => ({
    on: vi.fn().mockReturnThis(),
  }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderCharacterMap(props: { fullscreen?: boolean; onExitFullscreen?: () => void; onEnterFullscreen?: () => void } = {}) {
  return render(() => (
    <I18nProvider initial="en">
      <CharacterMap {...props} />
    </I18nProvider>
  ))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// ResizeObserver is not available in jsdom
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

describe('CharacterMap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders add character button', () => {
    renderCharacterMap()
    expect(screen.getByText('Add Character')).toBeInTheDocument()
  })

  it('renders character map header', () => {
    renderCharacterMap()
    expect(screen.getByText('Characters')).toBeInTheDocument()
  })

  it('calls addCharacter when add button clicked', async () => {
    renderCharacterMap()
    const addBtn = screen.getByText('Add Character')
    await fireEvent.click(addBtn)
    expect(mockAddCharacter).toHaveBeenCalled()
  })

  // ── Connection-based node sizing ─────────────────────────────────────

  describe('getConnectionCount', () => {
    it('returns 0 for character with no connections', () => {
      expect(getConnectionCount('c99', [])).toBe(0)
    })

    it('counts connections where character is on either side', () => {
      const rels = [
        { characterAId: 'c1', characterBId: 'c2' },
        { characterAId: 'c3', characterBId: 'c1' },
      ]
      expect(getConnectionCount('c1', rels)).toBe(2)
      expect(getConnectionCount('c2', rels)).toBe(1)
      expect(getConnectionCount('c3', rels)).toBe(1)
    })

    it('counts self-referencing relationship as 1', () => {
      const rels = [{ characterAId: 'c1', characterBId: 'c1' }]
      expect(getConnectionCount('c1', rels)).toBe(1)
    })
  })

  describe('getNodeRadius', () => {
    it('returns base radius for 0 connections', () => {
      expect(getNodeRadius(0)).toBe(22)
    })

    it('increases radius with more connections', () => {
      expect(getNodeRadius(2)).toBeGreaterThan(getNodeRadius(1))
      expect(getNodeRadius(3)).toBeGreaterThan(getNodeRadius(2))
    })

    it('caps radius at maximum value', () => {
      expect(getNodeRadius(25)).toBeLessThanOrEqual(45)
      expect(getNodeRadius(100)).toBeLessThanOrEqual(45)
    })

    it('still grows meaningfully at high connection counts', () => {
      // A protagonist with 20 connections should be noticeably larger than 5
      expect(getNodeRadius(20)).toBeGreaterThan(getNodeRadius(5) + 2)
    })

    it('returns consistent values for same input', () => {
      expect(getNodeRadius(3)).toBe(getNodeRadius(3))
    })
  })

  // ── Fullscreen feature ──────────────────────────────────────────────

  describe('fullscreen mode', () => {
    it('shows maximize button in panel mode', () => {
      renderCharacterMap({ onEnterFullscreen: vi.fn() })
      expect(screen.getByLabelText('View fullscreen')).toBeInTheDocument()
    })

    it('calls onEnterFullscreen when maximize button clicked', async () => {
      const onEnter = vi.fn()
      renderCharacterMap({ onEnterFullscreen: onEnter })
      await fireEvent.click(screen.getByLabelText('View fullscreen'))
      expect(onEnter).toHaveBeenCalledOnce()
    })

    it('shows minimize button in fullscreen mode', () => {
      renderCharacterMap({ fullscreen: true, onExitFullscreen: vi.fn() })
      expect(screen.getByLabelText('Back to panel view')).toBeInTheDocument()
    })

    it('does not show maximize button in fullscreen mode', () => {
      renderCharacterMap({ fullscreen: true, onExitFullscreen: vi.fn() })
      expect(screen.queryByLabelText('View fullscreen')).not.toBeInTheDocument()
    })

    it('calls onExitFullscreen when minimize button clicked', async () => {
      const onExit = vi.fn()
      renderCharacterMap({ fullscreen: true, onExitFullscreen: onExit })
      await fireEvent.click(screen.getByLabelText('Back to panel view'))
      expect(onExit).toHaveBeenCalledOnce()
    })

    it('shows zoom controls in fullscreen mode', () => {
      renderCharacterMap({ fullscreen: true, onExitFullscreen: vi.fn() })
      expect(screen.getByLabelText('Zoom in')).toBeInTheDocument()
      expect(screen.getByLabelText('Zoom out')).toBeInTheDocument()
    })

    it('does not show zoom controls in panel mode', () => {
      renderCharacterMap()
      expect(screen.queryByLabelText('Zoom in')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Zoom out')).not.toBeInTheDocument()
    })

    it('does not show collapse button in fullscreen mode', () => {
      renderCharacterMap({ fullscreen: true, onExitFullscreen: vi.fn() })
      expect(screen.queryByLabelText('Collapse character panel')).not.toBeInTheDocument()
    })
  })
})
