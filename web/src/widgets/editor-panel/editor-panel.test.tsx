import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@solidjs/testing-library'
import { I18nProvider } from '@/shared/lib/i18n'
import { EditorPanel } from './index'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/features/generation', () => ({
  streamGeneration: vi.fn(),
  streamEdit: vi.fn(),
}))

const mockSetDraftContent = vi.fn()
const mockMarkSceneEdited = vi.fn()
const mockSelectScene = vi.fn()
const mockStartGeneration = vi.fn()
const mockCancelGeneration = vi.fn()

const selectedSceneFn = vi.fn()
const prevSceneFn = vi.fn().mockReturnValue(undefined)
const nextSceneFn = vi.fn().mockReturnValue(undefined)
const isGeneratingFn = vi.fn().mockReturnValue(false)
const generatingSceneIdFn = vi.fn().mockReturnValue(null)
const streamedContentFn = vi.fn().mockReturnValue('')
const draftContentFn = vi.fn().mockReturnValue('')

vi.mock('@/features/workspace', () => ({
  useWorkspace: () => ({
    selectedScene: selectedSceneFn,
    prevScene: prevSceneFn,
    nextScene: nextSceneFn,
    isGenerating: isGeneratingFn,
    generatingSceneId: generatingSceneIdFn,
    streamedContent: streamedContentFn,
    draftContent: draftContentFn,
    projectId: 'p1',
    setDraftContent: mockSetDraftContent,
    markSceneEdited: mockMarkSceneEdited,
    selectScene: mockSelectScene,
    startGeneration: mockStartGeneration,
    appendStreamContent: vi.fn(),
    finishGeneration: vi.fn(),
    cancelGeneration: mockCancelGeneration,
  }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderEditor() {
  return render(() => (
    <I18nProvider initial="en">
      <EditorPanel />
    </I18nProvider>
  ))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EditorPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectedSceneFn.mockReturnValue(null)
    prevSceneFn.mockReturnValue(undefined)
    nextSceneFn.mockReturnValue(undefined)
    isGeneratingFn.mockReturnValue(false)
    generatingSceneIdFn.mockReturnValue(null)
    streamedContentFn.mockReturnValue('')
    draftContentFn.mockReturnValue('')
  })

  it('shows empty state when no scene is selected', () => {
    selectedSceneFn.mockReturnValue(null)
    renderEditor()
    expect(screen.getByText(/Select a scene on the timeline/)).toBeInTheDocument()
  })

  it('shows scene title when scene is selected', () => {
    selectedSceneFn.mockReturnValue({
      id: 's1', trackId: 't1', projectId: 'p1', title: 'My Scene',
      status: 'empty', characterIds: [], moodTags: [],
      location: null, plotSummary: 'A summary',
      startPosition: 0, duration: 1,
      createdAt: '', updatedAt: '',
    })
    renderEditor()
    expect(screen.getByText('My Scene')).toBeInTheDocument()
  })

  it('shows generate button when scene has plot summary', () => {
    selectedSceneFn.mockReturnValue({
      id: 's1', trackId: 't1', projectId: 'p1', title: 'My Scene',
      status: 'empty', characterIds: [], moodTags: [],
      location: null, plotSummary: 'A summary',
      startPosition: 0, duration: 1,
      createdAt: '', updatedAt: '',
    })
    renderEditor()
    const generateBtns = screen.getAllByText('Generate Draft')
    expect(generateBtns.length).toBeGreaterThan(0)
  })

  it('disables generate button when scene has no plot summary', () => {
    selectedSceneFn.mockReturnValue({
      id: 's1', trackId: 't1', projectId: 'p1', title: 'My Scene',
      status: 'empty', characterIds: [], moodTags: [],
      location: null, plotSummary: null,
      startPosition: 0, duration: 1,
      createdAt: '', updatedAt: '',
    })
    renderEditor()
    // The primary generate buttons should be disabled
    const generateBtns = screen.getAllByText('Generate Draft')
    for (const btn of generateBtns) {
      const buttonEl = btn.closest('button')
      if (buttonEl) {
        expect(buttonEl).toBeDisabled()
      }
    }
  })

  it('shows character count in footer', () => {
    selectedSceneFn.mockReturnValue({
      id: 's1', trackId: 't1', projectId: 'p1', title: 'My Scene',
      status: 'ai_draft', characterIds: [], moodTags: [],
      location: null, plotSummary: 'A summary',
      startPosition: 0, duration: 1,
      createdAt: '', updatedAt: '',
    })
    draftContentFn.mockReturnValue('Hello world')
    renderEditor()
    // Should show "11 characters" (or localized equivalent)
    expect(screen.getByText(/11/)).toBeInTheDocument()
  })

  it('shows streaming content during generation', () => {
    selectedSceneFn.mockReturnValue({
      id: 's1', trackId: 't1', projectId: 'p1', title: 'My Scene',
      status: 'empty', characterIds: [], moodTags: [],
      location: null, plotSummary: 'A summary',
      startPosition: 0, duration: 1,
      createdAt: '', updatedAt: '',
    })
    isGeneratingFn.mockReturnValue(true)
    generatingSceneIdFn.mockReturnValue('s1')
    streamedContentFn.mockReturnValue('Once upon a time...')
    renderEditor()
    expect(screen.getByText('Once upon a time...')).toBeInTheDocument()
    expect(screen.getByText('Generating...')).toBeInTheDocument()
  })

  it('disables prev/next buttons when no adjacent scenes', () => {
    selectedSceneFn.mockReturnValue({
      id: 's1', trackId: 't1', projectId: 'p1', title: 'My Scene',
      status: 'empty', characterIds: [], moodTags: [],
      location: null, plotSummary: null,
      startPosition: 0, duration: 1,
      createdAt: '', updatedAt: '',
    })
    renderEditor()
    const prevBtn = screen.getByLabelText('Previous scene')
    const nextBtn = screen.getByLabelText('Next scene')
    expect(prevBtn).toBeDisabled()
    expect(nextBtn).toBeDisabled()
  })
})
