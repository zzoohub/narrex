import { createSignal, Show } from 'solid-js'
import { useI18n } from '@/shared/lib/i18n'
import { Chip, Button, IconChevronDown, IconChevronUp, IconPlus } from '@/shared/ui'
import type { StoryConfig } from '@/shared/types'

interface ConfigBarProps {
  config: StoryConfig
}

export function ConfigBar(props: ConfigBarProps) {
  const { t } = useI18n()
  const [expanded, setExpanded] = createSignal(false)

  return (
    <div class="border-b border-border-default bg-surface transition-all duration-200">
      {/* ── Collapsed bar ────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        class="w-full flex items-center gap-3 px-5 h-11 text-sm cursor-pointer hover:bg-surface-raised transition-colors"
      >
        <Show
          when={expanded()}
          fallback={<IconChevronDown size={16} class="text-fg-muted flex-shrink-0" />}
        >
          <IconChevronUp size={16} class="text-fg-muted flex-shrink-0" />
        </Show>

        <span class="text-fg-muted font-medium text-xs uppercase tracking-wide mr-2">
          {t('config.title')}
        </span>

        <Show when={!expanded()}>
          <div class="flex items-center gap-2 overflow-hidden">
            <Chip label={props.config.genre} variant="accent" />
            {props.config.moodTags.slice(0, 2).map((tag) => (
              <Chip label={tag} />
            ))}
            <Show when={props.config.era}>
              <span class="text-fg-muted text-xs truncate">{props.config.era}</span>
            </Show>
            <span class="text-fg-muted text-xs">
              {t(`config.pov.${props.config.pov === 'first' ? 'first' : props.config.pov === 'third-limited' ? 'thirdLimited' : 'thirdOmniscient'}`)}
            </span>
          </div>
        </Show>
      </button>

      {/* ── Expanded panel ───────────────────────────────────────── */}
      <Show when={expanded()}>
        <div class="px-5 pb-5 pt-2 animate-fade-in">
          <div class="grid grid-cols-3 gap-x-6 gap-y-4 max-w-4xl">
            {/* Genre */}
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
                {t('config.genre')}
              </span>
              <input
                type="text"
                value={props.config.genre}
                class="h-9 px-3 rounded-lg text-sm bg-canvas border border-border-default text-fg placeholder:text-fg-muted hover:border-accent/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors"
              />
            </label>

            {/* Theme */}
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
                {t('config.theme')}
              </span>
              <input
                type="text"
                value={props.config.theme}
                class="h-9 px-3 rounded-lg text-sm bg-canvas border border-border-default text-fg placeholder:text-fg-muted hover:border-accent/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors"
              />
            </label>

            {/* Era / Location */}
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
                {t('config.era')}
              </span>
              <input
                type="text"
                value={props.config.era}
                class="h-9 px-3 rounded-lg text-sm bg-canvas border border-border-default text-fg placeholder:text-fg-muted hover:border-accent/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors"
              />
            </label>

            {/* POV */}
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
                {t('config.pov')}
              </span>
              <select class="h-9 px-3 rounded-lg text-sm bg-canvas border border-border-default text-fg hover:border-accent/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors appearance-none cursor-pointer">
                <option value="first">{t('config.pov.first')}</option>
                <option value="third-limited">{t('config.pov.thirdLimited')}</option>
                <option value="third-omniscient">{t('config.pov.thirdOmniscient')}</option>
              </select>
            </label>

            {/* Mood / Tone */}
            <div class="col-span-2 flex flex-col gap-1.5">
              <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
                {t('config.mood')}
              </span>
              <div class="flex items-center gap-2 flex-wrap">
                {props.config.moodTags.map((tag) => (
                  <Chip label={tag} onRemove={() => {}} />
                ))}
                <Button variant="ghost" size="sm" icon={<IconPlus size={14} />}>
                  {t('common.add')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}
