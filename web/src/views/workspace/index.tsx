import { createSignal, Show, onMount, onCleanup } from 'solid-js'
import { useParams, Link } from '@tanstack/solid-router'
import { useI18n } from '@/shared/lib/i18n'
import { useTheme } from '@/shared/stores/theme'
import { WorkspaceProvider, useWorkspace } from '@/features/workspace'
import {
  IconPanelLeft,
  IconPanelBottom,
  IconChevronLeft,
  IconMoon,
  IconSun,
  Dialog,
} from '@/shared/ui'
import { ConfigBar } from '@/widgets/config-bar'
import { TimelinePanel } from '@/widgets/timeline-panel'
import { CharacterMap } from '@/widgets/character-map'
import { EditorPanel } from '@/widgets/editor-panel'
import { SceneDetail } from '@/widgets/scene-detail'

export function WorkspaceView() {
  const params = useParams({ from: '/project/$id' })
  return (
    <WorkspaceProvider projectId={params().id}>
      <WorkspaceLayout />
    </WorkspaceProvider>
  )
}

function WorkspaceLayout() {
  const ws = useWorkspace()
  const { t } = useI18n()
  const { theme, toggle } = useTheme()

  // ---- Panel visibility ----
  const [leftOpen, setLeftOpen] = createSignal(true)
  const [rightOpen, setRightOpen] = createSignal(false)
  const [bottomOpen, setBottomOpen] = createSignal(true)

  // ---- Panel sizes (px) ----
  const [leftWidth, setLeftWidth] = createSignal(280)
  const [rightWidth, setRightWidth] = createSignal(340)
  const [bottomHeight, setBottomHeight] = createSignal(240)

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

    // Escape — deselect scene
    if (e.key === 'Escape') {
      ws.selectScene(null)
      setRightOpen(false)
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
      }
      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }
  }

  function handleBottomResize(e: PointerEvent) {
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
        {/* ── Top bar ────────────────────────────────────────────── */}
        <header class="flex items-center justify-between px-4 h-11 border-b border-border-default bg-surface flex-shrink-0 z-30">
          <div class="flex items-center gap-3">
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

          <div class="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setLeftOpen((v) => !v)}
              class={[
                'p-1.5 rounded-md transition-colors cursor-pointer',
                leftOpen()
                  ? 'text-accent bg-accent-muted'
                  : 'text-fg-muted hover:text-fg hover:bg-surface-raised',
              ].join(' ')}
              aria-label="Toggle character panel"
            >
              <IconPanelLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setBottomOpen((v) => !v)}
              class={[
                'p-1.5 rounded-md transition-colors cursor-pointer',
                bottomOpen()
                  ? 'text-accent bg-accent-muted'
                  : 'text-fg-muted hover:text-fg hover:bg-surface-raised',
              ].join(' ')}
              aria-label="Toggle timeline"
            >
              <IconPanelBottom size={16} />
            </button>
            <div class="w-px h-5 bg-border-default mx-1" />
            <button
              type="button"
              onClick={toggle}
              class="p-1.5 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
              aria-label="Toggle theme"
            >
              <Show when={theme() === 'dark'} fallback={<IconMoon size={16} />}>
                <IconSun size={16} />
              </Show>
            </button>
            <span class="text-xs text-fg-muted ml-2 hidden lg:inline">
              {saveStatusText()}
            </span>
          </div>
        </header>

        {/* ── Config bar ─────────────────────────────────────────── */}
        <Show when={ws.state.project}>
          <ConfigBar />
        </Show>

        {/* ── Workspace panels ───────────────────────────────────── */}
        <div class="flex-1 flex overflow-hidden min-h-0">
          {/* Left panel — Character map */}
          <Show when={leftOpen()}>
            <div
              class="flex-shrink-0 overflow-hidden border-r border-border-default"
              style={{ width: `${leftWidth()}px` }}
            >
              <CharacterMap />
            </div>
            <div
              class="resize-h"
              onPointerDown={createHorizontalResize(setLeftWidth, leftWidth, 240, 400, 1)}
            />
          </Show>

          {/* Center — Editor */}
          <div class="flex-1 min-w-0 flex flex-col">
            <div class="flex-1 overflow-hidden">
              <EditorPanel />
            </div>

            {/* Bottom panel — Timeline */}
            <Show when={bottomOpen()}>
              <div
                class="resize-v"
                onPointerDown={handleBottomResize}
              />
              <div
                class="flex-shrink-0 overflow-hidden"
                style={{ height: `${bottomHeight()}px` }}
              >
                <TimelinePanel />
              </div>
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
