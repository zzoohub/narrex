import { createSignal, Show, For } from 'solid-js'
import { Link } from '@tanstack/solid-router'
import { useI18n } from '@/shared/lib/i18n'
import {
  Button,
  IconArrowLeft,
  IconUpload,
  IconFile,
  IconX,
  IconCheck,
  IconSparkles,
} from '@/shared/ui'

type CreationState = 'input' | 'clarify' | 'processing' | 'error'

const processingSteps = [
  'creation.processing.characters',
  'creation.processing.timeline',
  'creation.processing.world',
] as const

export function ProjectCreationView() {
  const { t } = useI18n()
  const [state, setState] = createSignal<CreationState>('input')
  const [text, setText] = createSignal('')
  const [file, setFile] = createSignal<File | null>(null)
  const [isDragging, setIsDragging] = createSignal(false)
  const [completedSteps, setCompletedSteps] = createSignal(0)

  const canSubmit = () => text().trim().length > 0 || file() !== null

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }
  function handleDragLeave() {
    setIsDragging(false)
  }
  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer?.files[0]
    if (dropped) setFile(dropped)
  }
  function handleFileInput(e: Event) {
    const input = e.target as HTMLInputElement
    if (input.files?.[0]) setFile(input.files[0])
  }

  function handleSubmit() {
    setState('processing')
    // Simulate staged processing
    let step = 0
    const interval = setInterval(() => {
      step++
      setCompletedSteps(step)
      if (step >= processingSteps.length) {
        clearInterval(interval)
        // Would navigate to workspace
      }
    }, 2000)
  }

  return (
    <div class="min-h-screen bg-canvas">
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <header class="flex items-center px-6 h-14 border-b border-border-default bg-surface/80 backdrop-blur-sm">
        <Link to="/" class="flex items-center gap-2 text-fg-secondary hover:text-fg transition-colors">
          <IconArrowLeft size={18} />
          <span class="text-sm font-medium">{t('creation.back')}</span>
        </Link>
      </header>

      {/* ── Content ──────────────────────────────────────────────── */}
      <main class="max-w-2xl mx-auto px-6 py-16">
        {/* ── Input state ───────────────────────────────────────── */}
        <Show when={state() === 'input'}>
          <div class="animate-fade-in">
            <h1 class="text-3xl font-display font-semibold text-fg mb-3 text-center">
              {t('creation.title')}
            </h1>
            <p class="text-sm text-fg-muted text-center mb-10 max-w-md mx-auto leading-relaxed">
              {t('creation.description')}
            </p>

            {/* Text area */}
            <div class="mb-8">
              <textarea
                value={text()}
                onInput={(e) => setText(e.currentTarget.value)}
                placeholder={t('creation.placeholder')}
                rows={8}
                class="w-full px-5 py-4 rounded-xl text-sm bg-surface border border-border-default text-fg placeholder:text-fg-muted resize-none leading-relaxed hover:border-accent/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors"
              />
            </div>

            {/* File drop zone */}
            <div class="mb-8">
              <p class="text-xs text-fg-muted mb-3">{t('creation.importLabel')}</p>
              <Show
                when={!file()}
                fallback={
                  <div class="flex items-center gap-3 px-4 py-3 rounded-xl border border-border-default bg-surface">
                    <IconFile size={18} class="text-accent flex-shrink-0" />
                    <span class="text-sm text-fg flex-1 truncate">
                      {file()?.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      class="p-1 rounded-md text-fg-muted hover:text-fg transition-colors cursor-pointer"
                    >
                      <IconX size={16} />
                    </button>
                  </div>
                }
              >
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  class={[
                    'flex flex-col items-center gap-3 px-6 py-8 rounded-xl border-2 border-dashed transition-colors cursor-pointer',
                    isDragging()
                      ? 'border-accent bg-accent-muted'
                      : 'border-border-default hover:border-accent/40',
                  ].join(' ')}
                >
                  <IconUpload
                    size={24}
                    class={isDragging() ? 'text-accent' : 'text-fg-muted'}
                  />
                  <p class="text-sm text-fg-muted">{t('creation.dropzone')}</p>
                  <label class="cursor-pointer">
                    <span class="text-sm text-accent font-medium hover:underline">
                      {t('creation.browseFiles')}
                    </span>
                    <input
                      type="file"
                      accept=".md,.txt,.zip"
                      onChange={handleFileInput}
                      class="hidden"
                    />
                  </label>
                </div>
              </Show>
            </div>

            {/* Submit */}
            <div class="flex justify-center">
              <Button
                variant="primary"
                size="lg"
                disabled={!canSubmit()}
                icon={<IconSparkles size={18} />}
                onClick={handleSubmit}
              >
                {t('creation.submit')}
              </Button>
            </div>
          </div>
        </Show>

        {/* ── Clarifying questions state ─────────────────────────── */}
        <Show when={state() === 'clarify'}>
          <div class="animate-fade-in">
            <h2 class="text-xl font-display font-semibold text-fg mb-6 text-center">
              {t('creation.clarify.title')}
            </h2>

            <div class="space-y-5 max-w-lg mx-auto">
              {[
                'creation.clarify.genre',
                'creation.clarify.character',
                'creation.clarify.conflict',
              ].map((key) => (
                <label class="flex flex-col gap-2">
                  <span class="text-sm text-fg-secondary">{t(key)}</span>
                  <input
                    type="text"
                    class="h-10 px-4 rounded-xl text-sm bg-surface border border-border-default text-fg placeholder:text-fg-muted hover:border-accent/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors"
                  />
                </label>
              ))}

              <div class="flex justify-center pt-4">
                <Button
                  variant="primary"
                  size="lg"
                  icon={<IconSparkles size={18} />}
                  onClick={handleSubmit}
                >
                  {t('creation.submit')}
                </Button>
              </div>
            </div>
          </div>
        </Show>

        {/* ── Processing state ───────────────────────────────────── */}
        <Show when={state() === 'processing'}>
          <div class="flex flex-col items-center justify-center py-24 animate-fade-in">
            {/* Animated orb */}
            <div class="relative w-24 h-24 mb-10">
              <div class="absolute inset-0 rounded-full bg-accent/20 animate-ping" style={{ "animation-duration": "2s" }} />
              <div class="absolute inset-2 rounded-full bg-accent/10" />
              <div class="absolute inset-4 rounded-full bg-accent/20 flex items-center justify-center">
                <IconSparkles size={28} class="text-accent" />
              </div>
            </div>

            <h2 class="text-xl font-display font-semibold text-fg mb-8">
              {t('creation.processing.title')}
            </h2>

            {/* Steps */}
            <div class="space-y-4 w-full max-w-xs">
              <For each={processingSteps}>
                {(step, i) => {
                  const done = () => completedSteps() > i()
                  const active = () => completedSteps() === i()
                  return (
                    <div class="flex items-center gap-3">
                      <div
                        class={[
                          'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300',
                          done()
                            ? 'bg-success text-white'
                            : active()
                              ? 'bg-accent text-accent-fg'
                              : 'bg-surface-raised text-fg-muted',
                        ].join(' ')}
                      >
                        <Show when={done()} fallback={
                          <Show when={active()} fallback={<span class="text-xs">{i() + 1}</span>}>
                            <span
                              class="block w-2 h-2 rounded-full bg-current"
                              style={{ animation: 'pulse-dot 1.2s ease-in-out infinite' }}
                            />
                          </Show>
                        }>
                          <IconCheck size={14} />
                        </Show>
                      </div>
                      <span
                        class={[
                          'text-sm transition-colors',
                          done()
                            ? 'text-fg'
                            : active()
                              ? 'text-fg font-medium'
                              : 'text-fg-muted',
                        ].join(' ')}
                      >
                        {t(step)}
                      </span>
                    </div>
                  )
                }}
              </For>
            </div>
          </div>
        </Show>

        {/* ── Error state ─────────────────────────────────────────── */}
        <Show when={state() === 'error'}>
          <div class="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
            <div class="w-16 h-16 rounded-2xl bg-error-muted flex items-center justify-center mb-6">
              <IconX size={28} class="text-error" />
            </div>
            <p class="text-sm text-fg-muted max-w-sm leading-relaxed mb-6">
              {t('creation.error')}
            </p>
            <Button
              variant="secondary"
              onClick={() => setState('input')}
            >
              {t('creation.errorRetry')}
            </Button>
          </div>
        </Show>
      </main>
    </div>
  )
}
