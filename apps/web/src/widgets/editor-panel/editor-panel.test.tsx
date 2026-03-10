import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@solidjs/testing-library'
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
      status: 'empty', characterIds: [], moodTags: [], content: null,
      location: null, plotSummary: 'A summary',
      startPosition: 0, duration: 1,
      createdAt: '', updatedAt: '',
    })
    renderEditor()
    expect(screen.getByText('My Scene')).toBeInTheDocument()
  })

  it('shows generate button in body CTA when no draft and scene has plot summary', () => {
    selectedSceneFn.mockReturnValue({
      id: 's1', trackId: 't1', projectId: 'p1', title: 'My Scene',
      status: 'empty', characterIds: [], moodTags: [], content: null,
      location: null, plotSummary: 'A summary',
      startPosition: 0, duration: 1,
      createdAt: '', updatedAt: '',
    })
    renderEditor()
    // Body CTA has Generate Draft button
    const generateBtns = screen.getAllByText('Generate Draft')
    expect(generateBtns.length).toBe(1) // only body CTA, not header
  })

  it('disables body CTA generate button when scene has no plot summary', () => {
    selectedSceneFn.mockReturnValue({
      id: 's1', trackId: 't1', projectId: 'p1', title: 'My Scene',
      status: 'empty', characterIds: [], moodTags: [], content: null,
      location: null, plotSummary: null,
      startPosition: 0, duration: 1,
      createdAt: '', updatedAt: '',
    })
    renderEditor()
    const generateBtns = screen.getAllByText('Generate Draft')
    for (const btn of generateBtns) {
      const buttonEl = btn.closest('button')
      if (buttonEl) {
        expect(buttonEl).toBeDisabled()
      }
    }
  })

  it('shows header generate button only when draft exists', () => {
    selectedSceneFn.mockReturnValue({
      id: 's1', trackId: 't1', projectId: 'p1', title: 'My Scene',
      status: 'ai_draft', characterIds: [], moodTags: [], content: null,
      location: null, plotSummary: 'A summary',
      startPosition: 0, duration: 1,
      createdAt: '', updatedAt: '',
    })
    draftContentFn.mockReturnValue('Some draft content')
    renderEditor()
    // Header has Generate Draft, body editor is shown (no body CTA)
    const generateBtns = screen.getAllByText('Generate Draft')
    expect(generateBtns.length).toBe(1) // header only
  })

  it('does not show header generate button when no draft', () => {
    selectedSceneFn.mockReturnValue({
      id: 's1', trackId: 't1', projectId: 'p1', title: 'My Scene',
      status: 'empty', characterIds: [], moodTags: [], content: null,
      location: null, plotSummary: 'A summary',
      startPosition: 0, duration: 1,
      createdAt: '', updatedAt: '',
    })
    draftContentFn.mockReturnValue('')
    renderEditor()
    // Only body CTA Generate Draft — no header generate
    const generateBtns = screen.getAllByText('Generate Draft')
    expect(generateBtns.length).toBe(1)
  })

  it('shows character count in footer', () => {
    selectedSceneFn.mockReturnValue({
      id: 's1', trackId: 't1', projectId: 'p1', title: 'My Scene',
      status: 'ai_draft', characterIds: [], moodTags: [], content: null,
      location: null, plotSummary: 'A summary',
      startPosition: 0, duration: 1,
      createdAt: '', updatedAt: '',
    })
    draftContentFn.mockReturnValue('Hello world')
    renderEditor()
    // Should show "11 characters" (or localized equivalent)
    expect(screen.getByText(/11/)).toBeInTheDocument()
  })

  it('shows "Thinking..." when generation starts but no content yet', () => {
    selectedSceneFn.mockReturnValue({
      id: 's1', trackId: 't1', projectId: 'p1', title: 'My Scene',
      status: 'empty', characterIds: [], moodTags: [], content: null,
      location: null, plotSummary: 'A summary',
      startPosition: 0, duration: 1,
      createdAt: '', updatedAt: '',
    })
    isGeneratingFn.mockReturnValue(true)
    generatingSceneIdFn.mockReturnValue('s1')
    streamedContentFn.mockReturnValue('')
    renderEditor()
    expect(screen.getByText('Thinking...')).toBeInTheDocument()
    expect(screen.queryByText('Generating...')).not.toBeInTheDocument()
  })

  it('shows "Generating..." once streamed content arrives', () => {
    selectedSceneFn.mockReturnValue({
      id: 's1', trackId: 't1', projectId: 'p1', title: 'My Scene',
      status: 'empty', characterIds: [], moodTags: [], content: null,
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
    expect(screen.queryByText('Thinking...')).not.toBeInTheDocument()
  })

  it('populates editable div with draft content on mount', () => {
    selectedSceneFn.mockReturnValue({
      id: 's1', trackId: 't1', projectId: 'p1', title: 'My Scene',
      status: 'ai_draft', characterIds: [], moodTags: [], content: null,
      location: null, plotSummary: 'A summary',
      startPosition: 0, duration: 1,
      createdAt: '', updatedAt: '',
    })
    draftContentFn.mockReturnValue('Generated story content here')
    renderEditor()
    const editable = document.querySelector('[contenteditable]')
    expect(editable).not.toBeNull()
    expect(editable!.textContent).toBe('Generated story content here')
  })

  it('disables prev/next buttons when no adjacent scenes', () => {
    selectedSceneFn.mockReturnValue({
      id: 's1', trackId: 't1', projectId: 'p1', title: 'My Scene',
      status: 'empty', characterIds: [], moodTags: [], content: null,
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

  it('shows stop button during generation', () => {
    selectedSceneFn.mockReturnValue({
      id: 's1', trackId: 't1', projectId: 'p1', title: 'My Scene',
      status: 'empty', characterIds: [], moodTags: [], content: null,
      location: null, plotSummary: 'A summary',
      startPosition: 0, duration: 1, createdAt: '', updatedAt: '',
    })
    isGeneratingFn.mockReturnValue(true)
    generatingSceneIdFn.mockReturnValue('s1')
    streamedContentFn.mockReturnValue('Some content...')
    renderEditor()
    expect(screen.getByText('Stop')).toBeInTheDocument()
  })

  it('shows regeneration confirmation when draft exists and generate clicked', async () => {
    selectedSceneFn.mockReturnValue({
      id: 's1', trackId: 't1', projectId: 'p1', title: 'My Scene',
      status: 'ai_draft', characterIds: [], moodTags: [], content: null,
      location: null, plotSummary: 'A summary',
      startPosition: 0, duration: 1, createdAt: '', updatedAt: '',
    })
    draftContentFn.mockReturnValue('Existing draft content')
    renderEditor()
    const generateBtn = screen.getByText('Generate Draft')
    await fireEvent.click(generateBtn)
    // Dialog should appear
    expect(screen.getByText('Re-generate draft?')).toBeInTheDocument()
  })

  it('shows streamed content character count during generation', () => {
    selectedSceneFn.mockReturnValue({
      id: 's1', trackId: 't1', projectId: 'p1', title: 'My Scene',
      status: 'empty', characterIds: [], moodTags: [], content: null,
      location: null, plotSummary: 'A summary',
      startPosition: 0, duration: 1, createdAt: '', updatedAt: '',
    })
    isGeneratingFn.mockReturnValue(true)
    generatingSceneIdFn.mockReturnValue('s1')
    streamedContentFn.mockReturnValue('Hello world!!')
    renderEditor()
    expect(screen.getByText(/13/)).toBeInTheDocument() // 13 chars
  })

  it('enables prev button when previous scene exists', () => {
    selectedSceneFn.mockReturnValue({
      id: 's2', trackId: 't1', projectId: 'p1', title: 'Scene 2',
      status: 'empty', characterIds: [], moodTags: [], content: null,
      location: null, plotSummary: null,
      startPosition: 1, duration: 1, createdAt: '', updatedAt: '',
    })
    prevSceneFn.mockReturnValue({ id: 's1', title: 'Scene 1' })
    nextSceneFn.mockReturnValue(undefined)
    renderEditor()
    const prevBtn = screen.getByLabelText('Previous scene')
    expect(prevBtn).not.toBeDisabled()
  })

  it('keeps editor content visible during AI edit (no full-screen streaming)', async () => {
    // When AI edit is in progress, the existing content should stay visible
    // (not replaced by the streaming view used for full generation)
    selectedSceneFn.mockReturnValue({
      id: 's1', trackId: 't1', projectId: 'p1', title: 'My Scene',
      status: 'ai_draft', characterIds: [], moodTags: [], content: null,
      location: null, plotSummary: 'A summary',
      startPosition: 0, duration: 1, createdAt: '', updatedAt: '',
    })
    draftContentFn.mockReturnValue('Original draft content here')
    // isGenerating stays false — AI edit does NOT use ws.startGeneration
    isGeneratingFn.mockReturnValue(false)
    renderEditor()
    const editable = document.querySelector('[contenteditable]')
    expect(editable).not.toBeNull()
    expect(editable!.textContent).toBe('Original draft content here')
    // The streaming UI ("Thinking..." / "Generating...") should NOT appear
    expect(screen.queryByText('Thinking...')).not.toBeInTheDocument()
    expect(screen.queryByText('Generating...')).not.toBeInTheDocument()
  })

  it('shows plot summary hint when no plot summary and no draft', () => {
    selectedSceneFn.mockReturnValue({
      id: 's1', trackId: 't1', projectId: 'p1', title: 'My Scene',
      status: 'empty', characterIds: [], moodTags: [], content: null,
      location: null, plotSummary: null,
      startPosition: 0, duration: 1, createdAt: '', updatedAt: '',
    })
    draftContentFn.mockReturnValue('')
    renderEditor()
    // Should show the plotPlaceholder hint
    expect(screen.getByText(/What happens in this scene/)).toBeInTheDocument()
  })
})
