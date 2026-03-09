import { createSignal, createMemo, Show, For, batch } from 'solid-js'
import { useI18n } from '@/shared/lib/i18n'
import { Chip, IconPlus, IconCheck, IconChevronDown, IconChevronUp } from '@/shared/ui'
import { useWorkspace } from '@/features/workspace'
import type { PovType } from '@/entities/project'

// ---- Helpers -----------------------------------------------------------------

export const POV_OPTIONS: { value: PovType; labelKey: string }[] = [
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
  onClose?: () => void
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
    const tag = newTag().trim().replace(/,/g, '')
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

  // ---- Shared styles ----

  const inputClass =
    'h-8 px-0 bg-transparent border-0 border-b border-border-default text-sm text-fg placeholder:text-fg-muted/60 hover:border-fg-muted focus:border-accent focus:outline-none transition-colors'

  const labelClass = 'text-[11px] font-medium text-fg-muted tracking-wider uppercase'

  // ---- Render ----

  return (
    <div
      data-testid="config-panel"
      class="grid overflow-hidden border-b border-border-default bg-surface transition-[grid-template-rows] duration-300 ease-out"
      style={{
        'grid-template-rows': props.open ? '1fr' : '0fr',
        'border-bottom-width': props.open ? undefined : '0px',
      }}
    >
      <div class="min-h-0 overflow-hidden">
        <div class="px-5 py-5 relative">
          {/* Close button */}
          <Show when={props.onClose}>
            <button
              type="button"
              class="edge-tab edge-tab--top-inner"
              aria-label="Close config panel"
              onClick={props.onClose}
            >
              <IconChevronUp size={14} />
            </button>
          </Show>

          {/* Row 1: Genre, Theme, Era, POV — 4 equal columns */}
          <div class="grid grid-cols-4 gap-x-5 max-w-5xl">
            {/* Genre */}
            <label class="flex flex-col gap-1">
              <span class={labelClass}>{t('config.genre')}</span>
              <input
                type="text"
                maxlength={120}
                value={genre()}
                placeholder={t('config.genre.placeholder')}
                onInput={(e) => handleGenreInput(e.currentTarget.value)}
                class={inputClass}
              />
            </label>

            {/* Theme */}
            <label class="flex flex-col gap-1">
              <span class={labelClass}>{t('config.theme')}</span>
              <input
                type="text"
                maxlength={120}
                value={theme()}
                placeholder={t('config.theme.placeholder')}
                onInput={(e) => handleThemeInput(e.currentTarget.value)}
                class={inputClass}
              />
            </label>

            {/* Era / Location */}
            <label class="flex flex-col gap-1">
              <span class={labelClass}>{t('config.era')}</span>
              <input
                type="text"
                maxlength={200}
                value={eraLocation()}
                placeholder={t('config.era.placeholder')}
                onInput={(e) => handleEraInput(e.currentTarget.value)}
                class={inputClass}
              />
            </label>

            {/* POV — custom select with chevron */}
            <label class="flex flex-col gap-1">
              <span class={labelClass}>{t('config.pov')}</span>
              <div class="relative">
                <select
                  value={pov()}
                  onChange={(e) => handlePovChange(e.currentTarget.value)}
                  class={`${inputClass} w-full appearance-none cursor-pointer pr-6`}
                >
                  <For each={POV_OPTIONS}>
                    {(opt) => (
                      <option value={opt.value}>{t(opt.labelKey)}</option>
                    )}
                  </For>
                </select>
                <IconChevronDown
                  size={14}
                  class="absolute right-0 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none"
                />
              </div>
            </label>
          </div>

          {/* Row 2: Mood / Tone — full width */}
          <div class="flex items-center gap-3 mt-6 max-w-5xl">
            <span class={`${labelClass} flex-shrink-0`}>{t('config.mood')}</span>
            <div class="flex items-center gap-2 flex-wrap min-h-[28px]">
              <For each={toneTags()}>
                {(tag) => (
                  <Chip label={tag} onRemove={() => removeToneTag(tag)} />
                )}
              </For>

              <Show
                when={addingTag()}
                fallback={
                  <button
                    type="button"
                    onClick={() => setAddingTag(true)}
                    class="inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs text-fg-muted hover:text-fg hover:bg-surface-raised border border-dashed border-border-default hover:border-accent/40 transition-colors cursor-pointer"
                  >
                    <IconPlus size={12} />
                    {t('common.add')}
                  </button>
                }
              >
                <div class="inline-flex items-center gap-0.5">
                  <input
                    type="text"
                    maxlength={60}
                    class="h-7 w-36 px-2 rounded-l-md text-xs bg-surface-raised border border-accent/50 text-fg placeholder:text-fg-muted/50 focus:outline-none focus:border-accent transition-colors"
                    placeholder={t('config.mood.placeholder')}
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
                  <button
                    type="button"
                    onClick={addToneTag}
                    class="h-7 w-7 flex items-center justify-center rounded-r-md bg-surface-raised border border-l-0 border-accent/50 text-fg-muted hover:text-accent transition-colors cursor-pointer"
                    aria-label={t('common.add')}
                  >
                    <IconCheck size={14} />
                  </button>
                </div>
              </Show>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
