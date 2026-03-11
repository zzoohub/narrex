import { createSignal, createEffect, Show, onCleanup } from 'solid-js'
import { useI18n } from '@/shared/lib/i18n'
import { useWorkspace } from '@/features/workspace'
import { streamGeneration, streamEdit } from '@/features/generation'
import { useAuth } from '@/shared/stores/auth'
import { LoginGateModal } from '@/features/auth'
import { ApiError } from '@/shared/api'
import type { QuotaInfo } from '@/entities/quota'
import {
  Button,
  Dialog,
  IconChevronLeft,
  IconChevronRight,
  IconSparkles,
  IconBold,
  IconItalic,
  IconStop,
} from '@/shared/ui'

export function EditorPanel() {
  const { t } = useI18n()
  const ws = useWorkspace()
  const { isGuest } = useAuth()

  // ---- Login gate for AI features -----------------------------------------
  const [loginGateOpen, setLoginGateOpen] = createSignal(false)

  // ---- Local state ----------------------------------------------------------

  let abortRef: (() => void) | null = null
  let editorEl: HTMLDivElement | undefined

  const [showToolbar, setShowToolbar] = createSignal(false)
  const [toolbarPos, setToolbarPos] = createSignal({ x: 0, y: 0 })
  const [showAiInput, setShowAiInput] = createSignal(false)
  const [aiDirection, setAiDirection] = createSignal('')
  const [showRegenDialog, setShowRegenDialog] = createSignal(false)
  const [isEditing, setIsEditing] = createSignal(false)
  const [editSelection, setEditSelection] = createSignal<{
    text: string
    start: number
    end: number
  } | null>(null)
  const [quotaWarning, setQuotaWarning] = createSignal<QuotaInfo | null>(null)
  const [quotaError, setQuotaError] = createSignal<string | null>(null)

  // ---- Undo/Redo stack (per scene) ----------------------------------------

  const undoStacks = new Map<string, string[]>()
  const redoStacks = new Map<string, string[]>()
  const MAX_UNDO = 50

  function pushUndo(sceneId: string, content: string) {
    let stack = undoStacks.get(sceneId)
    if (!stack) { stack = []; undoStacks.set(sceneId, stack) }
    if (stack[stack.length - 1] === content) return
    stack.push(content)
    if (stack.length > MAX_UNDO) stack.shift()
    // Clear redo on new edit
    redoStacks.set(sceneId, [])
  }

  function undo() {
    const s = scene()
    if (!s) return
    const stack = undoStacks.get(s.id)
    if (!stack || stack.length < 2) return
    const current = stack.pop()!
    let redo = redoStacks.get(s.id)
    if (!redo) { redo = []; redoStacks.set(s.id, redo) }
    redo.push(current)
    const prev = stack[stack.length - 1]!
    ws.setDraftContent(s.id, prev)
    if (editorEl) editorEl.textContent = prev
  }

  function redo() {
    const s = scene()
    if (!s) return
    const stack = redoStacks.get(s.id)
    if (!stack || stack.length === 0) return
    const next = stack.pop()!
    let undoStack = undoStacks.get(s.id)
    if (!undoStack) { undoStack = []; undoStacks.set(s.id, undoStack) }
    undoStack.push(next)
    ws.setDraftContent(s.id, next)
    if (editorEl) editorEl.textContent = next
  }

  // Keyboard shortcut for undo/redo
  function handleUndoRedoKey(e: KeyboardEvent) {
    const meta = e.metaKey || e.ctrlKey
    if (!meta) return
    if (e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      undo()
    } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
      e.preventDefault()
      redo()
    }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', handleUndoRedoKey)
    onCleanup(() => document.removeEventListener('keydown', handleUndoRedoKey))
  }

  // ---- Helpers ---------------------------------------------------------------

  /** Get character offset from DOM selection endpoint relative to container. */
  function getTextOffset(container: Node, node: Node, offset: number): number {
    const range = document.createRange()
    range.setStart(container, 0)
    range.setEnd(node, offset)
    return range.toString().length
  }

  /** Capture current selection range as character offsets in the editor text. */
  function captureSelection(): { text: string; start: number; end: number } | null {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.rangeCount || !editorEl) return null
    if (!editorEl.contains(sel.anchorNode)) return null
    const range = sel.getRangeAt(0)
    const text = sel.toString()
    const start = getTextOffset(editorEl, range.startContainer, range.startOffset)
    return { text, start, end: start + text.length }
  }

  // ---- Derived --------------------------------------------------------------

  const scene = () => ws.selectedScene()
  const hasDraft = () => {
    const s = scene()
    return s ? ws.draftContent(s.id).length > 0 : false
  }

  // ---- Selection-change listener for floating toolbar -----------------------

  function handleSelectionChange() {
    if (ws.isGenerating()) {
      setShowToolbar(false)
      return
    }
    // Don't dismiss AI input overlay on selection changes
    if (showAiInput()) return
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      setShowToolbar(false)
      return
    }
    // Only show toolbar if selection is within our editor
    if (editorEl && !editorEl.contains(sel.anchorNode)) {
      setShowToolbar(false)
      return
    }
    const range = sel.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    setToolbarPos({ x: rect.left + rect.width / 2, y: rect.top })
    setShowToolbar(true)
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('selectionchange', handleSelectionChange)
    onCleanup(() => {
      document.removeEventListener('selectionchange', handleSelectionChange)
    })
  }

  // ---- Sync editor content when scene changes ------------------------------

  createEffect(() => {
    const s = scene()
    if (!editorEl || !s) return
    const content = ws.draftContent(s.id)
    // Only update DOM if it doesn't match (avoids clobbering cursor position)
    if (editorEl.textContent !== content) {
      editorEl.textContent = content
    }
    // Seed undo stack with initial content
    if (content && !undoStacks.has(s.id)) {
      undoStacks.set(s.id, [content])
    }
  })

  // ---- AI generation --------------------------------------------------------

  async function handleGenerate() {
    if (isGuest()) { setLoginGateOpen(true); return }
    const s = scene()
    if (!s) return
    setQuotaError(null)
    ws.startGeneration(s.id)
    const { stream, abort } = streamGeneration(ws.projectId, s.id)
    abortRef = abort
    try {
      for await (const event of stream) {
        if (event.event === 'token') {
          ws.appendStreamContent((event.data as { text: string }).text)
        } else if (event.event === 'completed') {
          const data = event.data as { draft?: unknown; quota?: QuotaInfo }
          if (data.quota?.warning) {
            setQuotaWarning(data.quota)
          }
          ws.finishGeneration(ws.streamedContent())
          break
        }
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setQuotaError(t('quota.exceeded', { date: new Date().toLocaleDateString() }))
      }
      ws.cancelGeneration()
    } finally {
      abortRef = null
    }
  }

  function handleStop() {
    abortRef?.()
    abortRef = null
    if (isEditing()) {
      setIsEditing(false)
    } else {
      ws.cancelGeneration()
    }
  }

  function handleRegenerate() {
    if (isGuest()) { setLoginGateOpen(true); return }
    setShowRegenDialog(true)
  }

  function confirmRegenerate() {
    const s = scene()
    if (!s) return
    ws.setDraftContent(s.id, '')
    handleGenerate()
  }

  // ---- AI edit (floating toolbar) -------------------------------------------

  async function handleAiEdit() {
    if (isGuest()) { setLoginGateOpen(true); return }
    const s = scene()
    if (!s) return
    const direction = aiDirection()
    if (!direction.trim()) return

    const selection = editSelection()
    setShowAiInput(false)
    setShowToolbar(false)
    setAiDirection('')
    setQuotaError(null)

    const originalContent = ws.draftContent(s.id)
    pushUndo(s.id, originalContent)

    // Compute before/after slices for in-place splicing
    const before = selection ? originalContent.slice(0, selection.start) : ''
    const after = selection ? originalContent.slice(selection.end) : ''

    setIsEditing(true)
    let replacement = ''
    const { stream, abort } = streamEdit(ws.projectId, s.id, {
      content: originalContent,
      selectedText: selection?.text ?? null,
      direction,
    })
    abortRef = abort
    try {
      for await (const event of stream) {
        if (event.event === 'token') {
          replacement += (event.data as { text: string }).text
          // Live update: splice replacement into the selected region
          if (selection && editorEl) {
            editorEl.textContent = before + replacement + after
          }
        } else if (event.event === 'completed') {
          const data = event.data as { draft?: unknown; quota?: QuotaInfo }
          if (data.quota?.warning) {
            setQuotaWarning(data.quota)
          }
          const finalContent = selection
            ? before + replacement + after
            : replacement
          ws.setDraftContent(s.id, finalContent)
          if (editorEl) editorEl.textContent = finalContent
          break
        }
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setQuotaError(t('quota.exceeded', { date: new Date().toLocaleDateString() }))
      }
      // Restore original on error
      ws.setDraftContent(s.id, originalContent)
      if (editorEl) editorEl.textContent = originalContent
    } finally {
      setIsEditing(false)
      setEditSelection(null)
      abortRef = null
    }
  }

  // ---- Formatting commands --------------------------------------------------

  function execBold() {
    document.execCommand('bold')
  }

  function execItalic() {
    document.execCommand('italic')
  }

  // ---- Navigation -----------------------------------------------------------

  function handlePrev() {
    const prev = ws.prevScene()
    if (prev) ws.selectScene(prev.id)
  }

  function handleNext() {
    const next = ws.nextScene()
    if (next) ws.selectScene(next.id)
  }

  // ---- Editor input handler -------------------------------------------------

  function handleEditorInput() {
    const s = scene()
    if (!s || !editorEl) return
    const text = editorEl.textContent ?? ''
    pushUndo(s.id, text)
    ws.setDraftContent(s.id, text)
    // Mark as edited on first manual edit after AI draft
    if (s.status === 'ai_draft') {
      ws.markSceneEdited(s.id)
    }
  }

  // ---- Render ---------------------------------------------------------------

  return (
    <div class="flex flex-col h-full bg-canvas">
      <Show
        when={scene()}
        fallback={
          /* -- No scene selected ----------------------------------------- */
          <div class="flex-1 flex flex-col items-center justify-center px-8 text-center">
            <div class="w-20 h-20 rounded-2xl bg-surface border border-border-default flex items-center justify-center mb-6">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                class="text-fg-muted"
              >
                <path d="M4 6h16M4 12h16M4 18h8" stroke-linecap="round" />
              </svg>
            </div>
            <p class="text-fg-muted text-sm leading-relaxed max-w-xs">
              {t('editor.selectScene')}
            </p>
          </div>
        }
      >
        {(s) => (
          <>
            {/* -- Header -------------------------------------------------- */}
            <div class="relative flex items-center px-4 h-9 border-b border-border-subtle flex-shrink-0">
              {/* Centered: prev / title / next */}
              <div class="absolute inset-0 flex items-center justify-center gap-2 pointer-events-none">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={!ws.prevScene()}
                  class="p-1 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer pointer-events-auto"
                  aria-label="Previous scene"
                >
                  <IconChevronLeft size={16} />
                </button>
                <span class="text-sm font-medium text-fg truncate max-w-[200px]">
                  {s().title}
                </span>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!ws.nextScene()}
                  class="p-1 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer pointer-events-auto"
                  aria-label="Next scene"
                >
                  <IconChevronRight size={16} />
                </button>
              </div>

              {/* Actions — right side */}
              <div class="ml-auto flex items-center gap-2 z-10">
                <Show when={(ws.isGenerating() && ws.generatingSceneId() === s().id) || isEditing()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={() => <IconStop size={14} />}
                    onClick={handleStop}
                  >
                    {t('editor.stop')}
                  </Button>
                </Show>
                <Show when={hasDraft() && !ws.isGenerating() && !isEditing()}>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={() => <IconSparkles size={14} />}
                    onClick={handleRegenerate}
                    disabled={!s().plotSummary}
                  >
                    {t('editor.generate')}
                  </Button>
                </Show>
              </div>
            </div>

            {/* -- Quota warning / error banners ----------------------------- */}
            <Show when={quotaError()}>
              <div class="px-4 py-2.5 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm">
                {quotaError()}
              </div>
            </Show>
            <Show when={quotaWarning() && !quotaError()}>
              <div class="flex items-center justify-between px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-sm">
                <span>{t('quota.warning', { used: quotaWarning()!.used, limit: quotaWarning()!.limit })}</span>
                <button
                  type="button"
                  class="text-amber-500/60 hover:text-amber-400 text-xs cursor-pointer"
                  onClick={() => setQuotaWarning(null)}
                >
                  {t('common.close')}
                </button>
              </div>
            </Show>

            {/* -- Body ---------------------------------------------------- */}
            <div class="flex-1 overflow-y-auto relative">
              <Show
                when={hasDraft() || (ws.isGenerating() && ws.generatingSceneId() === s().id)}
                fallback={
                  /* -- Empty: scene selected, no draft -------------------- */
                  <div class="flex flex-col items-center justify-center h-full px-8 text-center">
                    <p class="text-lg font-display text-fg mb-2">
                      {t('editor.readyTitle')}
                    </p>
                    <p class="text-sm text-fg-muted max-w-sm leading-relaxed mb-6">
                      {t('editor.readyDescription')}
                    </p>
                    <Button
                      variant="primary"
                      size="lg"
                      icon={() => <IconSparkles size={18} />}
                      disabled={!s().plotSummary}
                      onClick={handleGenerate}
                    >
                      {t('editor.generate')}
                    </Button>
                    <Show when={!s().plotSummary}>
                      <p class="text-xs text-fg-muted mt-3">
                        {t('sceneDetail.plotPlaceholder')}
                      </p>
                    </Show>
                  </div>
                }
              >
                {/* -- Prose editor ---------------------------------------- */}
                <div class="p-6 max-w-2xl mx-auto">
                  <Show
                    when={!(ws.isGenerating() && ws.generatingSceneId() === s().id)}
                    fallback={
                      /* Streaming generation state */
                      <div class="animate-fade-in">
                        <div
                          class="text-fg text-[15px] leading-[1.85] stream-cursor"
                          style={{ 'white-space': 'pre-wrap' }}
                        >
                          {ws.streamedContent()}
                        </div>
                        <div class="flex items-center gap-2 text-accent text-sm mt-6">
                          <span
                            class="inline-block w-2 h-2 rounded-full bg-accent"
                            style={{ animation: 'pulse-dot 1.2s ease-in-out infinite' }}
                          />
                          {ws.streamedContent() ? t('editor.generating') : t('editor.thinking')}
                        </div>
                      </div>
                    }
                  >
                    {/* Editable content */}
                    <div class="relative">
                      <div
                        ref={(el) => {
                          editorEl = el
                          // Sync content on mount (fixes stale ref after generation completes)
                          const sc = scene()
                          if (sc) {
                            const content = ws.draftContent(sc.id)
                            if (el.textContent !== content) {
                              el.textContent = content
                            }
                            if (content && !undoStacks.has(sc.id)) {
                              undoStacks.set(sc.id, [content])
                            }
                          }
                        }}
                        contentEditable={!isEditing()}
                        class="outline-none text-fg text-[15px] leading-[1.85] min-h-[50vh]"
                        classList={{ 'opacity-60': isEditing() }}
                        style={{ 'white-space': 'pre-wrap' }}
                        spellcheck={false}
                        onInput={handleEditorInput}
                      />
                      {/* Inline editing indicator */}
                      <Show when={isEditing()}>
                        <div class="absolute inset-0 flex items-start justify-center pt-12 pointer-events-none">
                          <div class="flex items-center gap-2 text-accent text-sm px-4 py-2 bg-surface border border-accent/30 rounded-xl shadow-lg pointer-events-auto">
                            <span
                              class="inline-block w-2 h-2 rounded-full bg-accent"
                              style={{ animation: 'pulse-dot 1.2s ease-in-out infinite' }}
                            />
                            {t('editor.editing')}
                            <Button variant="ghost" size="sm" icon={() => <IconStop size={14} />} onClick={handleStop}>
                              {t('editor.stop')}
                            </Button>
                          </div>
                        </div>
                      </Show>
                    </div>
                  </Show>
                </div>

                {/* -- Floating toolbar (shown when text selected) --------- */}
                <Show when={showToolbar() && !showAiInput() && !ws.isGenerating()}>
                  <div
                    class="fixed flex items-center gap-1 px-2 py-1.5 bg-surface border border-border-default rounded-xl shadow-xl shadow-canvas/50 z-30 animate-scale-in"
                    style={{
                      left: `${toolbarPos().x}px`,
                      top: `${toolbarPos().y - 48}px`,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <button
                      type="button"
                      class="p-2 rounded-lg text-fg-secondary hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
                      onClick={execBold}
                    >
                      <IconBold size={16} />
                    </button>
                    <button
                      type="button"
                      class="p-2 rounded-lg text-fg-secondary hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
                      onClick={execItalic}
                    >
                      <IconItalic size={16} />
                    </button>
                    <div class="w-px h-5 bg-border-default mx-1" />
                    <button
                      type="button"
                      class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-accent text-sm font-medium hover:bg-accent-muted transition-colors cursor-pointer"
                      onClick={() => {
                        // Capture selection before it's lost when AI input opens
                        const sel = captureSelection()
                        if (sel) setEditSelection(sel)
                        setShowAiInput((v) => !v)
                      }}
                    >
                      <IconSparkles size={14} />
                      {t('editor.editWithAi')}
                    </button>
                  </div>
                </Show>

                {/* -- AI direction input ---------------------------------- */}
                <Show when={showAiInput()}>
                  <div
                    class="fixed w-96 p-3 bg-surface border border-accent/30 rounded-xl shadow-2xl shadow-accent/10 z-30 animate-scale-in"
                    style={{
                      left: `${toolbarPos().x}px`,
                      top: `${toolbarPos().y - 100}px`,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <label class="text-xs text-fg-secondary font-medium mb-2 block">
                      {t('editor.aiDirection')}
                    </label>
                    <div class="flex gap-2">
                      <input
                        type="text"
                        value={aiDirection()}
                        onInput={(e) => setAiDirection(e.currentTarget.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAiEdit()
                        }}
                        placeholder={t('editor.aiDirection')}
                        class="flex-1 h-9 px-3 rounded-lg text-sm bg-canvas border border-border-default text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors"
                      />
                      <Button variant="primary" size="sm" onClick={handleAiEdit}>
                        {t('editor.apply')}
                      </Button>
                    </div>
                  </div>
                </Show>
              </Show>
            </div>

            {/* -- Regenerate confirmation dialog -------------------------- */}
            <Dialog
              open={showRegenDialog()}
              onClose={() => setShowRegenDialog(false)}
              title={t('editor.regenerateConfirmTitle')}
              description={t('editor.regenerateConfirmDescription')}
              confirmLabel={t('editor.regenerateConfirm')}
              confirmVariant="danger"
              onConfirm={confirmRegenerate}
            />
          </>
        )}
      </Show>
      {/* ── Login gate modal (guest AI gate) ─────────────────── */}
      <LoginGateModal
        open={loginGateOpen()}
        reason="aiGeneration"
        onClose={() => setLoginGateOpen(false)}
      />
    </div>
  )
}
