import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@solidjs/testing-library'
import { I18nProvider } from '@/shared/lib/i18n'
import { SceneDetail } from './index'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUpdateScene = vi.fn()
const mockSelectScene = vi.fn()
const mockAssignedCharacters = vi.fn().mockReturnValue([
  { id: 'c1', name: 'Hero', projectId: 'p1', personality: null, appearance: null, secrets: null, motivation: null, profileImageUrl: null, graphX: 0, graphY: 0, createdAt: '', updatedAt: '' },
])
const mockDraftContent = vi.fn().mockReturnValue('')

vi.mock('@/features/workspace', () => ({
  useWorkspace: () => ({
    selectedScene: () => ({
      id: 's1',
      trackId: 't1',
      projectId: 'p1',
      title: 'Opening Scene',
      status: 'ai_draft',
      characterIds: ['c1'],
      location: 'Castle',
      moodTags: ['tense', 'dramatic'],
      content: null,
      plotSummary: 'The hero arrives at the castle.',
      startPosition: 0,
      duration: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }),
    state: {
      characters: [
        { id: 'c1', name: 'Hero', projectId: 'p1', personality: null, appearance: null, secrets: null, motivation: null, profileImageUrl: null, graphX: 0, graphY: 0, createdAt: '', updatedAt: '' },
        { id: 'c2', name: 'Villain', projectId: 'p1', personality: null, appearance: null, secrets: null, motivation: null, profileImageUrl: null, graphX: 0, graphY: 0, createdAt: '', updatedAt: '' },
      ],
    },
    updateScene: mockUpdateScene,
    selectScene: mockSelectScene,
    assignedCharacters: mockAssignedCharacters,
    draftContent: mockDraftContent,
  }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderSceneDetail() {
  return render(() => (
    <I18nProvider initial="en">
      <SceneDetail />
    </I18nProvider>
  ))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SceneDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAssignedCharacters.mockReturnValue([
      { id: 'c1', name: 'Hero' },
    ])
    mockDraftContent.mockReturnValue('')
  })

  it('renders scene title in input', () => {
    renderSceneDetail()
    expect(screen.getByDisplayValue('Opening Scene')).toBeInTheDocument()
  })

  it('renders scene location', () => {
    renderSceneDetail()
    expect(screen.getByDisplayValue('Castle')).toBeInTheDocument()
  })

  it('renders mood tags', () => {
    renderSceneDetail()
    expect(screen.getByText('tense')).toBeInTheDocument()
    expect(screen.getByText('dramatic')).toBeInTheDocument()
  })

  it('renders assigned characters', () => {
    renderSceneDetail()
    expect(screen.getByText('Hero')).toBeInTheDocument()
  })

  it('renders plot summary', () => {
    renderSceneDetail()
    expect(screen.getByDisplayValue('The hero arrives at the castle.')).toBeInTheDocument()
  })

  it('renders scene status badge', () => {
    renderSceneDetail()
    expect(screen.getByText('AI Draft')).toBeInTheDocument()
  })

  it('closes scene detail when close button clicked', async () => {
    renderSceneDetail()
    const closeBtn = screen.getByLabelText('Close')
    await fireEvent.click(closeBtn)
    expect(mockSelectScene).toHaveBeenCalledWith(null)
  })

  it('shows add character button', () => {
    renderSceneDetail()
    // Both characters and mood sections have "Add" buttons
    const addButtons = screen.getAllByText('Add')
    expect(addButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('shows add mood tag button', () => {
    renderSceneDetail()
    // There should be "Add" buttons in both characters and mood sections
    const addButtons = screen.getAllByText('Add')
    expect(addButtons.length).toBeGreaterThan(0)
  })
})
