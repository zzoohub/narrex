import { createSignal, Show } from 'solid-js'
import { useI18n } from '@/shared/lib/i18n'
import {
  Button,
  IconChevronLeft,
  IconChevronRight,
  IconSparkles,
  IconBold,
  IconItalic,
  IconStop,
} from '@/shared/ui'
import type { Scene } from '@/shared/types'

interface EditorPanelProps {
  selectedScene: Scene | null
  prevSceneTitle?: string
  nextSceneTitle?: string
  onSelectPrev?: () => void
  onSelectNext?: () => void
}

export function EditorPanel(props: EditorPanelProps) {
  const { t } = useI18n()
  const [isGenerating, setIsGenerating] = createSignal(false)
  const [showAiInput, setShowAiInput] = createSignal(false)

  const charCount = () => props.selectedScene?.content.length ?? 0
  const hasDraft = () => (props.selectedScene?.content.length ?? 0) > 0

  return (
    <div class="flex flex-col h-full bg-canvas">
      <Show
        when={props.selectedScene}
        fallback={
          /* ── No scene selected ────────────────────────────────── */
          <div class="flex-1 flex flex-col items-center justify-center px-8 text-center">
            <div class="w-20 h-20 rounded-2xl bg-surface border border-border-default flex items-center justify-center mb-6">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                class="text-fg-muted"
              >
                <path d="M4 6h16M4 12h16M4 18h8" stroke-linecap="round" />
              </svg>
            </div>
            <p class="text-fg-muted text-sm leading-relaxed max-w-xs">
              {t('editor.selectScene')}
            </p>
          </div>
        }
      >
        {(scene) => (
          <>
            {/* ── Editor header ──────────────────────────────────── */}
            <div class="flex items-center justify-between px-4 h-11 border-b border-border-subtle flex-shrink-0">
              {/* Prev / title / next */}
              <div class="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={props.onSelectPrev}
                  disabled={!props.prevSceneTitle}
                  class="p-1 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  aria-label="Previous scene"
                >
                  <IconChevronLeft size={16} />
                </button>
                <span class="text-sm font-medium text-fg truncate">
                  {scene().title}
                </span>
                <button
                  type="button"
                  onClick={props.onSelectNext}
                  disabled={!props.nextSceneTitle}
                  class="p-1 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  aria-label="Next scene"
                >
                  <IconChevronRight size={16} />
                </button>
              </div>

              {/* Actions */}
              <div class="flex items-center gap-2">
                <Show when={hasDraft()}>
                  <Button variant="ghost" size="sm">
                    {t('editor.regenerate')}
                  </Button>
                </Show>
                <Show when={!isGenerating()}>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<IconSparkles size={14} />}
                    onClick={() => setIsGenerating(true)}
                  >
                    {t('editor.generate')}
                  </Button>
                </Show>
              </div>
            </div>

            {/* ── Editor body ────────────────────────────────────── */}
            <div class="flex-1 overflow-y-auto relative">
              <Show
                when={hasDraft() || isGenerating()}
                fallback={
                  /* ── Empty: scene selected, no draft ─────────── */
                  <div class="flex flex-col items-center justify-center h-full px-8 text-center">
                    <p class="text-lg font-display text-fg mb-2">
                      {t('editor.readyTitle')}
                    </p>
                    <p class="text-sm text-fg-muted max-w-sm leading-relaxed mb-6">
                      {t('editor.readyDescription')}
                    </p>
                    <Button
                      variant="primary"
                      size="lg"
                      icon={<IconSparkles size={18} />}
                      disabled={!scene().plotSummary}
                    >
                      {t('editor.generate')}
                    </Button>
                    <Show when={!scene().plotSummary}>
                      <p class="text-xs text-fg-muted mt-3">
                        {t('sceneDetail.plotPlaceholder')}
                      </p>
                    </Show>
                  </div>
                }
              >
                {/* ── Prose editor ─────────────────────────────── */}
                <div class="p-6 max-w-2xl mx-auto">
                  <Show
                    when={!isGenerating()}
                    fallback={
                      /* Streaming generation state */
                      <div class="animate-fade-in">
                        <div
                          class="prose prose-sm text-fg leading-relaxed font-body stream-cursor"
                          style={{ "white-space": "pre-wrap" }}
                        >
                          {scene().content || ''}
                        </div>
                        <div class="flex items-center gap-3 mt-6">
                          <div class="flex items-center gap-2 text-accent text-sm">
                            <span class="inline-block w-2 h-2 rounded-full bg-accent" style={{ animation: 'pulse-dot 1.2s ease-in-out infinite' }} />
                            {t('editor.generating')}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<IconStop size={14} />}
                            onClick={() => setIsGenerating(false)}
                          >
                            {t('editor.stop')}
                          </Button>
                        </div>
                      </div>
                    }
                  >
                    {/* Editable content */}
                    <div
                      contentEditable
                      class="outline-none text-fg leading-[1.85] text-[15px] min-h-[50vh]"
                      style={{ "white-space": "pre-wrap" }}
                      spellcheck={false}
                    >
                      {scene().content}
                    </div>
                  </Show>
                </div>

                {/* ── Floating toolbar (shown when text selected) ─ */}
                <Show when={!isGenerating()}>
                  <div class="fixed bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1.5 bg-surface border border-border-default rounded-xl shadow-xl shadow-canvas/50 z-30 animate-scale-in">
                    <button
                      type="button"
                      class="p-2 rounded-lg text-fg-secondary hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
                    >
                      <IconBold size={16} />
                    </button>
                    <button
                      type="button"
                      class="p-2 rounded-lg text-fg-secondary hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
                    >
                      <IconItalic size={16} />
                    </button>
                    <div class="w-px h-5 bg-border-default mx-1" />
                    <button
                      type="button"
                      class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-accent text-sm font-medium hover:bg-accent-muted transition-colors cursor-pointer"
                      onClick={() => setShowAiInput((v) => !v)}
                    >
                      <IconSparkles size={14} />
                      {t('editor.editWithAi')}
                    </button>
                  </div>
                </Show>

                {/* ── AI direction input ──────────────────────── */}
                <Show when={showAiInput()}>
                  <div class="fixed bottom-36 left-1/2 -translate-x-1/2 w-96 p-3 bg-surface border border-accent/30 rounded-xl shadow-2xl shadow-accent/10 z-30 animate-scale-in">
                    <label class="text-xs text-fg-secondary font-medium mb-2 block">
                      {t('editor.aiDirection')}
                    </label>
                    <div class="flex gap-2">
                      <input
                        type="text"
                        placeholder={t('editor.aiDirection')}
                        class="flex-1 h-9 px-3 rounded-lg text-sm bg-canvas border border-border-default text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors"
                      />
                      <Button variant="primary" size="sm">
                        {t('editor.apply')}
                      </Button>
                    </div>
                  </div>
                </Show>
              </Show>
            </div>

            {/* ── Footer ────────────────────────────────────────── */}
            <div class="flex items-center justify-between px-4 h-8 border-t border-border-subtle text-xs text-fg-muted flex-shrink-0">
              <span>
                {charCount().toLocaleString()} {t('editor.characters')}
              </span>
              <span>{t('common.saved')}</span>
            </div>
          </>
        )}
      </Show>
    </div>
  )
}
