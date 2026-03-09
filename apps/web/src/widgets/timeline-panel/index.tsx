import {
  For,
  Show,
  createSignal,
  createMemo,
  createEffect,
  onCleanup,
  batch,
} from 'solid-js'
import type { JSX } from 'solid-js'
import { useI18n } from '@/shared/lib/i18n'
import {
  Button,
  IconPlus,
  IconZoomIn,
  IconZoomOut,
  IconMaximize,
  IconCheck,
  IconPen,
  IconAlertTriangle,
  IconSparkles,
  IconTrash,
  IconChevronDown,
  ContextMenu,
  Separator,
  type ContextMenuItem,
  Dialog,
} from '@/shared/ui'
import { useWorkspace } from '@/features/workspace'
import type { Scene } from '@/entities/scene'
import type { SceneConnection } from '@/entities/connection'

// ---- Constants ---------------------------------------------------------------

const TRACK_HEIGHT = 56
const TRACK_LABEL_WIDTH = 112
const MIN_SCALE = 60
const MAX_SCALE = 240
const DEFAULT_SCALE = 120
const SCALE_STEP = 30
const RULER_HEIGHT = 28
const DRAG_THRESHOLD = 5
const MIN_TRACK_HEIGHT = 24

// ---- Helpers -----------------------------------------------------------------

/** Convert API underscore status to CSS dash format for data attributes. */
function statusToCss(status: string): string {
  return status.replace(/_/g, '-')
}

function sceneStatusIcon(status: string): JSX.Element | null {
  switch (status) {
    case 'ai_draft':
      return <IconPen size={12} class="text-accent flex-shrink-0" />
    case 'edited':
      return <IconCheck size={12} class="text-success flex-shrink-0" />
    case 'needs_revision':
      return <IconAlertTriangle size={12} class="text-warning flex-shrink-0" />
    default:
      return null
  }
}

function sceneTooltip(t: (k: string) => string, status: string): string {
  switch (status) {
    case 'empty':
      return t('status.empty')
    case 'ai_draft':
      return t('status.aiDraft')
    case 'edited':
      return t('status.edited')
    case 'needs_revision':
      return t('status.needsRevision')
    default:
      return ''
  }
}

/** Compute scale so all scenes fit within the visible viewport. */
export function computeFitScale(
  viewportWidth: number,
  trackLabelWidth: number,
  tracks: Array<{ scenes: Array<{ startPosition: number; duration: number }> }>,
  minScale: number,
  maxScale: number,
  defaultScale: number,
): number {
  let maxEnd = 0
  let hasScenes = false
  for (const track of tracks) {
    for (const scene of track.scenes) {
      hasScenes = true
      const end = scene.startPosition + scene.duration
      if (end > maxEnd) maxEnd = end
    }
  }
  if (!hasScenes || maxEnd <= 0) return defaultScale

  const padding = 48
  const availableWidth = viewportWidth - trackLabelWidth - padding
  if (availableWidth <= 0) return defaultScale

  const idealScale = availableWidth / maxEnd
  return Math.min(maxScale, Math.max(minScale, idealScale))
}

/** Compute simultaneous event bands (overlap regions across different tracks). */
export function computeSimultaneousBands(
  tracks: Array<{ scenes: Array<{ startPosition: number; duration: number }> }>,
): Array<{ start: number; end: number }> {
  if (tracks.length < 2) return []
  const bands: Array<{ start: number; end: number }> = []
  for (let i = 0; i < tracks.length; i++) {
    for (let j = i + 1; j < tracks.length; j++) {
      for (const sa of tracks[i]!.scenes) {
        for (const sb of tracks[j]!.scenes) {
          const overlapStart = Math.max(sa.startPosition, sb.startPosition)
          const overlapEnd = Math.min(sa.startPosition + sa.duration, sb.startPosition + sb.duration)
          if (overlapEnd > overlapStart) {
            bands.push({ start: overlapStart, end: overlapEnd })
          }
        }
      }
    }
  }
  return bands
}

/** Compute the end position of the last scene across all tracks. */
function computeTimelineEnd(tracks: Array<{ scenes: Scene[] }>): number {
  let max = 0
  for (const track of tracks) {
    for (const scene of track.scenes) {
      const end = scene.startPosition + scene.duration
      if (end > max) max = end
    }
  }
  return Math.ceil(max) + 2
}

/** Find a scene by id in a flat lookup built from trackScenes. */
function buildSceneLookup(tracks: Array<{ scenes: Scene[] }>): Map<string, { scene: Scene; trackIndex: number }> {
  const map = new Map<string, { scene: Scene; trackIndex: number }>()
  for (let ti = 0; ti < tracks.length; ti++) {
    const track = tracks[ti]!
    for (const scene of track.scenes) {
      map.set(scene.id, { scene, trackIndex: ti })
    }
  }
  return map
}

// ---- Component ---------------------------------------------------------------

export function TimelinePanel(props: { onCollapse?: () => void }) {
  const { t } = useI18n()
  const ws = useWorkspace()

  // ---- Signals ----

  const HINT_DISMISSED_KEY = 'narrex:timeline-hint-dismissed'
  const [showHint, setShowHint] = createSignal(
    localStorage.getItem(HINT_DISMISSED_KEY) !== 'true',
  )
  const [scale, setScale] = createSignal(DEFAULT_SCALE)

  // Track height state (supports drag resize + double-click minimize)
  const [trackHeights, setTrackHeights] = createSignal<Map<string, number>>(new Map())

  // Branch-creation drag state
  const [branchDrag, setBranchDrag] = createSignal<{
    sourceSceneId: string
    x1: number; y1: number
    x2: number; y2: number
  } | null>(null)

  // Tooltip state
  const [tooltip, setTooltip] = createSignal<{
    x: number; y: number
    title: string; summary: string
  } | null>(null)
  let tooltipTimer: ReturnType<typeof setTimeout> | undefined

  // Delete confirmation dialogs
  const [deleteSceneId, setDeleteSceneId] = createSignal<string | null>(null)
  const [deleteTrackId, setDeleteTrackId] = createSignal<string | null>(null)

  // Rename track inline
  const [renamingTrackId, setRenamingTrackId] = createSignal<string | null>(null)
  const [renameTrackLabel, setRenameTrackLabel] = createSignal('')

  // Drag: direct DOM manipulation — no signals in the hot path
  let dragState: {
    sceneId: string
    trackId: string
    startPosition: number
    startX: number
    startY: number
    offsetX: number        // click offset within clip (for accurate drop)
    el: HTMLElement
    active: boolean        // false = pending, true = threshold crossed
  } | null = null
  // Thin signal only to toggle visual states (z-index, shadow) on drag start/end
  const [dragActiveId, setDragActiveId] = createSignal<string | null>(null)

  // Resize: direct DOM manipulation
  let resizeState: {
    sceneId: string
    edge: 'left' | 'right'
    el: HTMLElement
    origStartPosition: number
    origDuration: number
    startX: number
  } | null = null
  // Guard: block the click event that fires right after resize/drag ends
  let suppressNextClick = false

  let timelineBodyRef: HTMLDivElement | undefined

  // ---- Zoom ----

  function zoomIn() {
    setScale((s) => Math.min(MAX_SCALE, s + SCALE_STEP))
  }
  function zoomOut() {
    setScale((s) => Math.max(MIN_SCALE, s - SCALE_STEP))
  }
  function zoomFit() {
    const viewportWidth = timelineBodyRef?.clientWidth ?? 0
    const newScale = computeFitScale(viewportWidth, TRACK_LABEL_WIDTH, ws.trackScenes(), MIN_SCALE, MAX_SCALE, DEFAULT_SCALE)
    setScale(newScale)
    if (timelineBodyRef) {
      timelineBodyRef.scrollLeft = 0
    }
  }

  function handleWheel(e: WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -SCALE_STEP / 2 : SCALE_STEP / 2
      setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + delta)))
    }
  }

  // ---- Track height helpers ----

  function getTrackHeight(trackId: string): number {
    return trackHeights().get(trackId) ?? TRACK_HEIGHT
  }

  function isTrackCollapsed(trackId: string): boolean {
    return getTrackHeight(trackId) <= MIN_TRACK_HEIGHT
  }

  function toggleTrackCollapse(trackId: string) {
    setTrackHeights((prev) => {
      const next = new Map(prev)
      if (isTrackCollapsed(trackId)) {
        next.set(trackId, TRACK_HEIGHT)
      } else {
        next.set(trackId, MIN_TRACK_HEIGHT)
      }
      return next
    })
  }

  // ---- Track resize (drag bottom edge) ----

  function handleTrackResizeDown(e: PointerEvent, trackId: string) {
    e.preventDefault()
    e.stopPropagation()

    const startY = e.clientY
    const startHeight = getTrackHeight(trackId)

    const onMove = (ev: PointerEvent) => {
      const deltaY = ev.clientY - startY
      const newHeight = Math.max(MIN_TRACK_HEIGHT, startHeight + deltaY)
      setTrackHeights((prev) => {
        const next = new Map(prev)
        next.set(trackId, newHeight)
        return next
      })
    }

    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.body.style.cursor = ''
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.body.style.cursor = 'ns-resize'
  }

  // ---- Tooltip helpers ----

  function showSceneTooltip(e: PointerEvent, scene: Scene) {
    clearTimeout(tooltipTimer)
    tooltipTimer = setTimeout(() => {
      const summary = scene.plotSummary
        ? scene.plotSummary.slice(0, 100) + (scene.plotSummary.length > 100 ? '...' : '')
        : ''
      setTooltip({
        x: e.clientX + 12,
        y: e.clientY + 12,
        title: scene.title || '\u2014',
        summary,
      })
    }, 400)
  }

  function hideSceneTooltip() {
    clearTimeout(tooltipTimer)
    setTooltip(null)
  }

  // ---- Branch handle drag (create branch/merge connections) ----

  function handleBranchHandleDown(e: PointerEvent, sceneId: string) {
    e.stopPropagation()
    e.preventDefault()
    const bodyRect = timelineBodyRef?.getBoundingClientRect()
    if (!bodyRect) return

    const lookup = sceneLookup()
    const info = lookup.get(sceneId)
    if (!info) return

    const startX = info.scene.startPosition * scale() + (info.scene.duration * scale()) / 2 + TRACK_LABEL_WIDTH
    const startY = RULER_HEIGHT + info.trackIndex * TRACK_HEIGHT + TRACK_HEIGHT - 4

    setBranchDrag({
      sourceSceneId: sceneId,
      x1: startX,
      y1: startY,
      x2: startX,
      y2: startY,
    })

    const onMove = (ev: PointerEvent) => {
      const rx = ev.clientX - bodyRect.left + (timelineBodyRef?.scrollLeft ?? 0)
      const ry = ev.clientY - bodyRect.top + (timelineBodyRef?.scrollTop ?? 0)
      setBranchDrag((prev) => prev ? { ...prev, x2: rx, y2: ry } : null)
    }

    const onUp = (ev: PointerEvent) => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)

      const drag = branchDrag()
      setBranchDrag(null)
      if (!drag) return

      // Find target scene under pointer
      const rx = ev.clientX - bodyRect.left + (timelineBodyRef?.scrollLeft ?? 0)
      const ry = ev.clientY - bodyRect.top + (timelineBodyRef?.scrollTop ?? 0)

      const tracks = ws.trackScenes()
      const targetTrackIndex = Math.floor((ry - RULER_HEIGHT) / TRACK_HEIGHT)
      if (targetTrackIndex < 0 || targetTrackIndex >= tracks.length) return

      const targetTrack = tracks[targetTrackIndex]!
      // Check if pointer is over an existing scene (merge) or empty space (branch)
      let targetScene: Scene | null = null
      for (const s of targetTrack.scenes) {
        const sx = s.startPosition * scale() + TRACK_LABEL_WIDTH
        const sw = Math.max(s.duration * scale(), 24)
        if (rx >= sx && rx <= sx + sw) {
          targetScene = s
          break
        }
      }

      if (targetScene && targetScene.id !== drag.sourceSceneId) {
        // Merge: connect to existing scene
        ws.addConnection(drag.sourceSceneId, targetScene.id, 'merge')
      } else if (!targetScene && targetTrack.id !== ws.state.scenes.find((s) => s.id === drag.sourceSceneId)?.trackId) {
        // Branch: create new scene on target track
        const newStartPos = Math.max(0, (rx - TRACK_LABEL_WIDTH) / scale())
        ws.addScene(targetTrack.id, Math.round(newStartPos * 4) / 4)
        // After a tick, find the newly added scene and create a branch connection
        setTimeout(() => {
          const newScenes = ws.state.scenes.filter((s) => s.trackId === targetTrack.id)
          const newest = newScenes[newScenes.length - 1]
          if (newest) {
            ws.addConnection(drag.sourceSceneId, newest.id, 'branch')
          }
        }, 100)
      }
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  // ---- Simultaneous event bands ----

  const simultaneousBands = createMemo(() =>
    computeSimultaneousBands(ws.trackScenes()),
  )

  // ---- Computed ----

  const timelineEnd = createMemo(() => computeTimelineEnd(ws.trackScenes()))
  const timelineWidth = createMemo(() => timelineEnd() * scale())

  const rulerTicks = createMemo(() => {
    const ticks: number[] = []
    for (let i = 0; i <= timelineEnd(); i++) {
      ticks.push(i)
    }
    return ticks
  })

  const sceneLookup = createMemo(() => buildSceneLookup(ws.trackScenes()))

  // ---- Connection line helpers ----

  /** Get center-bottom of a scene clip (relative to the timeline body). */
  function sceneBottomCenter(scene: Scene, trackIndex: number): { x: number; y: number } {
    const x = scene.startPosition * scale() + (scene.duration * scale()) / 2 + TRACK_LABEL_WIDTH
    const y = RULER_HEIGHT + trackIndex * TRACK_HEIGHT + TRACK_HEIGHT - 4
    return { x, y }
  }

  /** Get center-top of a scene clip. */
  function sceneTopCenter(scene: Scene, trackIndex: number): { x: number; y: number } {
    const x = scene.startPosition * scale() + (scene.duration * scale()) / 2 + TRACK_LABEL_WIDTH
    const y = RULER_HEIGHT + trackIndex * TRACK_HEIGHT + 4
    return { x, y }
  }

  // ---- Drag & Drop (raw DOM — zero signals in the hot path) ----

  function handlePointerDown(e: PointerEvent, sceneId: string, trackId: string, startPosition: number) {
    if (e.button !== 0) return
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    const rect = el.getBoundingClientRect()

    dragState = {
      sceneId,
      trackId,
      startPosition,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      el,
      active: false,
    }
  }

  function handlePointerMove(e: PointerEvent) {
    if (!dragState) return

    if (!dragState.active) {
      const dx = e.clientX - dragState.startX
      const dy = e.clientY - dragState.startY
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return

      // Promote: set will-change, z-index, shadow via one signal flip
      dragState.active = true
      dragState.el.style.willChange = 'transform'
      dragState.el.style.zIndex = '50'
      dragState.el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'
      dragState.el.style.cursor = 'grabbing'
      setDragActiveId(dragState.sceneId) // signal: blocks click, hides tooltip
    }

    // Direct DOM write — no signal, no reactivity, no GC
    const dx = e.clientX - dragState.startX
    const dy = e.clientY - dragState.startY
    dragState.el.style.transform = `translate3d(${dx}px,${dy}px,0)`
  }

  function handlePointerUp(e: PointerEvent) {
    if (!dragState) return

    if (!dragState.active) {
      // Never crossed threshold — click (onClick handles it)
      dragState = null
      return
    }

    // Reset visual before store update (prevents flash)
    dragState.el.style.transform = ''
    dragState.el.style.willChange = ''
    dragState.el.style.zIndex = ''
    dragState.el.style.boxShadow = ''
    dragState.el.style.cursor = ''

    // Compute snapped drop position using clip's LEFT EDGE (not raw pointer)
    const bodyRect = timelineBodyRef?.getBoundingClientRect()
    if (bodyRect) {
      const tracks = ws.trackScenes()
      const relY = e.clientY - bodyRect.top - RULER_HEIGHT
      let ti = Math.floor(relY / TRACK_HEIGHT)
      ti = Math.max(0, Math.min(tracks.length - 1, ti))
      const targetTrack = tracks[ti]

      // Subtract offsetX so the clip's left edge lands where the user sees it
      const clipLeftClient = e.clientX - dragState.offsetX
      const relX = clipLeftClient - bodyRect.left - TRACK_LABEL_WIDTH + (timelineBodyRef?.scrollLeft ?? 0)
      let newStart = relX / scale()
      newStart = Math.max(0, Math.round(newStart * 4) / 4)

      if (targetTrack && (targetTrack.id !== dragState.trackId || Math.abs(newStart - dragState.startPosition) > 0.1)) {
        ws.moveScene(dragState.sceneId, targetTrack.id, newStart)
      }
    }

    dragState = null
    setDragActiveId(null)
    suppressNextClick = true
  }

  // ---- Clip edge resize (raw DOM — zero signals in the hot path) ----

  const MIN_DURATION = 0.25

  function handleResizeDown(e: PointerEvent, sceneId: string, edge: 'left' | 'right', startPosition: number, duration: number) {
    e.stopPropagation()
    e.preventDefault()

    const clipEl = (e.currentTarget as HTMLElement).parentElement as HTMLElement
    clipEl.style.willChange = 'left, width'

    resizeState = {
      sceneId,
      edge,
      el: clipEl,
      origStartPosition: startPosition,
      origDuration: duration,
      startX: e.clientX,
    }

    const sc = scale()
    const origLeftPx = startPosition * sc
    const origWidthPx = Math.max(duration * sc, 24)
    const origRightPx = origLeftPx + origWidthPx
    const minW = MIN_DURATION * sc

    const onMove = (ev: PointerEvent) => {
      if (!resizeState) return
      const deltaX = ev.clientX - resizeState.startX

      if (edge === 'right') {
        const newW = Math.max(minW, origWidthPx + deltaX)
        resizeState.el.style.width = `${newW}px`
      } else {
        const newLeft = Math.max(0, origLeftPx + deltaX)
        const newW = Math.max(minW, origRightPx - newLeft)
        resizeState.el.style.left = `${newLeft}px`
        resizeState.el.style.width = `${newW}px`
      }
    }

    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.body.style.cursor = ''

      if (resizeState) {
        // Read final pixel values BEFORE clearing
        const finalLeft = parseFloat(resizeState.el.style.left)
        const finalWidth = parseFloat(resizeState.el.style.width)

        // Update store FIRST (SolidJS will immediately overwrite inline left/width)
        if (edge === 'right') {
          const w = Number.isFinite(finalWidth) ? finalWidth : origWidthPx
          const newDuration = Math.max(MIN_DURATION, Math.round((w / sc) * 4) / 4)
          ws.updateScene(sceneId, { duration: newDuration })
        } else {
          const l = Number.isFinite(finalLeft) ? finalLeft : origLeftPx
          let newStart = l / sc
          newStart = Math.max(0, Math.round(newStart * 4) / 4)
          const rightEdge = startPosition + duration
          const newDuration = Math.max(MIN_DURATION, Math.round((rightEdge - newStart) * 4) / 4)
          ws.updateScene(sceneId, { startPosition: newStart, duration: newDuration })
        }

        // Only clear will-change hint — SolidJS already overwrote left/width
        resizeState.el.style.willChange = ''
      }
      resizeState = null
      suppressNextClick = true
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.body.style.cursor = 'ew-resize'
  }

  // Cancel drag on Escape
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && (dragState || resizeState)) {
      if (dragState) {
        dragState.el.style.transform = ''
        dragState.el.style.willChange = ''
        dragState.el.style.zIndex = ''
        dragState.el.style.boxShadow = ''
        dragState.el.style.cursor = ''
        dragState = null
        setDragActiveId(null)
      }
      if (resizeState) {
        // Cancel: restore original values
        const sc = scale()
        resizeState.el.style.left = `${resizeState.origStartPosition * sc}px`
        resizeState.el.style.width = `${Math.max(resizeState.origDuration * sc, 24)}px`
        resizeState.el.style.willChange = ''
        resizeState = null
        document.body.style.cursor = ''
      }
      return
    }

    // Keyboard navigation for scenes
    const selId = ws.selectedSceneId()
    if (!selId) return

    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      const prev = ws.prevScene()
      if (prev) ws.selectScene(prev.id)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      const next = ws.nextScene()
      if (next) ws.selectScene(next.id)
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }
      e.preventDefault()
      setDeleteSceneId(selId)
    }
  }

  createEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    onCleanup(() => document.removeEventListener('keydown', handleKeyDown))
  })

  // ---- Track rename ----

  function startRenamingTrack(trackId: string, currentLabel: string | null) {
    batch(() => {
      setRenamingTrackId(trackId)
      setRenameTrackLabel(currentLabel ?? '')
    })
  }

  function submitRenameTrack() {
    const id = renamingTrackId()
    const label = renameTrackLabel().trim()
    if (id && label) {
      ws.updateTrack(id, label)
    }
    batch(() => {
      setRenamingTrackId(null)
      setRenameTrackLabel('')
    })
  }

  // ---- Scene context menu items ----

  function sceneContextItems(sceneId: string): (ContextMenuItem | typeof Separator)[] {
    return [
      {
        label: t('sceneDetail.title'),
        icon: <IconPen size={14} />,
        onClick: () => ws.selectScene(sceneId),
      },
      {
        label: t('editor.generate'),
        icon: <IconSparkles size={14} />,
        onClick: () => ws.startGeneration(sceneId),
      },
      Separator,
      {
        label: t('common.delete'),
        icon: <IconTrash size={14} />,
        danger: true,
        onClick: () => setDeleteSceneId(sceneId),
      },
    ]
  }

  // ---- Track context menu items ----

  function trackContextItems(trackId: string, trackLabel: string | null): (ContextMenuItem | typeof Separator)[] {
    return [
      {
        label: t('config.theme') === 'Theme' ? 'Rename Track' : '\uD2B8\uB799 \uC774\uB984 \uBCC0\uACBD',
        icon: <IconPen size={14} />,
        onClick: () => startRenamingTrack(trackId, trackLabel),
      },
      Separator,
      {
        label: t('config.theme') === 'Theme' ? 'Remove Track' : '\uD2B8\uB799 \uC0AD\uC81C',
        icon: <IconTrash size={14} />,
        danger: true,
        onClick: () => setDeleteTrackId(trackId),
      },
    ]
  }

  // ---- End position for a track (to place the [+] button) ----

  function trackEndPosition(scenes: Scene[]): number {
    if (scenes.length === 0) return 0
    let max = 0
    for (const s of scenes) {
      const end = s.startPosition + s.duration
      if (end > max) max = end
    }
    return max
  }

  // (dragActiveId / resizeActiveId signals used only for click-blocking + CSS toggles)

  // ---- Render ----

  return (
    <div
      class="flex flex-col h-full bg-surface border-t border-border-default"
      tabIndex={0}
    >
      {/* -- Hint banner ---------------------------------------------------- */}
      <Show when={showHint()}>
        <div class="flex items-center justify-between px-4 py-2 bg-accent-muted text-accent text-xs border-b border-border-subtle">
          <span>{t('timeline.hint')}</span>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem(HINT_DISMISSED_KEY, 'true')
              setShowHint(false)
            }}
            class="ml-4 underline underline-offset-2 hover:no-underline cursor-pointer"
          >
            {t('common.close')}
          </button>
        </div>
      </Show>

      {/* -- Timeline header bar ------------------------------------------- */}
      <div
        data-testid="timeline-header"
        class="flex items-center flex-shrink-0 border-b border-border-subtle"
        style={{ height: '24px' }}
      >
        {/* Left: label column — "TIMELINE" + collapse */}
        <div
          class="flex-shrink-0 flex items-center justify-between px-3 border-r border-border-subtle h-full"
          style={{ width: `${TRACK_LABEL_WIDTH}px` }}
        >
          <span class="text-[11px] font-medium text-fg-secondary uppercase tracking-wider select-none">
            {t('timeline.title')}
          </span>
          <Show when={props.onCollapse}>
            <button
              type="button"
              onClick={props.onCollapse}
              class="p-1 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
              aria-label="Collapse timeline"
              aria-expanded={true}
            >
              <IconChevronDown size={14} />
            </button>
          </Show>
        </div>

        {/* Right: track add + zoom controls */}
        <div class="flex-1 flex items-center justify-between px-3 h-full">
          <Button
            variant="ghost"
            size="sm"
            icon={<IconPlus size={14} />}
            onClick={() => ws.addTrack(`Track ${ws.trackScenes().length + 1}`)}
          >
            {t('timeline.addTrack')}
          </Button>

          {/* Zoom toolbar */}
          <div
            data-testid="timeline-zoom-toolbar"
            class="flex items-center gap-0.5"
          >
            <button
              type="button"
              class="p-1 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
              aria-label="Zoom out"
              onClick={zoomOut}
            >
              <IconZoomOut size={14} />
            </button>
            <span class="text-[10px] text-fg-muted tabular-nums min-w-[4ch] text-center select-none">
              {Math.round((scale() / DEFAULT_SCALE) * 100)}%
            </span>
            <button
              type="button"
              class="p-1 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
              aria-label="Zoom in"
              onClick={zoomIn}
            >
              <IconZoomIn size={14} />
            </button>
            <div class="w-px h-3.5 bg-border-default mx-0.5" />
            <button
              type="button"
              class="p-1 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
              aria-label={t('timeline.fit')}
              onClick={zoomFit}
            >
              <IconMaximize size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* -- Timeline body -------------------------------------------------- */}
      <div
        ref={timelineBodyRef}
        class="flex-1 overflow-auto relative"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      >
        {/* SVG connection lines layer */}
        <svg
          class="absolute inset-0 pointer-events-none"
          style={{
            width: `${TRACK_LABEL_WIDTH + timelineWidth() + 48}px`,
            height: `${RULER_HEIGHT + ws.trackScenes().length * TRACK_HEIGHT + 48}px`,
            'z-index': '1',
          }}
        >
          {/* Simultaneous event bands */}
          <For each={simultaneousBands()}>
            {(band) => (
              <rect
                x={band.start * scale() + TRACK_LABEL_WIDTH}
                y={RULER_HEIGHT}
                width={(band.end - band.start) * scale()}
                height={ws.trackScenes().length * TRACK_HEIGHT}
                fill="var(--accent)"
                opacity="0.06"
                class="pointer-events-none"
              />
            )}
          </For>

          {/* Branch drag preview line */}
          <Show when={branchDrag()}>
            {(drag) => (
              <line
                x1={drag().x1}
                y1={drag().y1}
                x2={drag().x2}
                y2={drag().y2}
                stroke="var(--accent)"
                stroke-width={2}
                stroke-dasharray="6 3"
                class="pointer-events-none"
              />
            )}
          </Show>

          <For each={ws.state.connections}>
            {(conn: SceneConnection) => {
              const lookup = sceneLookup()
              const source = lookup.get(conn.sourceSceneId)
              const target = lookup.get(conn.targetSceneId)
              if (!source || !target) return null

              const from = sceneBottomCenter(source.scene, source.trackIndex)
              const to = sceneTopCenter(target.scene, target.trackIndex)
              const midY = (from.y + to.y) / 2

              const strokeColor = conn.connectionType === 'branch'
                ? 'var(--accent)'
                : 'var(--success)'

              return (
                <path
                  d={`M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`}
                  fill="none"
                  stroke={strokeColor}
                  stroke-width="1.5"
                  stroke-dasharray={conn.connectionType === 'merge' ? '6 3' : 'none'}
                  opacity="0.6"
                />
              )
            }}
          </For>
        </svg>

        <div
          class="flex flex-col relative"
          style={{
            'min-width': `${TRACK_LABEL_WIDTH + timelineWidth() + 48}px`,
            'z-index': '2',
          }}
        >
          {/* -- Ruler -------------------------------------------------------- */}
          <div class="flex flex-shrink-0" style={{ height: `${RULER_HEIGHT}px` }}>
            <div
              class="flex-shrink-0 border-r border-border-subtle"
              style={{ width: `${TRACK_LABEL_WIDTH}px` }}
            />

            {/* Ruler ticks only */}
            <div class="relative flex-1">
              <For each={rulerTicks()}>
                {(tick) => (
                  <div
                    class="absolute top-0 flex flex-col items-center"
                    style={{ left: `${tick * scale()}px` }}
                  >
                    <div class="w-px h-3 bg-border-default" />
                    <span class="text-[9px] text-fg-muted mt-0.5 select-none tabular-nums">
                      {tick}
                    </span>
                  </div>
                )}
              </For>
            </div>
          </div>

          {/* -- Tracks ----------------------------------------------------- */}
          <For each={ws.trackScenes()}>
            {(track, trackIndex) => {
              const endPos = () => trackEndPosition(track.scenes)
              const collapsed = () => isTrackCollapsed(track.id)
              const height = () => getTrackHeight(track.id)

              return (
                <ContextMenu items={trackContextItems(track.id, track.label)}>
                  <div
                    class="flex border-b border-border-subtle relative"
                    style={{ height: `${collapsed() ? MIN_TRACK_HEIGHT : height()}px` }}
                  >
                    {/* Track label */}
                    <div
                      class="flex-shrink-0 flex items-center px-3 border-r border-border-subtle"
                      style={{ width: `${TRACK_LABEL_WIDTH}px` }}
                    >
                      <Show
                        when={renamingTrackId() === track.id}
                        fallback={
                          <span
                            class="text-xs font-medium text-fg-secondary truncate cursor-default min-w-0 select-none"
                            onDblClick={() => toggleTrackCollapse(track.id)}
                          >
                            {track.label ?? `Track ${trackIndex() + 1}`}
                          </span>
                        }
                      >
                        <input
                          type="text"
                          class="h-6 w-full px-1.5 rounded text-xs bg-canvas border border-accent text-fg focus:outline-none"
                          value={renameTrackLabel()}
                          onInput={(e) => setRenameTrackLabel(e.currentTarget.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') submitRenameTrack()
                            if (e.key === 'Escape') {
                              setRenamingTrackId(null)
                              setRenameTrackLabel('')
                            }
                          }}
                          onBlur={submitRenameTrack}
                          autofocus
                        />
                      </Show>
                    </div>

                    {/* Clips area */}
                    <Show when={!collapsed()}>
                      <div class="relative flex-1" style={{ width: `${timelineWidth()}px` }}>
                        <For each={track.scenes}>
                          {(scene) => (
                            <ContextMenu items={sceneContextItems(scene.id)}>
                              <button
                                type="button"
                                class="tl-clip group"
                                style={{
                                  left: `${scene.startPosition * scale()}px`,
                                  width: `${Math.max(scene.duration * scale(), 24)}px`,
                                }}
                                data-status={statusToCss(scene.status)}
                                data-selected={ws.selectedSceneId() === scene.id}
                                onClick={(e) => {
                                  if (suppressNextClick) {
                                    suppressNextClick = false
                                    return
                                  }
                                  if (!dragActiveId()) {
                                    e.stopPropagation()
                                    ws.selectScene(scene.id)
                                  }
                                }}
                                onPointerDown={(e) => handlePointerDown(e, scene.id, track.id, scene.startPosition)}
                                onPointerEnter={(e) => { if (!dragActiveId()) showSceneTooltip(e, scene) }}
                                onPointerLeave={hideSceneTooltip}
                                aria-label={`${scene.title || 'Untitled'}, ${sceneTooltip(t, scene.status)}`}
                              >
                                {/* Left resize handle */}
                                <span
                                  class="absolute left-0 top-0 w-1.5 h-full cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-accent/30 rounded-l-md transition-opacity z-10"
                                  onPointerDown={(e) => handleResizeDown(e, scene.id, 'left', scene.startPosition, scene.duration)}
                                />
                                {sceneStatusIcon(scene.status)}
                                <span class="text-xs text-fg truncate">
                                  {scene.title || '\u2014'}
                                </span>
                                {/* Right resize handle */}
                                <span
                                  class="absolute right-0 top-0 w-1.5 h-full cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-accent/30 rounded-r-md transition-opacity z-10"
                                  onPointerDown={(e) => handleResizeDown(e, scene.id, 'right', scene.startPosition, scene.duration)}
                                />
                                {/* Branch handle */}
                                <span
                                  class="absolute -bottom-1.5 right-1 w-3 h-3 rounded-full bg-accent/60 hover:bg-accent border border-surface opacity-0 group-hover:opacity-100 transition-opacity cursor-crosshair"
                                  onPointerDown={(e) => handleBranchHandleDown(e, scene.id)}
                                />
                              </button>
                            </ContextMenu>
                          )}
                        </For>

                        {/* [+] Add scene button at end of track */}
                        <button
                          type="button"
                          class="absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-md border border-dashed border-border-default text-fg-muted hover:border-accent hover:text-accent hover:bg-accent-muted transition-colors cursor-pointer"
                          style={{ left: `${endPos() * scale() + 8}px` }}
                          aria-label="Add scene"
                          onClick={() => ws.addScene(track.id, endPos())}
                        >
                          <IconPlus size={14} />
                        </button>
                      </div>
                    </Show>
                    <Show when={collapsed()}>
                      <div class="relative flex-1 flex items-center px-2">
                        <span class="text-[10px] text-fg-muted">{track.scenes.length} scenes</span>
                      </div>
                    </Show>

                    {/* Track resize handle (bottom edge) */}
                    <div
                      data-testid="track-resize-handle"
                      class="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-accent/30 transition-colors z-10"
                      onPointerDown={(e) => handleTrackResizeDown(e, track.id)}
                    />
                  </div>
                </ContextMenu>
              )
            }}
          </For>

          {/* spacer to allow scroll beyond last track */}
          <div class="h-2" />
        </div>

        {/* (no ghost — actual clip moves via translate3d) */}
      </div>

      {/* -- Delete scene dialog -------------------------------------------- */}
      <Dialog
        open={deleteSceneId() !== null}
        onClose={() => setDeleteSceneId(null)}
        title={t('common.delete')}
        description={t('status.empty')}
        confirmLabel={t('common.delete')}
        confirmVariant="danger"
        onConfirm={() => {
          const id = deleteSceneId()
          if (id) ws.removeScene(id)
          setDeleteSceneId(null)
        }}
      />

      {/* -- Delete track dialog ------------------------------------------- */}
      <Dialog
        open={deleteTrackId() !== null}
        onClose={() => setDeleteTrackId(null)}
        title={t('common.delete')}
        confirmLabel={t('common.delete')}
        confirmVariant="danger"
        onConfirm={() => {
          const id = deleteTrackId()
          if (id) ws.removeTrack(id)
          setDeleteTrackId(null)
        }}
      />

      {/* -- Hover tooltip ------------------------------------------------- */}
      <Show when={tooltip()}>
        {(tip) => (
          <div
            class="fixed z-50 max-w-xs px-3 py-2 rounded-lg bg-surface-raised border border-border-default shadow-xl shadow-canvas/50 pointer-events-none"
            style={{ left: `${tip().x}px`, top: `${tip().y}px` }}
          >
            <p class="text-xs font-medium text-fg mb-0.5">{tip().title}</p>
            <Show when={tip().summary}>
              <p class="text-[11px] text-fg-muted leading-snug">{tip().summary}</p>
            </Show>
          </div>
        )}
      </Show>
    </div>
  )
}
