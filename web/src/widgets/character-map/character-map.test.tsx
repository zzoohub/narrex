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
  forceCollide: () => ({ radius: vi.fn().mockReturnThis() }),
  drag: () => ({
    on: vi.fn().mockReturnThis(),
  }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderCharacterMap() {
  return render(() => (
    <I18nProvider initial="en">
      <CharacterMap />
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
})
