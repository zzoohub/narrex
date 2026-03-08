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
  IconChevronRight,
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

export function TimelinePanel() {
  const { t } = useI18n()
  const ws = useWorkspace()

  // ---- Signals ----

  const [showHint, setShowHint] = createSignal(true)
  const [scale, setScale] = createSignal(DEFAULT_SCALE)

  // Track add inline input
  const [addingTrack, setAddingTrack] = createSignal(false)
  const [newTrackLabel, setNewTrackLabel] = createSignal('')

  // Track collapse state
  const [collapsedTracks, setCollapsedTracks] = createSignal<Set<string>>(new Set())

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

  // Drag state
  const [dragging, setDragging] = createSignal<{
    sceneId: string
    originTrackId: string
    originStartPosition: number
    offsetX: number
    offsetY: number
    pointerId: number
  } | null>(null)
  const [ghostPos, setGhostPos] = createSignal({ x: 0, y: 0 })

  let timelineBodyRef: HTMLDivElement | undefined

  // ---- Zoom ----

  function zoomIn() {
    setScale((s) => Math.min(MAX_SCALE, s + SCALE_STEP))
  }
  function zoomOut() {
    setScale((s) => Math.max(MIN_SCALE, s - SCALE_STEP))
  }
  function zoomFit() {
    setScale(DEFAULT_SCALE)
  }

  function handleWheel(e: WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -SCALE_STEP / 2 : SCALE_STEP / 2
      setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + delta)))
    }
  }

  // ---- Track collapse helpers ----

  function toggleTrackCollapse(trackId: string) {
    setCollapsedTracks((prev) => {
      const next = new Set(prev)
      if (next.has(trackId)) next.delete(trackId)
      else next.add(trackId)
      return next
    })
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

  const simultaneousBands = createMemo(() => {
    const tracks = ws.trackScenes()
    if (tracks.length < 2) return []

    // Collect all unique overlap regions across tracks
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
  })

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

  // ---- Drag & Drop ----

  function handlePointerDown(e: PointerEvent, sceneId: string, trackId: string, startPosition: number) {
    // Only left button
    if (e.button !== 0) return

    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top

    target.setPointerCapture(e.pointerId)

    setDragging({
      sceneId,
      originTrackId: trackId,
      originStartPosition: startPosition,
      offsetX,
      offsetY,
      pointerId: e.pointerId,
    })
    setGhostPos({ x: e.clientX - offsetX, y: e.clientY - offsetY })
  }

  function handlePointerMove(e: PointerEvent) {
    const drag = dragging()
    if (!drag) return
    setGhostPos({ x: e.clientX - drag.offsetX, y: e.clientY - drag.offsetY })
  }

  function handlePointerUp(e: PointerEvent) {
    const drag = dragging()
    if (!drag) return

    const bodyRect = timelineBodyRef?.getBoundingClientRect()
    if (!bodyRect) {
      setDragging(null)
      return
    }

    // Compute which track the pointer is over
    const relY = e.clientY - bodyRect.top - RULER_HEIGHT
    const tracks = ws.trackScenes()
    let targetTrackIndex = Math.floor(relY / TRACK_HEIGHT)
    targetTrackIndex = Math.max(0, Math.min(tracks.length - 1, targetTrackIndex))
    const targetTrack = tracks[targetTrackIndex]

    // Compute new start position
    const relX = e.clientX - bodyRect.left - TRACK_LABEL_WIDTH + (timelineBodyRef?.scrollLeft ?? 0)
    let newStartPosition = relX / scale()
    newStartPosition = Math.max(0, Math.round(newStartPosition * 4) / 4) // snap to 0.25

    if (targetTrack && (targetTrack.id !== drag.originTrackId || Math.abs(newStartPosition - drag.originStartPosition) > 0.1)) {
      ws.moveScene(drag.sceneId, targetTrack.id, newStartPosition)
    }

    setDragging(null)
  }

  // Cancel drag on Escape
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && dragging()) {
      setDragging(null)
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
      e.preventDefault()
      setDeleteSceneId(selId)
    }
  }

  createEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    onCleanup(() => document.removeEventListener('keydown', handleKeyDown))
  })

  // ---- Track add ----

  function submitNewTrack() {
    const label = newTrackLabel().trim()
    if (label) {
      ws.addTrack(label)
    }
    batch(() => {
      setAddingTrack(false)
      setNewTrackLabel('')
    })
  }

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

  // ---- Dragging scene info for ghost ----

  const draggingScene = createMemo(() => {
    const drag = dragging()
    if (!drag) return null
    const lookup = sceneLookup()
    return lookup.get(drag.sceneId) ?? null
  })

  // ---- Render ----

  return (
    <div
      class="flex flex-col h-full bg-surface border-t border-border-default"
      tabIndex={0}
    >
      {/* -- Header --------------------------------------------------------- */}
      <div class="flex items-center justify-between px-4 h-10 border-b border-border-subtle flex-shrink-0">
        <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
          {t('timeline.title')}
        </span>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="p-1.5 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
            aria-label="Zoom out"
            onClick={zoomOut}
          >
            <IconZoomOut size={16} />
          </button>
          <span class="text-[10px] text-fg-muted tabular-nums min-w-[3ch] text-center select-none">
            {Math.round((scale() / DEFAULT_SCALE) * 100)}%
          </span>
          <button
            type="button"
            class="p-1.5 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
            aria-label="Zoom in"
            onClick={zoomIn}
          >
            <IconZoomIn size={16} />
          </button>
          <button
            type="button"
            class="p-1.5 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
            aria-label={t('timeline.fit')}
            onClick={zoomFit}
          >
            <IconMaximize size={16} />
          </button>
        </div>
      </div>

      {/* -- Hint banner ---------------------------------------------------- */}
      <Show when={showHint()}>
        <div class="flex items-center justify-between px-4 py-2 bg-accent-muted text-accent text-xs border-b border-border-subtle">
          <span>{t('timeline.hint')}</span>
          <button
            type="button"
            onClick={() => setShowHint(false)}
            class="ml-4 underline underline-offset-2 hover:no-underline cursor-pointer"
          >
            {t('common.close')}
          </button>
        </div>
      </Show>

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
          {/* -- Ruler ------------------------------------------------------ */}
          <div class="flex flex-shrink-0" style={{ height: `${RULER_HEIGHT}px` }}>
            <div class="flex-shrink-0 border-r border-border-subtle" style={{ width: `${TRACK_LABEL_WIDTH}px` }} />
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
              const isCollapsed = () => collapsedTracks().has(track.id)

              return (
                <ContextMenu items={trackContextItems(track.id, track.label)}>
                  <div
                    class="flex border-b border-border-subtle"
                    style={{ height: isCollapsed() ? '24px' : `${TRACK_HEIGHT}px` }}
                  >
                    {/* Track label */}
                    <div
                      class="flex-shrink-0 flex items-center gap-1 justify-end pr-3 border-r border-border-subtle"
                      style={{ width: `${TRACK_LABEL_WIDTH}px` }}
                    >
                      <button
                        type="button"
                        class="p-0.5 rounded text-fg-muted hover:text-fg transition-colors cursor-pointer flex-shrink-0"
                        onClick={() => toggleTrackCollapse(track.id)}
                        aria-label={isCollapsed() ? 'Expand track' : 'Collapse track'}
                      >
                        <Show when={isCollapsed()} fallback={<IconChevronDown size={12} />}>
                          <IconChevronRight size={12} />
                        </Show>
                      </button>
                      <Show
                        when={renamingTrackId() === track.id}
                        fallback={
                          <span
                            class="text-xs font-medium text-fg-secondary truncate cursor-default"
                            onDblClick={() => startRenamingTrack(track.id, track.label)}
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
                    <Show when={!isCollapsed()}>
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
                                  opacity: dragging()?.sceneId === scene.id ? '0.3' : '1',
                                }}
                                data-status={statusToCss(scene.status)}
                                data-selected={ws.selectedSceneId() === scene.id}
                                onClick={(e) => {
                                  if (!dragging()) {
                                    e.stopPropagation()
                                    ws.selectScene(scene.id)
                                  }
                                }}
                                onPointerDown={(e) => handlePointerDown(e, scene.id, track.id, scene.startPosition)}
                                onPointerEnter={(e) => showSceneTooltip(e, scene)}
                                onPointerLeave={hideSceneTooltip}
                                aria-label={`${scene.title || 'Untitled'}, ${sceneTooltip(t, scene.status)}`}
                              >
                                {sceneStatusIcon(scene.status)}
                                <span class="text-xs text-fg truncate">
                                  {scene.title || '\u2014'}
                                </span>
                                {/* Branch handle (bottom-right, visible on hover) */}
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
                    <Show when={isCollapsed()}>
                      <div class="relative flex-1 flex items-center px-2">
                        <span class="text-[10px] text-fg-muted">{track.scenes.length} scenes</span>
                      </div>
                    </Show>
                  </div>
                </ContextMenu>
              )
            }}
          </For>

          {/* -- Add track -------------------------------------------------- */}
          <div class="py-2 px-3" style={{ "padding-left": `${TRACK_LABEL_WIDTH + 12}px` }}>
            <Show
              when={addingTrack()}
              fallback={
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<IconPlus size={14} />}
                  onClick={() => setAddingTrack(true)}
                >
                  {t('timeline.addTrack')}
                </Button>
              }
            >
              <div class="flex items-center gap-2">
                <input
                  type="text"
                  class="h-8 px-3 rounded-md text-sm bg-canvas border border-border-default text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors"
                  placeholder={t('timeline.addTrack')}
                  value={newTrackLabel()}
                  onInput={(e) => setNewTrackLabel(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitNewTrack()
                    if (e.key === 'Escape') {
                      setAddingTrack(false)
                      setNewTrackLabel('')
                    }
                  }}
                  onBlur={submitNewTrack}
                  autofocus
                />
              </div>
            </Show>
          </div>
        </div>

        {/* -- Drag ghost --------------------------------------------------- */}
        <Show when={dragging() && draggingScene()}>
          {(_) => {
            const info = draggingScene()!
            return (
              <div
                class="tl-clip pointer-events-none"
                style={{
                  position: 'fixed',
                  left: `${ghostPos().x}px`,
                  top: `${ghostPos().y}px`,
                  width: `${Math.max(info.scene.duration * scale(), 24)}px`,
                  height: `${TRACK_HEIGHT - 8}px`,
                  'z-index': '100',
                  opacity: '0.8',
                }}
                data-status={statusToCss(info.scene.status)}
                data-selected="true"
              >
                {sceneStatusIcon(info.scene.status)}
                <span class="text-xs text-fg truncate">
                  {info.scene.title || '\u2014'}
                </span>
              </div>
            )
          }}
        </Show>
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
