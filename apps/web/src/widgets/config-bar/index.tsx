import { createSignal, createMemo, Show, For, batch } from 'solid-js'
import { useI18n } from '@/shared/lib/i18n'
import { Chip, Button, IconPlus } from '@/shared/ui'
import { useWorkspace } from '@/features/workspace'
import type { PovType } from '@/entities/project'

// ---- Helpers -----------------------------------------------------------------

const POV_OPTIONS: { value: PovType; labelKey: string }[] = [
  { value: 'first_person', labelKey: 'config.pov.first' },
  { value: 'third_limited', labelKey: 'config.pov.thirdLimited' },
  { value: 'third_omniscient', labelKey: 'config.pov.thirdOmniscient' },
]

function parseToneTags(tone: string | null | undefined): string[] {
  if (!tone) return []
  return tone
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function joinToneTags(tags: string[]): string {
  return tags.join(', ')
}

// ---- Component ---------------------------------------------------------------

interface ConfigBarProps {
  open: boolean
  onClose: () => void
}

export function ConfigBar(props: ConfigBarProps) {
  const { t } = useI18n()
  const ws = useWorkspace()

  const [addingTag, setAddingTag] = createSignal(false)
  const [newTag, setNewTag] = createSignal('')

  // ---- Derived from project ----

  const genre = createMemo(() => ws.state.project?.genre ?? '')
  const theme = createMemo(() => ws.state.project?.theme ?? '')
  const eraLocation = createMemo(() => ws.state.project?.eraLocation ?? '')
  const pov = createMemo(() => ws.state.project?.pov ?? 'first_person')
  const toneTags = createMemo(() => parseToneTags(ws.state.project?.tone))

  // ---- Handlers (auto-save via the store debounce) ----

  function handleGenreInput(value: string) {
    ws.updateProject({ genre: value })
  }

  function handleThemeInput(value: string) {
    ws.updateProject({ theme: value })
  }

  function handleEraInput(value: string) {
    ws.updateProject({ eraLocation: value })
  }

  function handlePovChange(value: string) {
    ws.updateProject({ pov: value as PovType })
  }

  function removeToneTag(tag: string) {
    const next = toneTags().filter((t) => t !== tag)
    ws.updateProject({ tone: joinToneTags(next) })
  }

  function addToneTag() {
    const tag = newTag().trim()
    if (!tag) {
      batch(() => {
        setAddingTag(false)
        setNewTag('')
      })
      return
    }
    const existing = toneTags()
    if (!existing.includes(tag)) {
      const next = [...existing, tag]
      ws.updateProject({ tone: joinToneTags(next) })
    }
    batch(() => {
      setAddingTag(false)
      setNewTag('')
    })
  }

  // ---- Input class (shared) ----

  const inputClass =
    'h-9 px-3 rounded-lg text-sm bg-canvas border border-border-default text-fg placeholder:text-fg-muted hover:border-accent/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors'

  // ---- Render ----

  return (
    <Show when={props.open}>
      {/* Backdrop */}
      <div
        data-testid="config-backdrop"
        class="fixed inset-0 z-40"
        onClick={() => props.onClose()}
      />

      {/* Dropdown panel */}
      <div class="absolute left-0 right-0 top-full z-50 border-b border-border-default bg-surface shadow-lg animate-fade-in">
        <div class="px-5 py-5">
          <div class="grid grid-cols-3 gap-x-6 gap-y-4 max-w-4xl">
            {/* Genre */}
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
                {t('config.genre')}
              </span>
              <input
                type="text"
                value={genre()}
                onInput={(e) => handleGenreInput(e.currentTarget.value)}
                class={inputClass}
              />
            </label>

            {/* Theme */}
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
                {t('config.theme')}
              </span>
              <input
                type="text"
                value={theme()}
                onInput={(e) => handleThemeInput(e.currentTarget.value)}
                class={inputClass}
              />
            </label>

            {/* Era / Location */}
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
                {t('config.era')}
              </span>
              <input
                type="text"
                value={eraLocation()}
                onInput={(e) => handleEraInput(e.currentTarget.value)}
                class={inputClass}
              />
            </label>

            {/* POV */}
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
                {t('config.pov')}
              </span>
              <select
                value={pov()}
                onChange={(e) => handlePovChange(e.currentTarget.value)}
                class={`${inputClass} appearance-none cursor-pointer`}
              >
                <For each={POV_OPTIONS}>
                  {(opt) => (
                    <option value={opt.value}>{t(opt.labelKey)}</option>
                  )}
                </For>
              </select>
            </label>

            {/* Mood / Tone tags */}
            <div class="col-span-2 flex flex-col gap-1.5">
              <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
                {t('config.mood')}
              </span>
              <div class="flex items-center gap-2 flex-wrap">
                <For each={toneTags()}>
                  {(tag) => (
                    <Chip label={tag} onRemove={() => removeToneTag(tag)} />
                  )}
                </For>

                <Show
                  when={addingTag()}
                  fallback={
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<IconPlus size={14} />}
                      onClick={() => setAddingTag(true)}
                    >
                      {t('common.add')}
                    </Button>
                  }
                >
                  <input
                    type="text"
                    class="h-7 w-28 px-2 rounded-md text-xs bg-canvas border border-accent text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors"
                    placeholder={t('common.add')}
                    value={newTag()}
                    onInput={(e) => setNewTag(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addToneTag()
                      if (e.key === 'Escape') {
                        setAddingTag(false)
                        setNewTag('')
                      }
                    }}
                    onBlur={addToneTag}
                    autofocus
                  />
                </Show>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Show>
  )
}
