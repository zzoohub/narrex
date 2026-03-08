import { createSignal, Show, For, onCleanup, onMount } from 'solid-js'
import { Link, useNavigate } from '@tanstack/solid-router'
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
import { streamStructure, type StructureRequest } from '@/features/structuring'
import type { SSEClarificationEvent, SSECompletedEvent, SSEErrorEvent, SSEProgressEvent } from '@/shared/api/sse'

type CreationState = 'input' | 'clarify' | 'processing' | 'error'

const processingSteps = [
  'creation.processing.characters',
  'creation.processing.timeline',
  'creation.processing.world',
] as const

/** Extract text content from a .zip file (Notion export: find .md files inside). */
async function extractZipText(file: File): Promise<string> {
  const { BlobReader, ZipReader, TextWriter } = await import('@zip.js/zip.js')
  const reader = new ZipReader(new BlobReader(file))
  const entries = await reader.getEntries()
  const mdFiles = entries.filter(
    (e) => !e.directory && (e.filename.endsWith('.md') || e.filename.endsWith('.txt')),
  )
  const parts: string[] = []
  for (const entry of mdFiles) {
    if (entry.getData) {
      const text = await entry.getData(new TextWriter())
      parts.push(text)
    }
  }
  await reader.close()
  return parts.join('\n\n---\n\n')
}

export function ProjectCreationView() {
  const { t } = useI18n()
  const navigate = useNavigate()

  // ── Responsive check ──
  const [isMobile, setIsMobile] = createSignal(false)
  onMount(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    onCleanup(() => window.removeEventListener('resize', check))
  })

  const [state, setState] = createSignal<CreationState>('input')
  const [text, setText] = createSignal('')
  const [file, setFile] = createSignal<File | null>(null)
  const [fileContent, setFileContent] = createSignal<string | null>(null)
  const [isDragging, setIsDragging] = createSignal(false)
  const [completedSteps, setCompletedSteps] = createSignal(0)
  const [clarificationQuestions, setClarificationQuestions] = createSignal<
    Array<{ question: string; field: string }>
  >([])
  const [clarificationAnswers, setClarificationAnswers] = createSignal<Record<string, string>>({})

  let abortStream: (() => void) | null = null

  onCleanup(() => {
    if (abortStream) abortStream()
  })

  const canSubmit = () => text().trim().length > 0 || file() !== null

  // ---- File handling ----

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
    if (dropped) {
      setFile(dropped)
      readFileContent(dropped)
    }
  }
  function handleFileInput(e: Event) {
    const input = e.target as HTMLInputElement
    if (input.files?.[0]) {
      setFile(input.files[0])
      readFileContent(input.files[0])
    }
  }

  async function readFileContent(f: File) {
    if (f.name.endsWith('.zip')) {
      try {
        const text = await extractZipText(f)
        setFileContent(text)
      } catch {
        setFileContent(null)
      }
    } else {
      const reader = new FileReader()
      reader.onload = () => {
        setFileContent(reader.result as string)
      }
      reader.onerror = () => {
        setFileContent(null)
      }
      reader.readAsText(f)
    }
  }

  function removeFile() {
    setFile(null)
    setFileContent(null)
  }

  // ---- Submit & SSE streaming ----

  async function handleSubmit() {
    setState('processing')
    setCompletedSteps(0)

    const sourceInput = fileContent() ?? text()
    const answers = Object.values(clarificationAnswers()).filter(Boolean)

    const req: StructureRequest = { sourceInput }
    if (answers.length > 0) req.clarificationAnswers = answers
    const { stream, abort } = streamStructure(req)
    abortStream = abort

    try {
      for await (const event of stream) {
        switch (event.event) {
          case 'progress': {
            const progressData = event.data as SSEProgressEvent
            // Map progress messages to step completion
            const msg = progressData.message?.toLowerCase() ?? ''
            if (msg.includes('character') || msg.includes('등장인물')) {
              setCompletedSteps((s) => Math.max(s, 1))
            } else if (msg.includes('timeline') || msg.includes('타임라인') || msg.includes('plot')) {
              setCompletedSteps((s) => Math.max(s, 2))
            } else if (msg.includes('world') || msg.includes('세계')) {
              setCompletedSteps((s) => Math.max(s, 3))
            }
            break
          }
          case 'clarification': {
            const clarData = event.data as SSEClarificationEvent
            setClarificationQuestions(clarData.questions)
            setState('clarify')
            return
          }
          case 'completed': {
            setCompletedSteps(processingSteps.length)
            const completedData = event.data as SSECompletedEvent
            const workspace = completedData.data as { project?: { id: string } } | undefined
            const projectId = workspace?.project?.id
            if (projectId) {
              // Small delay so user sees the completion state
              setTimeout(() => {
                navigate({ to: '/project/$id', params: { id: projectId } })
              }, 600)
            }
            return
          }
          case 'error': {
            const errorData = event.data as SSEErrorEvent
            console.error('SSE error:', errorData.message)
            setState('error')
            return
          }
        }
      }
    } catch (err) {
      console.error('Stream error:', err)
      setState('error')
    } finally {
      abortStream = null
    }
  }

  function handleClarifySubmit() {
    handleSubmit()
  }

  function updateClarificationAnswer(field: string, value: string) {
    setClarificationAnswers((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Show
      when={!isMobile()}
      fallback={
        <div class="h-screen flex items-center justify-center bg-canvas px-8">
          <p class="text-center text-fg-secondary text-sm leading-relaxed">
            Narrex는 데스크톱용으로 설계되었습니다. 더 넓은 화면의 기기를 사용하세요.
          </p>
        </div>
      }
    >
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
                      onClick={removeFile}
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
              <Show
                when={clarificationQuestions().length > 0}
                fallback={
                  <>
                    {(['creation.clarify.genre', 'creation.clarify.character', 'creation.clarify.conflict'] as const).map((key, idx) => (
                      <label class="flex flex-col gap-2">
                        <span class="text-sm text-fg-secondary">{t(key)}</span>
                        <input
                          type="text"
                          onInput={(e) =>
                            updateClarificationAnswer(
                              `default_${idx}`,
                              e.currentTarget.value,
                            )
                          }
                          class="h-10 px-4 rounded-xl text-sm bg-surface border border-border-default text-fg placeholder:text-fg-muted hover:border-accent/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors"
                        />
                      </label>
                    ))}
                  </>
                }
              >
                <For each={clarificationQuestions()}>
                  {(q) => (
                    <label class="flex flex-col gap-2">
                      <span class="text-sm text-fg-secondary">{q.question}</span>
                      <input
                        type="text"
                        onInput={(e) =>
                          updateClarificationAnswer(q.field, e.currentTarget.value)
                        }
                        class="h-10 px-4 rounded-xl text-sm bg-surface border border-border-default text-fg placeholder:text-fg-muted hover:border-accent/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors"
                      />
                    </label>
                  )}
                </For>
              </Show>

              <div class="flex justify-center pt-4">
                <Button
                  variant="primary"
                  size="lg"
                  icon={<IconSparkles size={18} />}
                  onClick={handleClarifySubmit}
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
    </Show>
  )
}
