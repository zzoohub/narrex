import type { SceneStatus } from '@/entities/scene'

/** CSS classes for scene status badges. */
export const STATUS_COLORS: Record<SceneStatus, string> = {
  empty: 'text-fg-muted bg-surface-raised',
  ai_draft: 'text-accent bg-accent-muted',
  edited: 'text-success bg-success-muted',
  needs_revision: 'text-warning bg-warning-muted',
}

/** i18n keys for scene status labels. */
export const STATUS_KEYS: Record<SceneStatus, string> = {
  empty: 'status.empty',
  ai_draft: 'status.aiDraft',
  edited: 'status.edited',
  needs_revision: 'status.needsRevision',
}
