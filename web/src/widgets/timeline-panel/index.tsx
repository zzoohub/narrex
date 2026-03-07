import { For, Show, createSignal } from 'solid-js'
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
} from '@/shared/ui'
import type { Track } from '@/shared/types'

interface TimelinePanelProps {
  tracks: Track[]
  selectedSceneId: string | null
  onSelectScene: (id: string) => void
}

const TRACK_HEIGHT = 48
const TRACK_LABEL_WIDTH = 112
const MIN_SCALE = 60
const MAX_SCALE = 240
const DEFAULT_SCALE = 120
const RULER_HEIGHT = 24

function sceneStatusIcon(status: string) {
  switch (status) {
    case 'ai-draft':
      return <IconPen size={12} class="text-accent flex-shrink-0" />
    case 'edited':
      return <IconCheck size={12} class="text-success flex-shrink-0" />
    case 'needs-revision':
      return <IconAlertTriangle size={12} class="text-warning flex-shrink-0" />
    default:
      return null
  }
}

function sceneTooltip(t: (k: string) => string, status: string) {
  switch (status) {
    case 'empty':
      return t('status.empty')
    case 'ai-draft':
      return t('status.aiDraft')
    case 'edited':
      return t('status.edited')
    case 'needs-revision':
      return t('status.needsRevision')
    default:
      return ''
  }
}

export function TimelinePanel(props: TimelinePanelProps) {
  const { t } = useI18n()
  const [showHint, setShowHint] = createSignal(true)
  const [scale, setScale] = createSignal(DEFAULT_SCALE)

  function zoomIn() {
    setScale((s) => Math.min(MAX_SCALE, s + 30))
  }
  function zoomOut() {
    setScale((s) => Math.max(MIN_SCALE, s - 30))
  }
  function zoomFit() {
    setScale(DEFAULT_SCALE)
  }

  const timelineEnd = () => {
    let max = 0
    for (const track of props.tracks) {
      for (const scene of track.scenes) {
        const end = scene.startPosition + scene.duration
        if (end > max) max = end
      }
    }
    return Math.ceil(max) + 1
  }

  const timelineWidth = () => timelineEnd() * scale()

  const rulerTicks = () => {
    const ticks: number[] = []
    for (let i = 0; i <= timelineEnd(); i++) {
      ticks.push(i)
    }
    return ticks
  }

  return (
    <div class="flex flex-col h-full bg-surface border-t border-border-default">
      {/* ── Header ──────────────────────────────────────────────── */}
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

      {/* ── Hint ────────────────────────────────────────────────── */}
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

      {/* ── Timeline body ──────────────────────────────────────── */}
      <div class="flex-1 overflow-auto">
        <div class="flex flex-col" style={{ "min-width": `${TRACK_LABEL_WIDTH + timelineWidth() + 48}px` }}>
          {/* ── Ruler ──────────────────────────────────────────── */}
          <div class="flex flex-shrink-0" style={{ height: `${RULER_HEIGHT}px` }}>
            <div class="flex-shrink-0" style={{ width: `${TRACK_LABEL_WIDTH}px` }} />
            <div class="relative flex-1">
              <For each={rulerTicks()}>
                {(tick) => (
                  <div
                    class="absolute top-0 flex flex-col items-center"
                    style={{ left: `${tick * scale()}px` }}
                  >
                    <div class="w-px h-2 bg-border-default" />
                    <span class="text-[9px] text-fg-muted mt-0.5 select-none">{tick}</span>
                  </div>
                )}
              </For>
            </div>
          </div>

          {/* ── Tracks ─────────────────────────────────────────── */}
          <For each={props.tracks}>
            {(track) => (
              <div
                class="flex border-b border-border-subtle"
                style={{ height: `${TRACK_HEIGHT}px` }}
              >
                {/* Track label */}
                <div
                  class="flex-shrink-0 flex items-center justify-end pr-3 border-r border-border-subtle"
                  style={{ width: `${TRACK_LABEL_WIDTH}px` }}
                >
                  <span class="text-xs font-medium text-fg-secondary truncate">
                    {track.label}
                  </span>
                </div>

                {/* Clips area */}
                <div class="relative flex-1" style={{ width: `${timelineWidth()}px` }}>
                  <For each={track.scenes}>
                    {(scene) => (
                      <button
                        type="button"
                        class="tl-clip"
                        style={{
                          left: `${scene.startPosition * scale()}px`,
                          width: `${scene.duration * scale()}px`,
                        }}
                        data-status={scene.status}
                        data-selected={props.selectedSceneId === scene.id}
                        onClick={() => props.onSelectScene(scene.id)}
                        aria-label={`${scene.title}, ${sceneTooltip(t, scene.status)}`}
                      >
                        {sceneStatusIcon(scene.status)}
                        <span class="text-xs text-fg truncate">{scene.title}</span>
                      </button>
                    )}
                  </For>
                </div>
              </div>
            )}
          </For>

          {/* ── Add track ────────────────────────────────────────── */}
          <div class="py-2" style={{ "padding-left": `${TRACK_LABEL_WIDTH + 12}px` }}>
            <Button variant="ghost" size="sm" icon={<IconPlus size={14} />}>
              {t('timeline.addTrack')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
