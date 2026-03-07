import { createSignal, Show, For, onCleanup } from 'solid-js'
import { useI18n } from '@/shared/lib/i18n'
import { useWorkspace } from '@/features/workspace'
import { Chip, Button, IconX, IconPlus } from '@/shared/ui'
import type { SceneStatus } from '@/entities/scene'

// ---- Status helpers ---------------------------------------------------------

const STATUS_COLORS: Record<SceneStatus, string> = {
  empty: 'text-fg-muted bg-surface-raised',
  ai_draft: 'text-accent bg-accent-muted',
  edited: 'text-success bg-success-muted',
  needs_revision: 'text-warning bg-warning-muted',
}

const STATUS_KEYS: Record<SceneStatus, string> = {
  empty: 'status.empty',
  ai_draft: 'status.aiDraft',
  edited: 'status.edited',
  needs_revision: 'status.needsRevision',
}

// ---- Debounce utility -------------------------------------------------------

function createDebounce(fn: () => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  const trigger = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn()
      timer = undefined
    }, ms)
  }
  const cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = undefined
    }
  }
  return { trigger, cancel }
}

// ---- Component --------------------------------------------------------------

export function SceneDetail() {
  const { t } = useI18n()
  const ws = useWorkspace()

  // ---- Local state for pending field values --------------------------------

  let pendingTitle: string | undefined
  let pendingLocation: string | undefined
  let pendingPlot: string | undefined

  // ---- Debounced save -------------------------------------------------------

  const titleSave = createDebounce(() => {
    const s = ws.selectedScene()
    if (s && pendingTitle !== undefined) {
      ws.updateScene(s.id, { title: pendingTitle })
      pendingTitle = undefined
    }
  }, 500)

  const locationSave = createDebounce(() => {
    const s = ws.selectedScene()
    if (s && pendingLocation !== undefined) {
      ws.updateScene(s.id, { location: pendingLocation || null })
      pendingLocation = undefined
    }
  }, 500)

  const plotSave = createDebounce(() => {
    const s = ws.selectedScene()
    if (s && pendingPlot !== undefined) {
      ws.updateScene(s.id, { plotSummary: pendingPlot || null })
      pendingPlot = undefined
    }
  }, 500)

  onCleanup(() => {
    titleSave.cancel()
    locationSave.cancel()
    plotSave.cancel()
  })

  // ---- Character dropdown ---------------------------------------------------

  const [showCharDropdown, setShowCharDropdown] = createSignal(false)

  // ---- Mood tag input -------------------------------------------------------

  const [showMoodInput, setShowMoodInput] = createSignal(false)
  const [newMoodTag, setNewMoodTag] = createSignal('')

  // ---- Derived --------------------------------------------------------------

  const scene = () => ws.selectedScene()

  const assignedChars = () => {
    const s = scene()
    return s ? ws.assignedCharacters(s.id) : []
  }

  const availableChars = () => {
    const s = scene()
    if (!s) return []
    return ws.state.characters.filter((c) => !s.characterIds.includes(c.id))
  }

  const draftCharCount = () => {
    const s = scene()
    if (!s) return 0
    return ws.draftContent(s.id).length
  }

  // ---- Handlers -------------------------------------------------------------

  function handleTitleInput(e: InputEvent) {
    const value = (e.currentTarget as HTMLInputElement).value
    pendingTitle = value
    titleSave.trigger()
  }

  function handleLocationInput(e: InputEvent) {
    const value = (e.currentTarget as HTMLInputElement).value
    pendingLocation = value
    locationSave.trigger()
  }

  function handlePlotInput(e: InputEvent) {
    const value = (e.currentTarget as HTMLTextAreaElement).value
    pendingPlot = value
    plotSave.trigger()
  }

  function removeCharacter(charId: string) {
    const s = scene()
    if (!s) return
    ws.updateScene(s.id, {
      characterIds: s.characterIds.filter((id) => id !== charId),
    })
  }

  function addCharacter(charId: string) {
    const s = scene()
    if (!s) return
    ws.updateScene(s.id, {
      characterIds: [...s.characterIds, charId],
    })
    setShowCharDropdown(false)
  }

  function removeMoodTag(tag: string) {
    const s = scene()
    if (!s) return
    ws.updateScene(s.id, {
      moodTags: s.moodTags.filter((t) => t !== tag),
    })
  }

  function addMoodTag() {
    const s = scene()
    const tag = newMoodTag().trim()
    if (!s || !tag) return
    if (!s.moodTags.includes(tag)) {
      ws.updateScene(s.id, {
        moodTags: [...s.moodTags, tag],
      })
    }
    setNewMoodTag('')
    setShowMoodInput(false)
  }

  function handleClose() {
    ws.selectScene(null)
  }

  // ---- Render ---------------------------------------------------------------

  return (
    <Show when={scene()}>
      {(s) => (
        <div class="flex flex-col h-full bg-surface">
          {/* -- Header ---------------------------------------------------- */}
          <div class="flex items-center justify-between px-4 h-10 border-b border-border-subtle flex-shrink-0">
            <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
              {t('sceneDetail.title')}
            </span>
            <button
              type="button"
              onClick={handleClose}
              class="p-1 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
              aria-label={t('common.close')}
            >
              <IconX size={16} />
            </button>
          </div>

          {/* -- Body ------------------------------------------------------ */}
          <div class="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Title */}
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
                {t('sceneDetail.sceneTitle')}
              </span>
              <input
                type="text"
                value={s().title}
                onInput={handleTitleInput}
                class="h-9 px-3 rounded-lg text-sm bg-canvas border border-border-default text-fg placeholder:text-fg-muted hover:border-accent/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors"
              />
            </label>

            {/* Characters */}
            <div class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
                {t('sceneDetail.characters')}
              </span>
              <div class="flex flex-wrap items-center gap-2">
                <For each={assignedChars()}>
                  {(char) => (
                    <Chip
                      label={char.name}
                      onRemove={() => removeCharacter(char.id)}
                    />
                  )}
                </For>
                <div class="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<IconPlus size={14} />}
                    onClick={() => setShowCharDropdown((v) => !v)}
                  >
                    {t('common.add')}
                  </Button>
                  <Show when={showCharDropdown() && availableChars().length > 0}>
                    <div class="absolute top-full left-0 mt-1 w-48 py-1 bg-surface-raised border border-border-default rounded-lg shadow-xl shadow-canvas/50 z-20">
                      <For each={availableChars()}>
                        {(char) => (
                          <button
                            type="button"
                            class="w-full text-left px-3 py-1.5 text-sm text-fg hover:bg-surface transition-colors cursor-pointer"
                            onClick={() => addCharacter(char.id)}
                          >
                            {char.name}
                          </button>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
              </div>
            </div>

            {/* Location */}
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
                {t('sceneDetail.location')}
              </span>
              <input
                type="text"
                value={s().location ?? ''}
                onInput={handleLocationInput}
                class="h-9 px-3 rounded-lg text-sm bg-canvas border border-border-default text-fg placeholder:text-fg-muted hover:border-accent/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors"
              />
            </label>

            {/* Mood / Tone */}
            <div class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
                {t('sceneDetail.mood')}
              </span>
              <div class="flex flex-wrap items-center gap-2">
                <For each={s().moodTags}>
                  {(tag) => (
                    <Chip
                      label={tag}
                      variant="accent"
                      onRemove={() => removeMoodTag(tag)}
                    />
                  )}
                </For>
                <Show
                  when={showMoodInput()}
                  fallback={
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<IconPlus size={14} />}
                      onClick={() => setShowMoodInput(true)}
                    >
                      {t('common.add')}
                    </Button>
                  }
                >
                  <div class="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newMoodTag()}
                      onInput={(e) => setNewMoodTag(e.currentTarget.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addMoodTag()
                        if (e.key === 'Escape') {
                          setShowMoodInput(false)
                          setNewMoodTag('')
                        }
                      }}
                      class="h-7 w-28 px-2 rounded-md text-xs bg-canvas border border-border-default text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors"
                      autofocus
                    />
                    <button
                      type="button"
                      class="p-1 rounded-md text-fg-muted hover:text-fg transition-colors cursor-pointer"
                      onClick={() => {
                        setShowMoodInput(false)
                        setNewMoodTag('')
                      }}
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                </Show>
              </div>
            </div>

            {/* Plot Summary */}
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
                {t('sceneDetail.plotSummary')}
              </span>
              <textarea
                value={s().plotSummary ?? ''}
                onInput={handlePlotInput}
                rows={6}
                placeholder={t('sceneDetail.plotPlaceholder')}
                class="px-3 py-2.5 rounded-lg text-sm bg-canvas border border-border-default text-fg placeholder:text-fg-muted resize-none hover:border-accent/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors leading-relaxed"
              />
            </label>

            {/* Status */}
            <div class="flex items-center justify-between pt-2 border-t border-border-subtle">
              <span class="text-xs text-fg-muted">{t('sceneDetail.title')}</span>
              <span
                class={`text-xs font-medium px-2 py-0.5 rounded-md ${STATUS_COLORS[s().status]}`}
              >
                {t(STATUS_KEYS[s().status])}
              </span>
            </div>

            {/* Draft character count */}
            <Show when={draftCharCount() > 0}>
              <div class="flex items-center justify-between">
                <span class="text-xs text-fg-muted">
                  {draftCharCount().toLocaleString()} {t('editor.characters')}
                </span>
              </div>
            </Show>
          </div>
        </div>
      )}
    </Show>
  )
}
