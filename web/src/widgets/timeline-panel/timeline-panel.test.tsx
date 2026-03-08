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

function renderTimeline() {
  return render(() => (
    <I18nProvider initial="en">
      <TimelinePanel />
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

  it('renders add track button', () => {
    renderTimeline()
    expect(screen.getByText('Add Track')).toBeInTheDocument()
  })

  it('shows track label input when add track button clicked', async () => {
    renderTimeline()
    const addBtn = screen.getByText('Add Track')
    await fireEvent.click(addBtn)
    // Should show an input field for the new track label
    const input = screen.getByPlaceholderText('Add Track')
    expect(input).toBeInTheDocument()
  })

  it('renders timeline header with title', () => {
    renderTimeline()
    expect(screen.getByText('Timeline')).toBeInTheDocument()
  })
})
