import { Show } from 'solid-js'
import { useI18n } from '@/shared/lib/i18n'
import { Chip, Button, IconX, IconPlus } from '@/shared/ui'
import type { Scene, Character, SceneStatus } from '@/shared/types'

interface SceneDetailProps {
  scene: Scene
  characters: Character[]
  onClose: () => void
}

function statusLabel(t: (k: string) => string, status: SceneStatus) {
  const map: Record<SceneStatus, string> = {
    empty: 'status.empty',
    'ai-draft': 'status.aiDraft',
    edited: 'status.edited',
    'needs-revision': 'status.needsRevision',
  }
  return t(map[status])
}

function statusColor(status: SceneStatus) {
  switch (status) {
    case 'ai-draft':
      return 'text-accent bg-accent-muted'
    case 'edited':
      return 'text-success bg-success-muted'
    case 'needs-revision':
      return 'text-warning bg-warning-muted'
    default:
      return 'text-fg-muted bg-surface-raised'
  }
}

export function SceneDetail(props: SceneDetailProps) {
  const { t } = useI18n()

  const assignedChars = () =>
    props.characters.filter((c) => props.scene.characterIds.includes(c.id))

  return (
    <div class="flex flex-col h-full bg-surface">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div class="flex items-center justify-between px-4 h-10 border-b border-border-subtle flex-shrink-0">
        <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
          {t('sceneDetail.title')}
        </span>
        <button
          type="button"
          onClick={props.onClose}
          class="p-1 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
          aria-label={t('common.close')}
        >
          <IconX size={16} />
        </button>
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div class="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Title */}
        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
            {t('sceneDetail.sceneTitle')}
          </span>
          <input
            type="text"
            value={props.scene.title}
            class="h-9 px-3 rounded-lg text-sm bg-canvas border border-border-default text-fg placeholder:text-fg-muted hover:border-accent/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors"
          />
        </label>

        {/* Characters */}
        <div class="flex flex-col gap-1.5">
          <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
            {t('sceneDetail.characters')}
          </span>
          <div class="flex flex-wrap items-center gap-2">
            {assignedChars().map((char) => (
              <Chip label={char.name} onRemove={() => {}} />
            ))}
            <Button variant="ghost" size="sm" icon={<IconPlus size={14} />}>
              {t('common.add')}
            </Button>
          </div>
        </div>

        {/* Location */}
        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
            {t('sceneDetail.location')}
          </span>
          <input
            type="text"
            value={props.scene.location}
            class="h-9 px-3 rounded-lg text-sm bg-canvas border border-border-default text-fg placeholder:text-fg-muted hover:border-accent/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors"
          />
        </label>

        {/* Mood / Tone */}
        <div class="flex flex-col gap-1.5">
          <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
            {t('sceneDetail.mood')}
          </span>
          <div class="flex flex-wrap items-center gap-2">
            {props.scene.moodTags.map((tag) => (
              <Chip label={tag} variant="accent" onRemove={() => {}} />
            ))}
            <Button variant="ghost" size="sm" icon={<IconPlus size={14} />}>
              {t('common.add')}
            </Button>
          </div>
        </div>

        {/* Plot Summary */}
        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
            {t('sceneDetail.plotSummary')}
          </span>
          <textarea
            value={props.scene.plotSummary}
            rows={6}
            placeholder={t('sceneDetail.plotPlaceholder')}
            class="px-3 py-2.5 rounded-lg text-sm bg-canvas border border-border-default text-fg placeholder:text-fg-muted resize-none hover:border-accent/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors leading-relaxed"
          />
        </label>

        {/* Status */}
        <div class="flex items-center justify-between pt-2 border-t border-border-subtle">
          <span class="text-xs text-fg-muted">{t('sceneDetail.title')}</span>
          <span
            class={[
              'text-xs font-medium px-2 py-0.5 rounded-md',
              statusColor(props.scene.status),
            ].join(' ')}
          >
            {statusLabel(t, props.scene.status)}
          </span>
        </div>

        <Show when={props.scene.content}>
          <div class="flex items-center justify-between">
            <span class="text-xs text-fg-muted">
              {props.scene.content.length.toLocaleString()} {t('editor.characters')}
            </span>
          </div>
        </Show>
      </div>
    </div>
  )
}
