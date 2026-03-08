import { createSignal, Show, For, onCleanup, onMount, type Accessor } from 'solid-js'
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
import type { SSEClarificationEvent, SSECompletedEvent, SSEErrorEvent, SSEProgressEvent, SSETokenEvent } from '@/shared/api/sse'

type CreationState = 'input' | 'clarify' | 'processing' | 'error'

/** Sample story prompts — popular web novel genres for quick testing. */
const samplePrompts = [
  {
    label: {
      ko: '로판 — 악녀로 빙의했다',
      en: 'Romance Fantasy — reborn as the villainess',
    },
    text: {
      ko: '교통사고로 죽은 대학원생이 자신이 즐겨 읽던 로맨스 판타지 소설 속 악녀 "카밀라"로 빙의한다. 원작에서 카밀라는 여주인공을 괴롭히다 3년 뒤 처형당하는 운명. 살아남기 위해 원작 스토리를 피하려 하지만, 자신을 처형할 남자 주인공인 냉혈 공작이 원작과 다르게 카밀라에게 집착하기 시작한다. 원작 여주인공은 예정대로 나타났고, 공작의 관심이 자신에게 쏠린 걸 눈치채고 적의를 드러낸다.',
      en: 'A graduate student dies in an accident and wakes up as "Camilla," the villainess of a romance fantasy novel she used to read. In the original story, Camilla bullies the heroine and gets executed in three years. She tries to avoid the plot to survive — but the cold-hearted duke who was supposed to execute her starts obsessing over Camilla instead. The original heroine arrives on schedule and, noticing the duke\'s shifted attention, reveals her hostility.',
    },
  },
  {
    label: {
      ko: '회귀 헌터물 — 최약체의 두 번째 기회',
      en: 'Regression Hunter — weakest gets a second chance',
    },
    text: {
      ko: 'S급 던전 붕괴로 인류가 멸망하는 순간, 최하위 E급 헌터 강시혁이 10년 전으로 회귀한다. 전생에서 S급이 된 동료들의 성장 루트와 숨겨진 던전 위치를 모두 기억하고 있다. 하지만 회귀하면서 각성한 고유 능력은 "몬스터의 기억을 읽는 것" — 전투에는 쓸모없어 보이는 능력이지만, 던전 보스들이 숨기고 있는 세계의 비밀과 연결되어 있다는 걸 깨닫는다.',
      en: 'At the moment humanity falls to an S-rank dungeon collapse, the lowest-ranked E-class hunter Kang Sihyuk regresses 10 years. He remembers every colleague\'s growth path and hidden dungeon location. But his awakened ability is "reading monster memories" — seemingly useless in combat, until he realizes it\'s connected to a world-ending secret the dungeon bosses have been hiding.',
    },
  },
  {
    label: {
      ko: '사극 로맨스 — 폐비의 복수',
      en: 'Historical Romance — the deposed queen\'s revenge',
    },
    text: {
      ko: '왕의 총애를 받던 중전이 간비의 모함으로 폐위되어 냉궁에 갇힌다. 3년간의 냉궁 생활 끝에 탈출한 그녀는 신분을 숨기고 도성 최고의 기방 "월하루"의 주인이 된다. 기방을 거점으로 조정의 정보를 모으며 자신을 배신한 자들에게 하나씩 복수를 시작한다. 그런데 새로 부임한 한성부 판관이 폐비 시절 유일하게 그녀 편이었던 무관이다. 그는 그녀의 정체를 의심하기 시작한다.',
      en: 'A beloved queen is framed by a rival consort and imprisoned in the cold palace. After three years she escapes, hides her identity, and becomes the owner of the capital\'s most prestigious gisaeng house. Using it as a base to gather intelligence on the court, she begins her revenge — until the newly appointed magistrate turns out to be the one officer who once stood by her side. He starts to suspect her true identity.',
    },
  },
  {
    label: {
      ko: '현대 로맨스 — 계약 동거',
      en: 'Modern Romance — contract cohabitation',
    },
    text: {
      ko: '스타트업 대표 한서진은 투자 유치를 위해 "안정적인 사생활"이 필요하다. 수의사 윤재하는 동물병원 보증금 때문에 당장 싼 방이 필요하다. 부동산 실수로 같은 오피스텔에 동시 계약하게 된 두 사람은, 각자의 이유로 6개월간 "가짜 동거"를 하기로 합의한다. 규칙은 세 가지: 사생활 간섭 금지, 이성으로 보지 않기, 6개월 뒤 깨끗하게 끝내기. 그런데 서진의 전 남자친구이자 투자사 대표가 이 동거의 진짜 관계를 캐기 시작한다.',
      en: 'Startup CEO Han Seojin needs a "stable personal life" to secure investment. Veterinarian Yoon Jaeha needs a cheap room for his clinic deposit. A real estate mix-up puts them on the same lease, and they agree to a six-month fake cohabitation — three rules: no meddling, no romance, clean break at the end. Then Seojin\'s ex-boyfriend, now head of the VC firm, starts digging into whether the arrangement is real.',
    },
  },
  {
    label: {
      ko: '무협 회귀 — 마교 교주의 전생',
      en: 'Martial Arts Regression — the Demon Sect leader\'s past life',
    },
    text: {
      ko: '무림 최강이라 불리던 마교 교주가 정파 연합군에 포위되어 최후를 맞는다. 눈을 떠보니 20년 전, 마교에 들어오기 전 이름 없는 거지 소년 시절이다. 전생에서 그는 정파의 위선을 보고 마교에 합류했지만, 이번에는 다른 길을 가보려 한다. 문제는 전생의 무공 감각은 남아있는데, 이 몸의 내공이 전혀 없다는 것. 그리고 어린 시절 자신을 구해줬던 정체불명의 여인을 이번에는 꼭 찾아야 한다.',
      en: 'The feared Demon Sect leader dies surrounded by the Righteous Alliance. He wakes up 20 years earlier as a nameless beggar boy, before he ever joined the sect. In his past life he turned to the dark side after witnessing the hypocrisy of the righteous sects — this time he wants a different path. The catch: he has the instincts of a grandmaster but zero internal energy. And he must find the mysterious woman who saved him as a child.',
    },
  },
  {
    label: {
      ko: '아포칼립스 — 시스템이 내린 세계',
      en: 'Apocalypse — the system descends',
    },
    text: {
      ko: '어느 날 전 세계 하늘에 거대한 메시지가 떴다. "적응하거나 사라지시오." 동시에 모든 인류에게 "상태창"이 생기고, 도시마다 던전이 열린다. 평범한 고등학생 이도윤은 각성 등급 F를 받지만, 유일하게 "숨겨진 퀘스트"가 보이는 능력을 갖고 있다. 첫 숨겨진 퀘스트의 보상은 모든 플레이어가 탐내는 SSS급 스킬이지만, 클리어 조건은 "파티원 전원의 신뢰를 얻는 것"이다.',
      en: 'One day, a massive message appears in the sky worldwide: "Adapt or perish." Every human receives a status window, and dungeons open in every city. Ordinary high schooler Lee Doyoon is rated F-class, but he\'s the only one who can see "hidden quests." The first hidden quest rewards an SSS-rank skill everyone covets — but the clear condition is "earn the trust of every party member."',
    },
  },
  {
    label: {
      ko: '현대 판타지 — 카페 사장님은 마법사',
      en: 'Urban Fantasy — the cafe owner is a wizard',
    },
    text: {
      ko: '서울 연남동의 작은 카페 "안개숲"의 사장 문하진은 사실 300년을 산 마법사다. 마법이 사라진 현대에서 조용히 숨어 살려 했지만, 어느 날 알바생으로 들어온 대학생 나은서가 가게 안에서 무의식적으로 마법을 쓰기 시작한다. 은서 자신은 자각이 없고, 하진은 수백 년 만에 나타난 천재의 폭주를 막아야 한다. 문제는 은서의 마법이 각성할수록, 현대에 숨어 사는 다른 마법사들이 그녀를 노리기 시작한다는 것.',
      en: 'Moon Hajin, owner of a tiny cafe in Seoul\'s Yeonnam-dong, is secretly a 300-year-old wizard. He\'s been hiding quietly in a world where magic has vanished — until a college student part-timer starts unconsciously casting spells inside his shop. She has no idea she\'s doing it, and Hajin must contain the first magical prodigy in centuries before she draws the attention of other hidden wizards who want to use her.',
    },
  },
  {
    label: {
      ko: '미스터리 스릴러 — 사라진 웹소설 작가',
      en: 'Mystery Thriller — the vanished web novelist',
    },
    text: {
      ko: '연재 중단 3개월째인 인기 웹소설 작가가 실종된다. 담당 편집자가 원고를 찾기 위해 작가의 흔적을 추적하는데, 작가가 쓰던 소설의 줄거리와 실제 실종 과정이 기묘하게 일치하기 시작한다. 소설 속 등장인물들의 이름이 실존 인물과 겹치고, 마지막 미발표 원고에는 아직 일어나지 않은 사건이 적혀 있다.',
      en: 'A popular web novelist vanishes three months after going on hiatus. Their editor tracks the author\'s trail to find the missing manuscript, but the plot of the unfinished novel starts eerily mirroring the real disappearance. Character names match real people, and the last unpublished chapter describes events that haven\'t happened yet.',
    },
  },
] as const

const processingSteps = [
  'creation.processing.world',
  'creation.processing.characters',
  'creation.processing.timeline',
] as const

const processingStepKeys = [
  'creation.processing.step.world',
  'creation.processing.step.characters',
  'creation.processing.step.timeline',
] as const

const phaseHeadingKeys = [
  'creation.processing.phase.world',
  'creation.processing.phase.characters',
  'creation.processing.phase.timeline',
] as const

/** Asymptotic progress: fast start, slows approaching max. */
export function calcProgress(elapsedSecs: number, completed: boolean, max = 95, tau = 15): number {
  if (completed) return 100
  return max * (1 - Math.exp(-elapsedSecs / tau))
}

function formatElapsed(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

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
  const { t, locale } = useI18n()
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
  const [errorDetail, setErrorDetail] = createSignal('')
  const [clarificationQuestions, setClarificationQuestions] = createSignal<
    Array<{ question: string; field: string }>
  >([])
  const [clarificationAnswers, setClarificationAnswers] = createSignal<Record<string, string>>({})

  // ── Live preview signals ──
  const [activePhase, setActivePhase] = createSignal(-1)
  const [phaseTexts, setPhaseTexts] = createSignal<Record<number, string>>({})
  const [phaseTokenCount, setPhaseTokenCount] = createSignal(0)
  const [lastRawTokens, setLastRawTokens] = createSignal('')
  const [elapsedSecs, setElapsedSecs] = createSignal(0)
  const [completionData, setCompletionData] = createSignal<{
    projectId: string
    characterCount?: number
    sceneCount?: number
    trackCount?: number
  } | null>(null)

  let abortStream: (() => void) | null = null
  let elapsedTimer: ReturnType<typeof setInterval> | null = null
  let completionPauseTimer: ReturnType<typeof setTimeout> | null = null
  let autoNavTimer: ReturnType<typeof setTimeout> | null = null

  const progress = () => calcProgress(elapsedSecs(), !!completionData())

  onCleanup(() => {
    if (abortStream) abortStream()
    if (elapsedTimer) clearInterval(elapsedTimer)
    if (completionPauseTimer) clearTimeout(completionPauseTimer)
    if (autoNavTimer) clearTimeout(autoNavTimer)
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
    setActivePhase(-1)
    setPhaseTexts({})
    setPhaseTokenCount(0)
    setLastRawTokens('')
    setElapsedSecs(0)
    setCompletionData(null)

    // Start elapsed timer
    if (elapsedTimer) clearInterval(elapsedTimer)
    elapsedTimer = setInterval(() => setElapsedSecs((s) => s + 1), 1000)

    const sourceInput = fileContent() ?? text()
    const answers = Object.values(clarificationAnswers()).filter(Boolean)

    const req: StructureRequest = { sourceInput, locale: locale() }
    if (answers.length > 0) req.clarificationAnswers = answers
    const { stream, abort } = streamStructure(req)
    abortStream = abort

    try {
      for await (const event of stream) {
        switch (event.event) {
          case 'progress': {
            const progressData = event.data as SSEProgressEvent
            const msg = progressData.message?.toLowerCase() ?? ''
            if (msg.includes('world') || msg.includes('세계')) {
              if (activePhase() < 0) {
                setActivePhase(0)
                setPhaseTokenCount(0)
              }
            } else if (msg.includes('character') || msg.includes('등장인물')) {
              setActivePhase(1)
              setCompletedSteps((s) => Math.max(s, 1))
              setPhaseTokenCount(0)
            } else if (msg.includes('timeline') || msg.includes('타임라인') || msg.includes('plot')) {
              setActivePhase(2)
              setCompletedSteps((s) => Math.max(s, 2))
              setPhaseTokenCount(0)
            }
            break
          }
          case 'token': {
            const tokenData = event.data as SSETokenEvent
            const phase = activePhase()
            if (phase >= 0 && tokenData.text) {
              setPhaseTexts((prev) => ({
                ...prev,
                [phase]: (prev[phase] ?? '') + tokenData.text,
              }))
              setPhaseTokenCount((c) => c + 1)
              setLastRawTokens(tokenData.text.slice(-80))
            }
            break
          }
          case 'clarification': {
            const clarData = event.data as SSEClarificationEvent
            setClarificationQuestions(clarData.questions)
            if (elapsedTimer) clearInterval(elapsedTimer)
            setState('clarify')
            return
          }
          case 'completed': {
            setCompletedSteps(processingSteps.length)
            if (elapsedTimer) clearInterval(elapsedTimer)

            const completedData = event.data as SSECompletedEvent
            const workspace = completedData.data as {
              project?: { id: string }
              characterCount?: number
              sceneCount?: number
              trackCount?: number
            } | undefined
            const projectId = workspace?.project?.id ?? ''

            // Show completion card after brief pause
            completionPauseTimer = setTimeout(() => {
              completionPauseTimer = null
              setCompletionData({
                projectId,
                characterCount: workspace?.characterCount,
                sceneCount: workspace?.sceneCount,
                trackCount: workspace?.trackCount,
              })

              // Auto-navigate after 2s
              if (projectId) {
                autoNavTimer = setTimeout(() => {
                  navigate({ to: '/project/$id', params: { id: projectId } })
                }, 2000)
              }
            }, 800)
            return
          }
          case 'error': {
            const errorData = event.data as SSEErrorEvent
            const msg = typeof errorData?.message === 'string' ? errorData.message : JSON.stringify(event.data)
            console.error('SSE error:', msg)
            if (elapsedTimer) clearInterval(elapsedTimer)
            setErrorDetail(msg)
            setState('error')
            return
          }
        }
      }
    } catch (err) {
      // Don't show error for user-initiated cancellation
      if (err instanceof DOMException && err.name === 'AbortError') return
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
      console.error('Stream error:', msg, err)
      if (elapsedTimer) clearInterval(elapsedTimer)
      setErrorDetail(msg)
      setState('error')
    } finally {
      abortStream = null
    }
  }

  function handleCancel() {
    if (abortStream) {
      abortStream()
      abortStream = null
    }
    if (elapsedTimer) {
      clearInterval(elapsedTimer)
      elapsedTimer = null
    }
    if (completionPauseTimer) {
      clearTimeout(completionPauseTimer)
      completionPauseTimer = null
    }
    if (autoNavTimer) {
      clearTimeout(autoNavTimer)
      autoNavTimer = null
    }
    setActivePhase(-1)
    setPhaseTexts({})
    setPhaseTokenCount(0)
    setElapsedSecs(0)
    setCompletionData(null)
    setCompletedSteps(0)
    setState('input')
  }

  function handleOpenWorkspace() {
    if (autoNavTimer) clearTimeout(autoNavTimer)
    const data = completionData()
    if (data?.projectId) {
      navigate({ to: '/project/$id', params: { id: data.projectId } })
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
      <main class={`mx-auto px-6 py-16 ${state() === 'processing' ? 'max-w-5xl' : 'max-w-2xl'}`}>
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

            {/* Sample prompts */}
            <div class="mb-8">
              <p class="text-xs text-fg-muted mb-3">{t('creation.tryExample')}</p>
              <div class="flex flex-wrap gap-2">
                <For each={samplePrompts}>
                  {(prompt) => (
                    <button
                      type="button"
                      onClick={() => setText(prompt.text[locale()])}
                      class="px-3 py-1.5 rounded-lg text-xs text-fg-secondary bg-surface border border-border-default hover:border-accent/40 hover:text-fg transition-colors cursor-pointer"
                    >
                      {prompt.label[locale()]}
                    </button>
                  )}
                </For>
              </div>
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
          <div class="flex gap-8 animate-fade-in">
            {/* ── Live preview area ── */}
            <div
              class="flex-1 min-w-0 overflow-y-auto pr-2"
              style={{ "max-height": "calc(100vh - 200px)" }}
            >
              <Show
                when={!completionData()}
                fallback={
                  <div class="flex flex-col items-center justify-center py-16 animate-fade-in">
                    <div class="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
                      <IconCheck size={28} class="text-accent" />
                    </div>
                    <h2 class="text-2xl font-display font-semibold text-fg mb-6">
                      {t('creation.completion.title')}
                    </h2>
                    <div class="space-y-2 text-sm text-fg-secondary text-center mb-8">
                      <Show when={completionData()?.characterCount}>
                        <p>{t('creation.completion.characters', { n: completionData()!.characterCount! })}</p>
                      </Show>
                      <Show when={completionData()?.sceneCount}>
                        <p>{t('creation.completion.scenes', { n: completionData()!.sceneCount!, t: completionData()!.trackCount ?? 1 })}</p>
                      </Show>
                    </div>
                    <Button variant="primary" size="lg" onClick={handleOpenWorkspace}>
                      {t('creation.completion.cta')}
                    </Button>
                  </div>
                }
              >
                {/* Phase sections with streaming text */}
                <For each={[0, 1, 2]}>
                  {(phaseIdx) => (
                    <Show when={activePhase() >= phaseIdx || completedSteps() > phaseIdx}>
                      <div class={phaseIdx > 0 ? 'mt-8' : ''}>
                        <h3 class="text-sm font-semibold text-accent tracking-wider mb-3">
                          {t(phaseHeadingKeys[phaseIdx])}
                        </h3>
                        <div class="text-sm text-fg leading-relaxed whitespace-pre-wrap">
                          {(() => {
                            const text = phaseTexts()[phaseIdx] ?? ''
                            const fence = text.indexOf('```')
                            return fence >= 0 ? text.slice(0, fence).trimEnd() : text
                          })()}
                          <Show when={activePhase() === phaseIdx && !completionData()}>
                            <span
                              class="inline-block w-0.5 h-4 bg-accent align-text-bottom ml-px"
                              style={{ animation: 'stream-cursor 0.8s ease-in-out infinite' }}
                            />
                          </Show>
                        </div>
                      </div>
                    </Show>
                  )}
                </For>

                {/* Activity fallback line */}
                <Show when={lastRawTokens()}>
                  <div class="text-xs text-fg-muted/50 font-mono truncate mt-6 border-t border-border-default/30 pt-2">
                    {lastRawTokens()}
                  </div>
                </Show>
              </Show>
            </div>

            {/* ── Progress sidebar ── */}
            <div class="w-[200px] flex-shrink-0 pl-6 border-l border-border-default/50 flex flex-col">
              {/* Progress bar */}
              <div
                role="progressbar"
                aria-valuenow={Math.round(progress())}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Story structuring progress"
                class="h-2 rounded-full bg-surface-raised overflow-hidden"
              >
                <div
                  class="h-full bg-accent rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress()}%` }}
                />
              </div>

              {/* Percentage */}
              <div class="text-2xl font-display font-semibold text-fg tabular-nums mt-3 mb-6">
                {Math.round(progress())}%
              </div>

              {/* Step indicators */}
              <div class="space-y-1">
                <For each={processingStepKeys}>
                  {(step, i) => {
                    const done = () => completedSteps() > i()
                    const active = () => activePhase() === i() && completedSteps() <= i()
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

              {/* Elapsed time */}
              <div class="text-xs text-fg-muted tabular-nums mt-6">
                {formatElapsed(elapsedSecs())}
              </div>

              {/* Cancel button */}
              <button
                type="button"
                onClick={handleCancel}
                class="mt-auto pt-6 text-sm text-fg-muted hover:text-fg transition-colors cursor-pointer text-left"
              >
                {t('creation.processing.cancel')}
              </button>
            </div>
          </div>
        </Show>

        {/* ── Error state ─────────────────────────────────────────── */}
        <Show when={state() === 'error'}>
          <div class="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
            <div class="w-16 h-16 rounded-2xl bg-error-muted flex items-center justify-center mb-6">
              <IconX size={28} class="text-error" />
            </div>
            <p class="text-sm text-fg-muted max-w-sm leading-relaxed mb-4">
              {t('creation.error')}
            </p>
            <Show when={errorDetail()}>
              <pre class="text-xs text-error bg-surface-raised px-4 py-2 rounded-lg max-w-sm overflow-x-auto mb-6 whitespace-pre-wrap">
                {errorDetail()}
              </pre>
            </Show>
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
