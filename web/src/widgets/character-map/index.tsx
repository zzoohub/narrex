import { createSignal, For, Show } from 'solid-js'
import { useI18n } from '@/shared/lib/i18n'
import { Button, IconPlus, IconArrowLeft, IconTrash } from '@/shared/ui'
import type { Character, Relationship } from '@/shared/types'

interface CharacterMapProps {
  characters: Character[]
  relationships: Relationship[]
}

export function CharacterMap(props: CharacterMapProps) {
  const { t } = useI18n()
  const [selectedCharId, setSelectedCharId] = createSignal<string | null>(null)

  const selectedChar = () =>
    props.characters.find((c) => c.id === selectedCharId())

  return (
    <div class="flex flex-col h-full bg-surface">
      <Show
        when={selectedChar()}
        fallback={<GraphView {...props} t={t} onSelect={setSelectedCharId} />}
      >
        {(char) => (
          <CharacterCard
            character={char()}
            t={t}
            onBack={() => setSelectedCharId(null)}
          />
        )}
      </Show>
    </div>
  )
}

/* ── Graph view ──────────────────────────────────────────────────────── */

function GraphView(props: {
  characters: Character[]
  relationships: Relationship[]
  t: (k: string) => string
  onSelect: (id: string) => void
}) {
  return (
    <>
      {/* Header */}
      <div class="flex items-center justify-between px-4 h-10 border-b border-border-subtle flex-shrink-0">
        <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
          {props.t('characters.title')}
        </span>
        <Button variant="ghost" size="sm" icon={<IconPlus size={14} />}>
          {props.t('characters.add')}
        </Button>
      </div>

      {/* Graph area */}
      <div class="flex-1 relative overflow-hidden">
        <Show
          when={props.characters.length > 0}
          fallback={
            <div class="flex flex-col items-center justify-center h-full px-6 text-center">
              <p class="text-sm text-fg-muted leading-relaxed">
                {props.t('characters.empty')}
              </p>
              <Button
                variant="secondary"
                size="sm"
                icon={<IconPlus size={14} />}
                class="mt-4"
              >
                {props.t('characters.add')}
              </Button>
            </div>
          }
        >
          {/* Relationship lines (SVG) */}
          <svg class="absolute inset-0 w-full h-full pointer-events-none">
            <For each={props.relationships}>
              {(rel) => {
                const from = () => props.characters.find((c) => c.id === rel.fromId)
                const to = () => props.characters.find((c) => c.id === rel.toId)
                return (
                  <Show when={from() && to()}>
                    <g>
                      <line
                        x1={from()!.x}
                        y1={from()!.y}
                        x2={to()!.x}
                        y2={to()!.y}
                        stroke="var(--border-default)"
                        stroke-width={1.5}
                        stroke-dasharray={
                          rel.type === 'negative' ? '6 4' : undefined
                        }
                      />
                      {/* Relationship label */}
                      <text
                        x={(from()!.x + to()!.x) / 2}
                        y={(from()!.y + to()!.y) / 2 - 6}
                        text-anchor="middle"
                        class="text-[10px] fill-fg-muted"
                      >
                        {rel.label}
                      </text>
                    </g>
                  </Show>
                )
              }}
            </For>
          </svg>

          {/* Character nodes */}
          <For each={props.characters}>
            {(char) => (
              <button
                type="button"
                class="absolute flex flex-col items-center gap-1 -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                style={{ left: `${char.x}px`, top: `${char.y}px` }}
                onClick={() => props.onSelect(char.id)}
              >
                <div class="w-11 h-11 rounded-full bg-surface-raised border-2 border-border-default flex items-center justify-center text-sm font-semibold text-fg group-hover:border-accent group-hover:shadow-lg group-hover:shadow-accent/10 transition-all">
                  {char.name.charAt(0)}
                </div>
                <span class="text-[11px] text-fg-secondary group-hover:text-fg transition-colors whitespace-nowrap">
                  {char.name}
                </span>
              </button>
            )}
          </For>
        </Show>
      </div>
    </>
  )
}

/* ── Character card ──────────────────────────────────────────────────── */

function CharacterCard(props: {
  character: Character
  t: (k: string) => string
  onBack: () => void
}) {
  const fields = () =>
    [
      { key: 'characters.name', value: props.character.name },
      { key: 'characters.personality', value: props.character.personality },
      { key: 'characters.appearance', value: props.character.appearance },
      { key: 'characters.secrets', value: props.character.secrets },
      { key: 'characters.motivation', value: props.character.motivation },
    ] as const

  return (
    <>
      {/* Header */}
      <div class="flex items-center gap-2 px-4 h-10 border-b border-border-subtle flex-shrink-0">
        <button
          type="button"
          onClick={props.onBack}
          class="p-1 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
        >
          <IconArrowLeft size={16} />
        </button>
        <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
          {props.t('characters.title')}
        </span>
      </div>

      {/* Card body */}
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Avatar placeholder */}
        <div class="flex flex-col items-center gap-2">
          <div class="w-16 h-16 rounded-full bg-surface-raised border-2 border-border-default flex items-center justify-center text-xl font-display font-semibold text-fg">
            {props.character.name.charAt(0)}
          </div>
        </div>

        {/* Fields */}
        <For each={fields()}>
          {(field) => (
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
                {props.t(field.key)}
              </span>
              <textarea
                value={field.value}
                rows={field.key === 'characters.name' ? 1 : 3}
                class="px-3 py-2 rounded-lg text-sm bg-canvas border border-border-default text-fg placeholder:text-fg-muted resize-none hover:border-accent/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors"
              />
            </label>
          )}
        </For>

        {/* Delete */}
        <Button variant="danger" size="sm" class="w-full mt-4" icon={<IconTrash size={14} />}>
          {props.t('characters.deleteCharacter')}
        </Button>
      </div>
    </>
  )
}
