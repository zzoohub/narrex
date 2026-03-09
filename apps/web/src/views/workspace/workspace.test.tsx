import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@solidjs/testing-library'
import { I18nProvider } from '@/shared/lib/i18n'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@tanstack/solid-router', () => ({
  Link: (props: any) => <a href={props.to}>{props.children}</a>,
  useParams: () => () => ({ id: 'p1' }),
}))

vi.mock('@/widgets/config-bar', () => ({
  ConfigBar: (props: any) => (
    <div data-testid="config-bar" data-open={props.open}>
      <button onClick={() => props.onClose?.()}>Close Config</button>
    </div>
  ),
}))

vi.mock('@/widgets/timeline-panel', () => ({
  TimelinePanel: () => <div data-testid="timeline-panel">Timeline</div>,
}))

vi.mock('@/widgets/character-map', () => ({
  CharacterMap: (props: any) => (
    <div data-testid="character-map">
      <button onClick={() => props.onEnterFullscreen?.()}>Fullscreen</button>
      {props.fullscreen && <span>Fullscreen Mode</span>}
      {props.onExitFullscreen && (
        <button onClick={() => props.onExitFullscreen?.()}>Exit Fullscreen</button>
      )}
    </div>
  ),
}))

vi.mock('@/widgets/editor-panel', () => ({
  EditorPanel: () => <div data-testid="editor-panel">Editor</div>,
}))

vi.mock('@/widgets/scene-detail', () => ({
  SceneDetail: () => <div data-testid="scene-detail">Detail</div>,
}))

const mockSelectScene = vi.fn()
const mockRemoveScene = vi.fn()
const mockStartGeneration = vi.fn()
const selectedSceneIdFn = vi.fn().mockReturnValue(null)
const selectedSceneFn = vi.fn().mockReturnValue(null)
const isGeneratingFn = vi.fn().mockReturnValue(false)
const saveStatusFn = vi.fn().mockReturnValue('saved')
const draftContentFn = vi.fn().mockReturnValue('')

vi.mock('@/features/workspace', () => ({
  WorkspaceProvider: (props: any) => props.children,
  useWorkspace: () => ({
    state: { project: { title: 'Test Project' } },
    selectedSceneId: selectedSceneIdFn,
    selectedScene: selectedSceneFn,
    selectScene: mockSelectScene,
    removeScene: mockRemoveScene,
    startGeneration: mockStartGeneration,
    isGenerating: isGeneratingFn,
    saveStatus: saveStatusFn,
    draftContent: draftContentFn,
  }),
}))

// ---------------------------------------------------------------------------
// Lazy import -- after mocks
// ---------------------------------------------------------------------------

const { WorkspaceView } = await import('./index')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderWorkspace(locale: 'en' | 'ko' = 'en') {
  return render(() => (
    <I18nProvider initial={locale}>
      <WorkspaceView />
    </I18nProvider>
  ))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WorkspaceView', () => {
  let originalInnerWidth: number

  beforeEach(() => {
    vi.clearAllMocks()
    selectedSceneIdFn.mockReturnValue(null)
    selectedSceneFn.mockReturnValue(null)
    isGeneratingFn.mockReturnValue(false)
    saveStatusFn.mockReturnValue('saved')
    draftContentFn.mockReturnValue('')
    originalInnerWidth = window.innerWidth
    // Ensure desktop viewport by default
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280,
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    })
  })

  // ── Layout rendering ─────────────────────────────────────────────────

  it('renders project title in header', () => {
    renderWorkspace()
    expect(screen.getByText('Test Project')).toBeInTheDocument()
  })

  it('renders back link to dashboard', () => {
    renderWorkspace()
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/')
  })

  it('renders editor panel', () => {
    renderWorkspace()
    expect(screen.getByTestId('editor-panel')).toBeInTheDocument()
  })

  it('renders timeline panel', () => {
    renderWorkspace()
    expect(screen.getByTestId('timeline-panel')).toBeInTheDocument()
  })

  it('renders save status text', () => {
    renderWorkspace()
    expect(screen.getByText('All changes saved')).toBeInTheDocument()
  })

  // ── Config bar ──────────────────────────────────────────────────────

  it('shows config open button when config is closed', () => {
    renderWorkspace()
    expect(screen.getByLabelText('Open config panel')).toBeInTheDocument()
  })

  it('opens config panel when open button clicked', () => {
    renderWorkspace()
    const openBtn = screen.getByLabelText('Open config panel')
    fireEvent.click(openBtn)
    // After opening, the "Open config panel" button should disappear
    expect(screen.queryByLabelText('Open config panel')).not.toBeInTheDocument()
  })

  // ── Panel visibility ────────────────────────────────────────────────

  it('shows character panel open button when collapsed', () => {
    renderWorkspace()
    // Left panel starts collapsed (leftOpen = false)
    expect(screen.getByLabelText('Open character panel')).toBeInTheDocument()
  })

  it('shows timeline open button when collapsed', () => {
    renderWorkspace()
    // Collapse the timeline first (it starts open)
    const collapseBtn = screen.getByLabelText('Collapse timeline')
    fireEvent.click(collapseBtn)
    expect(screen.getByLabelText('Open timeline')).toBeInTheDocument()
  })

  // ── Scene detail panel ──────────────────────────────────────────────

  it('does not show scene detail when no scene selected', () => {
    selectedSceneIdFn.mockReturnValue(null)
    selectedSceneFn.mockReturnValue(null)
    renderWorkspace()
    expect(screen.queryByTestId('scene-detail')).not.toBeInTheDocument()
  })

  it('shows scene detail when scene is selected', () => {
    selectedSceneIdFn.mockReturnValue('s1')
    selectedSceneFn.mockReturnValue({
      id: 's1',
      trackId: 't1',
      projectId: 'p1',
      title: 'Selected Scene',
      status: 'empty',
      characterIds: [],
      moodTags: [],
      content: null,
      location: null,
      plotSummary: null,
      startPosition: 0,
      duration: 1,
      createdAt: '',
      updatedAt: '',
    })
    renderWorkspace()
    expect(screen.getByTestId('scene-detail')).toBeInTheDocument()
  })

  // ── Save status ─────────────────────────────────────────────────────

  it('shows "All changes saved" when save status is saved', () => {
    saveStatusFn.mockReturnValue('saved')
    renderWorkspace()
    expect(screen.getByText('All changes saved')).toBeInTheDocument()
  })

  it('shows "Saving..." when save status is saving', () => {
    saveStatusFn.mockReturnValue('saving')
    renderWorkspace()
    expect(screen.getByText('Saving...')).toBeInTheDocument()
  })

  // ── Responsive ──────────────────────────────────────────────────────

  it('shows mobile fallback on small screens', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 600,
    })
    renderWorkspace()
    // The mobile fallback shows Korean text about desktop-only
    expect(screen.getByText(/데스크톱용으로/)).toBeInTheDocument()
    // Should NOT render the editor panel
    expect(screen.queryByTestId('editor-panel')).not.toBeInTheDocument()
  })

  // ── Keyboard shortcuts ──────────────────────────────────────────────

  it('deselects scene on Escape key', () => {
    renderWorkspace()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(mockSelectScene).toHaveBeenCalledWith(null)
  })
})
