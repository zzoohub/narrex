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
import type { Track, TimelineNode } from '@/shared/types'

interface TimelinePanelProps {
  tracks: Track[]
  selectedNodeId: string | null
  onSelectNode: (id: string) => void
}

function nodeStatusIcon(status: string) {
  switch (status) {
    case 'ai-draft':
      return <IconPen size={12} class="text-accent" />
    case 'edited':
      return <IconCheck size={12} class="text-success" />
    case 'needs-revision':
      return <IconAlertTriangle size={12} class="text-warning" />
    default:
      return null
  }
}

function nodeTooltip(t: (k: string) => string, status: string) {
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
          >
            <IconZoomOut size={16} />
          </button>
          <button
            type="button"
            class="p-1.5 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
            aria-label="Zoom in"
          >
            <IconZoomIn size={16} />
          </button>
          <button
            type="button"
            class="p-1.5 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
            aria-label={t('timeline.fit')}
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

      {/* ── Tracks ──────────────────────────────────────────────── */}
      <div class="flex-1 overflow-auto px-4 py-3">
        <div class="flex flex-col gap-4 min-w-max">
          <For each={props.tracks}>
            {(track) => (
              <div class="flex items-center gap-3">
                {/* Track label */}
                <div class="w-28 flex-shrink-0 text-right pr-3 border-r border-border-subtle">
                  <span class="text-xs font-medium text-fg-secondary truncate block">
                    {track.label}
                  </span>
                </div>

                {/* Nodes */}
                <div class="flex items-center gap-2">
                  <For each={track.nodes}>
                    {(node, i) => (
                      <div class="flex items-center gap-2">
                        {/* Connection line */}
                        <Show when={i() > 0}>
                          <div class="w-8 h-0.5 bg-border-default rounded-full flex-shrink-0" />
                        </Show>

                        {/* Node */}
                        <div class="relative group">
                          <button
                            type="button"
                            class="tl-node flex items-center justify-center"
                            data-status={node.status}
                            data-selected={props.selectedNodeId === node.id}
                            onClick={() => props.onSelectNode(node.id)}
                            aria-label={`${node.title}, ${nodeTooltip(t, node.status)}`}
                          >
                            {nodeStatusIcon(node.status)}
                          </button>

                          {/* Tooltip */}
                          <div class="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-surface-overlay border border-border-default rounded-md text-xs text-fg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-20">
                            {node.title}
                          </div>
                        </div>
                      </div>
                    )}
                  </For>

                  {/* Add node button */}
                  <div class="w-8 h-0.5 bg-border-default rounded-full flex-shrink-0" />
                  <button
                    type="button"
                    class="w-7 h-7 rounded-full border border-dashed border-border-default flex items-center justify-center text-fg-muted hover:border-accent hover:text-accent transition-colors cursor-pointer flex-shrink-0"
                    aria-label="Add node"
                  >
                    <IconPlus size={14} />
                  </button>
                </div>
              </div>
            )}
          </For>
        </div>

        {/* Add track */}
        <div class="mt-4 ml-[calc(7rem+12px)]">
          <Button variant="ghost" size="sm" icon={<IconPlus size={14} />}>
            {t('timeline.addTrack')}
          </Button>
        </div>
      </div>
    </div>
  )
}
