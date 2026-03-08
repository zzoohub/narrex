import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@solidjs/testing-library'
import { I18nProvider } from '@/shared/lib/i18n'
import { CharacterMap } from './index'

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
    nodes: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    alpha: vi.fn().mockReturnThis(),
    restart: vi.fn(),
    stop: vi.fn(),
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

describe('CharacterMap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
      renderCharacterMap({ fullscreen: true, onCollapse: vi.fn() as any, onExitFullscreen: vi.fn() })
      expect(screen.queryByLabelText('Collapse character panel')).not.toBeInTheDocument()
    })
  })
})
