import { createSignal, createMemo, Show, For, onMount, onCleanup } from 'solid-js'
import { useParams, Link } from '@tanstack/solid-router'
import { useI18n } from '@/shared/lib/i18n'
import { WorkspaceProvider, useWorkspace } from '@/features/workspace'
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconChevronDown,
  IconSliders,
  Dialog,
} from '@/shared/ui'
import { ConfigBar, POV_OPTIONS } from '@/widgets/config-bar'
import { TimelinePanel } from '@/widgets/timeline-panel'
import { CharacterMap } from '@/widgets/character-map'
import { EditorPanel } from '@/widgets/editor-panel'
import { SceneDetail } from '@/widgets/scene-detail'

export function WorkspaceView() {
  const params = useParams({ from: '/_authenticated/project/$id' })
  return (
    <WorkspaceProvider projectId={params().id}>
      <WorkspaceLayout />
    </WorkspaceProvider>
  )
}

// ---- Summary chip helpers ---------------------------------------------------

function parseTonePreview(tone: string | null | undefined): string[] {
  if (!tone) return []
  return tone
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 2)
}

// ---- Layout -----------------------------------------------------------------

function WorkspaceLayout() {
  const ws = useWorkspace()
  const { t } = useI18n()
  // ---- Config panel ----
  const [configOpen, setConfigOpen] = createSignal(false)

  // ---- Summary chips (derived) ----
  const summaryItems = createMemo(() => {
    const p = ws.state.project
    if (!p) return []
    const items: string[] = []
    if (p.genre) items.push(p.genre)
    if (p.pov) {
      const opt = POV_OPTIONS.find((o) => o.value === p.pov)
      if (opt) items.push(t(opt.labelKey))
    }
    const tones = parseTonePreview(p.tone)
    items.push(...tones)
    return items
  })

  // ---- Panel visibility ----
  const [leftOpen, setLeftOpen] = createSignal(true)
  const [rightOpen, setRightOpen] = createSignal(false)
  const [bottomOpen, setBottomOpen] = createSignal(true)

  // ---- Panel sizes (px) ----
  const [leftWidth, setLeftWidth] = createSignal(280)
  const [rightWidth, setRightWidth] = createSignal(340)
  const [bottomHeight, setBottomHeight] = createSignal(240)

  // ---- Resize-in-progress flag (disables CSS transitions) ----
  const [isResizing, setIsResizing] = createSignal(false)

  // ---- Fullscreen character map ----
  const [charMapFullscreen, setCharMapFullscreen] = createSignal(false)

  // ---- Delete confirmation ----
  const [showDeleteDialog, setShowDeleteDialog] = createSignal(false)

  // ---- Responsive ----
  const [isMobile, setIsMobile] = createSignal(false)

  // Auto-open right panel when scene selected
  const handleSceneSelected = () => {
    if (ws.selectedSceneId() !== null) {
      setRightOpen(true)
    }
  }

  // Track selectedSceneId changes to auto-open right panel
  onMount(() => {
    // Check on mount
    handleSceneSelected()
  })

  // Use an effect-like approach by checking in an interval — SolidJS
  // createEffect would be more idiomatic but we keep it simple
  let prevSelectedId: string | null = null
  const selectionPoller = setInterval(() => {
    const cur = ws.selectedSceneId()
    if (cur !== prevSelectedId) {
      prevSelectedId = cur
      if (cur !== null) {
        setRightOpen(true)
      }
    }
  }, 50)

  onCleanup(() => clearInterval(selectionPoller))

  // ---- Responsive check ----
  function checkViewport() {
    setIsMobile(window.innerWidth < 768)
  }

  onMount(() => {
    checkViewport()
    window.addEventListener('resize', checkViewport)
  })
  onCleanup(() => {
    window.removeEventListener('resize', checkViewport)
  })

  // ---- Keyboard shortcuts ----
  function handleKeyDown(e: KeyboardEvent) {
    const meta = e.metaKey || e.ctrlKey

    // Escape — close config first, then fullscreen, then deselect scene
    if (e.key === 'Escape') {
      if (configOpen()) {
        setConfigOpen(false)
        return
      }
      if (charMapFullscreen()) {
        setCharMapFullscreen(false)
        return
      }
      ws.selectScene(null)
      setRightOpen(false)
      return
    }

    // Cmd+Shift+F — toggle fullscreen character map
    if (meta && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
      setCharMapFullscreen((v) => !v)
      e.preventDefault()
      return
    }

    // Delete/Backspace — delete selected scene
    if ((e.key === 'Delete' || e.key === 'Backspace') && !meta) {
      const target = e.target as HTMLElement
      // Don't interfere with text inputs
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }
      const sceneId = ws.selectedSceneId()
      if (!sceneId) return
      const scene = ws.selectedScene()
      const hasDraft = scene
        ? ws.draftContent(scene.id).length > 0
        : false
      if (hasDraft) {
        setShowDeleteDialog(true)
      } else {
        ws.removeScene(sceneId)
      }
      e.preventDefault()
      return
    }

    // Cmd+\ — toggle left panel
    if (meta && e.key === '\\') {
      setLeftOpen((v) => !v)
      e.preventDefault()
      return
    }

    // Cmd+Shift+T — toggle timeline
    if (meta && e.shiftKey && (e.key === 'T' || e.key === 't')) {
      setBottomOpen((v) => !v)
      e.preventDefault()
      return
    }

    // Cmd+G — generate draft for selected scene
    if (meta && (e.key === 'G' || e.key === 'g') && !e.shiftKey) {
      const sceneId = ws.selectedSceneId()
      if (sceneId && !ws.isGenerating()) {
        ws.startGeneration(sceneId)
      }
      e.preventDefault()
      return
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeyDown)
  })
  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown)
  })

  // ---- Resize handlers ----
  function createHorizontalResize(
    setter: (v: number) => void,
    getter: () => number,
    min: number,
    max: number,
    direction: 1 | -1,
  ) {
    return (e: PointerEvent) => {
      setIsResizing(true)
      const startX = e.clientX
      const startSize = getter()
      const onMove = (ev: PointerEvent) => {
        const delta = (ev.clientX - startX) * direction
        setter(Math.min(max, Math.max(min, startSize + delta)))
      }
      const onUp = () => {
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        setIsResizing(false)
      }
      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }
  }

  function handleBottomResize(e: PointerEvent) {
    setIsResizing(true)
    const startY = e.clientY
    const startSize = bottomHeight()
    const maxH = window.innerHeight * 0.5
    const onMove = (ev: PointerEvent) => {
      const delta = startY - ev.clientY
      setBottomHeight(Math.min(maxH, Math.max(160, startSize + delta)))
    }
    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      setIsResizing(false)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }

  // ---- Save status label ----
  function saveStatusText() {
    switch (ws.saveStatus()) {
      case 'saved':
        return t('common.saved')
      case 'saving':
        return t('common.saving')
      case 'error':
        return 'Error'
      default:
        return ''
    }
  }

  function saveStatusColor() {
    switch (ws.saveStatus()) {
      case 'error':
        return 'text-red-400'
      default:
        return 'text-fg-muted'
    }
  }

  // ---- Render ----

  return (
    <Show
      when={!isMobile()}
      fallback={
        <div class="h-screen flex items-center justify-center bg-canvas px-8">
          <p class="text-center text-fg-secondary text-sm leading-relaxed">
            Narrex는 데스크톱용으로 설계되었습니다. 더 넓은 화면의 기기를 사용하세요.
          </p>
        </div>
      }
    >
      <div class="h-screen flex flex-col overflow-hidden bg-canvas">
        {/* ── Top bar ──────────────────────────────────────────── */}
        <header class="flex items-center px-4 h-11 border-b border-border-default bg-surface flex-shrink-0 z-30">
          {/* Left */}
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <Link
              to="/"
              class="p-1.5 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors"
            >
              <IconChevronLeft size={16} />
            </Link>
            <span class="text-sm font-display font-semibold text-fg">
              Narrex
            </span>
            <span class="text-fg-muted text-xs">·</span>
            <span class="text-sm text-fg-secondary truncate max-w-xs">
              {ws.state.project?.title ?? ''}
            </span>
          </div>

          {/* Center — Config toggle */}
          <Show when={ws.state.project}>
            <div class="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setConfigOpen((v) => !v)}
                class={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                  configOpen()
                    ? 'text-accent bg-accent/10'
                    : 'text-fg-muted hover:text-fg hover:bg-surface-raised'
                }`}
                aria-label={t('config.title')}
                aria-expanded={configOpen()}
              >
                <IconSliders size={14} />
                <span class="hidden sm:inline">{t('config.title')}</span>
                <IconChevronDown
                  size={12}
                  class={`transition-transform duration-200 ${configOpen() ? 'rotate-180' : ''}`}
                />
              </button>

              <Show when={!configOpen() && summaryItems().length > 0}>
                <div class="hidden md:flex items-center gap-1 ml-1">
                  <span class="text-fg-muted/40 text-xs">|</span>
                  <For each={summaryItems()}>
                    {(item, i) => (
                      <>
                        <Show when={i() > 0}>
                          <span class="text-fg-muted/30 text-xs">·</span>
                        </Show>
                        <span class="text-xs text-fg-muted truncate max-w-24">{item}</span>
                      </>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </Show>

          {/* Right */}
          <div class="flex items-center justify-end flex-1">
            <span class={`text-xs hidden lg:inline ${saveStatusColor()}`}>
              {saveStatusText()}
            </span>
          </div>
        </header>

        {/* ── Config panel (inline push-down) ─────────────────── */}
        <ConfigBar open={configOpen()} />

        {/* ── Workspace panels ───────────────────────────────────── */}
        <div class="flex-1 flex overflow-hidden min-h-0 relative">
          {/* Left panel — Character map */}
          <div
            class="panel-collapsible flex-shrink-0 border-r border-border-default relative"
            data-collapsed={!leftOpen()}
            style={{
              width: leftOpen() ? `${leftWidth()}px` : '0px',
              'border-width': leftOpen() ? undefined : '0px',
              transition: isResizing() ? 'none' : undefined,
            }}
          >
            <div style={{ width: `${leftWidth()}px`, height: '100%' }}>
              <CharacterMap
                onEnterFullscreen={() => setCharMapFullscreen(true)}
              />
            </div>
            <button
              type="button"
              class="edge-tab edge-tab--left-inner"
              aria-label="Collapse character panel"
              aria-expanded={true}
              onClick={() => setLeftOpen(false)}
            >
              <IconChevronLeft size={14} />
            </button>
          </div>
          <div
            class="resize-h panel-collapsible"
            data-collapsed={!leftOpen()}
            style={{ width: leftOpen() ? undefined : '0px', transition: isResizing() ? 'none' : undefined }}
            onPointerDown={createHorizontalResize(setLeftWidth, leftWidth, 240, 400, 1)}
          />

          {/* Left edge tab (when collapsed) */}
          <Show when={!leftOpen()}>
            <button
              type="button"
              class="edge-tab edge-tab--left"
              aria-label="Open character panel"
              aria-expanded={false}
              onClick={() => setLeftOpen(true)}
            >
              <IconChevronRight size={14} />
            </button>
          </Show>

          {/* Center — Editor */}
          <div class="flex-1 min-w-0 flex flex-col relative">
            <div class="flex-1 overflow-hidden">
              <EditorPanel />
            </div>

            {/* Bottom panel — Timeline */}
            <div
              class="resize-v panel-collapsible"
              data-collapsed={!bottomOpen()}
              style={{ height: bottomOpen() ? undefined : '0px', transition: isResizing() ? 'none' : undefined }}
              onPointerDown={handleBottomResize}
            />
            <div
              class="panel-collapsible flex-shrink-0 relative"
              data-collapsed={!bottomOpen()}
              style={{
                height: bottomOpen() ? `${bottomHeight()}px` : '0px',
                transition: isResizing() ? 'none' : undefined,
              }}
            >
              <div style={{ height: `${bottomHeight()}px` }}>
                <TimelinePanel />
              </div>
              <button
                type="button"
                class="edge-tab edge-tab--bottom-inner"
                aria-label="Collapse timeline"
                aria-expanded={true}
                onClick={() => setBottomOpen(false)}
              >
                <IconChevronDown size={14} />
              </button>
            </div>

            {/* Bottom edge tab (when collapsed) */}
            <Show when={!bottomOpen()}>
              <button
                type="button"
                class="edge-tab edge-tab--bottom"
                aria-label="Open timeline"
                aria-expanded={false}
                onClick={() => setBottomOpen(true)}
              >
                <IconChevronUp size={14} />
              </button>
            </Show>
          </div>

          {/* Right panel — Scene detail */}
          <Show when={rightOpen() && ws.selectedScene()}>
            <div
              class="resize-h"
              onPointerDown={createHorizontalResize(setRightWidth, rightWidth, 300, 500, -1)}
            />
            <div
              class="flex-shrink-0 overflow-hidden border-l border-border-default"
              style={{ width: `${rightWidth()}px` }}
            >
              <SceneDetail />
            </div>
          </Show>

          {/* ── Fullscreen character map overlay ─────────────────── */}
          <Show when={charMapFullscreen()}>
            <div
              class="absolute inset-0 z-40 bg-surface animate-scale-in"
              role="dialog"
              aria-label={t('characters.fullscreen')}
            >
              <CharacterMap
                fullscreen={true}
                onExitFullscreen={() => setCharMapFullscreen(false)}
              />
            </div>
          </Show>
        </div>

        {/* ── Delete confirmation dialog ─────────────────────────── */}
        <Dialog
          open={showDeleteDialog()}
          onClose={() => setShowDeleteDialog(false)}
          title={t('common.delete')}
          description={t('editor.regenerateConfirmDescription')}
          confirmLabel={t('common.delete')}
          confirmVariant="danger"
          onConfirm={() => {
            const sceneId = ws.selectedSceneId()
            if (sceneId) ws.removeScene(sceneId)
            setShowDeleteDialog(false)
          }}
        />
      </div>
    </Show>
  )
}
