import { createSignal, Show } from 'solid-js'
import { Link } from '@tanstack/solid-router'
import { useI18n } from '@/shared/lib/i18n'
import { useTheme } from '@/shared/stores/theme'
import {
  IconPanelLeft,
  IconPanelBottom,
  IconChevronLeft,
  IconMoon,
  IconSun,
} from '@/shared/ui'
import { ConfigBar } from '@/widgets/config-bar'
import { TimelinePanel } from '@/widgets/timeline-panel'
import { CharacterMap } from '@/widgets/character-map'
import { EditorPanel } from '@/widgets/editor-panel'
import { SceneDetail } from '@/widgets/scene-detail'
import type {
  StoryConfig,
  Track,
  Scene,
  Character,
  Relationship,
} from '@/shared/types'

/* ═════════════════════════════════════════════════════════════════════════
   Mock data — demonstrates all visual states
   ═════════════════════════════════════════════════════════════════════════ */

const mockConfig: StoryConfig = {
  genre: '회귀 판타지',
  theme: '복수, 재기, 성장',
  era: '중세 판타지 왕국',
  pov: 'first',
  moodTags: ['긴장감', '어두운', '희망적 기저'],
}

const mockCharacters: Character[] = [
  { id: 'c1', name: '서준', personality: '규율적이지만 전생의 죄책감에 시달림', appearance: '키 크고 마른 체형, 왼손에 검 훈련 중 생긴 흉터', secrets: '미래의 기억에서 숨겨진 보물의 위치를 알고 있음', motivation: '다가올 재앙으로부터 가족을 지키는 것', x: 120, y: 140 },
  { id: 'c2', name: '지연', personality: '똑똑하고 호기심이 강하지만 자기 의심이 많음', appearance: '중간 키, 항상 안경을 쓰고 있음', secrets: '서준의 변화를 눈치채고 있음', motivation: '진실을 찾고 소중한 사람을 지키는 것', x: 120, y: 300 },
  { id: 'c3', name: '민혁', personality: '야심차고 카리스마 있으나 도덕적으로 모호함', appearance: '단정한 옷차림, 차가운 눈빛', secrets: '왕실과의 비밀 거래', motivation: '권력과 지배', x: 240, y: 200 },
]

const mockRelationships: Relationship[] = [
  { id: 'r1', fromId: 'c1', toId: 'c2', label: '동맹', type: 'positive' },
  { id: 'r2', fromId: 'c1', toId: 'c3', label: '라이벌', type: 'negative' },
  { id: 'r3', fromId: 'c2', toId: 'c3', label: '형제', type: 'positive' },
]

const mockScenes: Scene[] = [
  { id: 'n1', trackId: 't1', title: '패배와 죽음', status: 'edited', characterIds: ['c1'], location: '전장', moodTags: ['절망'], plotSummary: '서준은 전쟁에서 패배하고 죽음을 맞이한다.', content: '차가운 바람이 피로 물든 들판을 훑었다. 서준은 부러진 검을 쥔 채 하늘을 올려다보았다. 이것이 끝인가. 그의 입술에서 흘러나온 마지막 한마디—"다시 한 번만..."', startPosition: 0, duration: 1 },
  { id: 'n2', trackId: 't1', title: '회귀 — 어린 시절로', status: 'edited', characterIds: ['c1'], location: '어린 시절 침실', moodTags: ['경이', '불신'], plotSummary: '서준이 12세의 몸으로 깨어난다. 어린 시절 침실. 불신, 그리고 서서히 현실을 깨달음.', content: '눈을 떴을 때, 천장에 익숙한 얼룩이 보였다. 어머니가 지우려 했던, 하지만 끝내 남아 있던 그 얼룩. 서준은 작은 두 손을 들어 올렸다. 흉터가 없었다.', startPosition: 1, duration: 1 },
  { id: 'n3', trackId: 't1', title: '결심', status: 'ai-draft', characterIds: ['c1', 'c2'], location: '마을 광장', moodTags: ['결의'], plotSummary: '서준은 이번 생에서는 모든 것을 바꾸겠다고 다짐한다.', content: '마을 광장에 서자 모든 것이 선명했다. 저 골목에서 3년 후 화재가 날 것이고, 저 우물은 내년에 마를 것이다. 서준은 주먹을 꽉 쥐었다. 이번에는 다를 것이다.', startPosition: 2, duration: 1.5 },
  { id: 'n4', trackId: 't1', title: '첫 번째 시험', status: 'empty', characterIds: ['c1', 'c3'], location: '검술 수련장', moodTags: ['긴장감'], plotSummary: '', content: '', startPosition: 3.5, duration: 1 },
  { id: 'n5', trackId: 't1', title: '숨겨진 진실', status: 'needs-revision', characterIds: ['c1', 'c2'], location: '도서관', moodTags: ['미스터리'], plotSummary: '지연이 서준의 이상한 행동을 추궁한다.', content: '지연은 서준의 눈을 똑바로 바라보았다. "넌 달라졌어. 그것도 하룻밤 사이에." 서준은 시선을 피했다.', startPosition: 4.5, duration: 1.5 },
  { id: 'n6', trackId: 't2', title: '민혁의 음모', status: 'ai-draft', characterIds: ['c3'], location: '왕궁 밀실', moodTags: ['긴장감', '어두운'], plotSummary: '민혁이 왕실과 비밀 거래를 한다.', content: '촛불이 흔들리는 밀실에서 민혁은 봉인된 서신을 꺼냈다. 왕실의 문장이 찍힌 그 편지를 읽는 그의 입가에 미소가 번졌다.', startPosition: 2, duration: 1.5 },
  { id: 'n7', trackId: 't2', title: '세력 규합', status: 'empty', characterIds: ['c3'], location: '은밀한 저택', moodTags: [], plotSummary: '', content: '', startPosition: 3.5, duration: 1 },
]

const mockTracks: Track[] = [
  { id: 't1', label: '메인 플롯', scenes: mockScenes.filter((n) => n.trackId === 't1') },
  { id: 't2', label: '민혁 (적대자)', scenes: mockScenes.filter((n) => n.trackId === 't2') },
]

/* ═════════════════════════════════════════════════════════════════════════ */

export function WorkspaceView() {
  const { t } = useI18n()
  const { theme, toggle } = useTheme()

  // Panel state
  const [leftOpen, setLeftOpen] = createSignal(true)
  const [rightOpen, setRightOpen] = createSignal(false)
  const [bottomOpen, setBottomOpen] = createSignal(true)

  // Sizes (px)
  const [leftWidth, setLeftWidth] = createSignal(280)
  const [rightWidth, setRightWidth] = createSignal(340)
  const [bottomHeight, setBottomHeight] = createSignal(240)

  // Selection
  const [selectedSceneId, setSelectedSceneId] = createSignal<string | null>(null)

  const selectedScene = () => mockScenes.find((n) => n.id === selectedSceneId())

  function handleSelectScene(id: string) {
    setSelectedSceneId(id)
    setRightOpen(true)
  }

  function handleCloseRight() {
    setRightOpen(false)
    setSelectedSceneId(null)
  }

  // Prev/next navigation
  const currentTrackScenes = () => {
    const scene = selectedScene()
    if (!scene) return []
    return mockScenes.filter((n) => n.trackId === scene.trackId).sort((a, b) => a.startPosition - b.startPosition)
  }
  const currentIndex = () => currentTrackScenes().findIndex((n) => n.id === selectedSceneId())
  const prevScene = () => currentTrackScenes()[currentIndex() - 1]
  const nextScene = () => currentTrackScenes()[currentIndex() + 1]

  // Resize handlers
  function createHorizontalResize(
    setter: (v: number) => void,
    getter: () => number,
    min: number,
    max: number,
    direction: 1 | -1,
  ) {
    return (e: PointerEvent) => {
      const startX = e.clientX
      const startSize = getter()
      const onMove = (ev: PointerEvent) => {
        const delta = (ev.clientX - startX) * direction
        setter(Math.min(max, Math.max(min, startSize + delta)))
      }
      const onUp = () => {
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }
  }

  function handleBottomResize(e: PointerEvent) {
    const startY = e.clientY
    const startSize = bottomHeight()
    const maxH = window.innerHeight * 0.5
    const onMove = (ev: PointerEvent) => {
      const delta = startY - ev.clientY
      setBottomHeight(Math.min(maxH, Math.max(160, startSize + delta)))
    }
    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }

  return (
    <div class="h-screen flex flex-col overflow-hidden bg-canvas">
      {/* ── Top bar ────────────────────────────────────────────── */}
      <header class="flex items-center justify-between px-4 h-11 border-b border-border-default bg-surface flex-shrink-0 z-30">
        <div class="flex items-center gap-3">
          <Link
            to="/"
            class="p-1.5 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors"
          >
            <IconChevronLeft size={16} />
          </Link>
          <span class="text-sm font-display font-semibold text-fg">
            Narrex
          </span>
          <span class="text-fg-muted text-xs">·</span>
          <span class="text-sm text-fg-secondary truncate max-w-xs">
            회귀한 검사의 두 번째 삶
          </span>
        </div>

        <div class="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setLeftOpen((v) => !v)}
            class={[
              'p-1.5 rounded-md transition-colors cursor-pointer',
              leftOpen()
                ? 'text-accent bg-accent-muted'
                : 'text-fg-muted hover:text-fg hover:bg-surface-raised',
            ].join(' ')}
            aria-label="Toggle character panel"
          >
            <IconPanelLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setBottomOpen((v) => !v)}
            class={[
              'p-1.5 rounded-md transition-colors cursor-pointer',
              bottomOpen()
                ? 'text-accent bg-accent-muted'
                : 'text-fg-muted hover:text-fg hover:bg-surface-raised',
            ].join(' ')}
            aria-label="Toggle timeline"
          >
            <IconPanelBottom size={16} />
          </button>
          <div class="w-px h-5 bg-border-default mx-1" />
          <button
            type="button"
            onClick={toggle}
            class="p-1.5 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
            aria-label="Toggle theme"
          >
            <Show when={theme() === 'dark'} fallback={<IconMoon size={16} />}>
              <IconSun size={16} />
            </Show>
          </button>
          <span class="text-xs text-fg-muted ml-2 hidden lg:inline">
            {t('common.saved')}
          </span>
        </div>
      </header>

      {/* ── Config bar ─────────────────────────────────────────── */}
      <ConfigBar config={mockConfig} />

      {/* ── Workspace panels ───────────────────────────────────── */}
      <div class="flex-1 flex overflow-hidden min-h-0">
        {/* Left panel — Character map */}
        <Show when={leftOpen()}>
          <div
            class="flex-shrink-0 overflow-hidden border-r border-border-default"
            style={{ width: `${leftWidth()}px` }}
          >
            <CharacterMap
              characters={mockCharacters}
              relationships={mockRelationships}
            />
          </div>
          <div
            class="resize-h"
            onPointerDown={createHorizontalResize(setLeftWidth, leftWidth, 240, 400, 1)}
          />
        </Show>

        {/* Center — Editor */}
        <div class="flex-1 min-w-0 flex flex-col">
          <div class="flex-1 overflow-hidden">
            <EditorPanel
              selectedScene={selectedScene() ?? null}
              prevSceneTitle={prevScene()?.title}
              nextSceneTitle={nextScene()?.title}
              onSelectPrev={() => prevScene() && handleSelectScene(prevScene()!.id)}
              onSelectNext={() => nextScene() && handleSelectScene(nextScene()!.id)}
            />
          </div>

          {/* Bottom panel — Timeline */}
          <Show when={bottomOpen()}>
            <div
              class="resize-v"
              onPointerDown={handleBottomResize}
            />
            <div
              class="flex-shrink-0 overflow-hidden"
              style={{ height: `${bottomHeight()}px` }}
            >
              <TimelinePanel
                tracks={mockTracks}
                selectedSceneId={selectedSceneId()}
                onSelectScene={handleSelectScene}
              />
            </div>
          </Show>
        </div>

        {/* Right panel — Scene detail */}
        <Show when={rightOpen() && selectedScene()}>
          <div
            class="resize-h"
            onPointerDown={createHorizontalResize(setRightWidth, rightWidth, 300, 500, -1)}
          />
          <div
            class="flex-shrink-0 overflow-hidden border-l border-border-default"
            style={{ width: `${rightWidth()}px` }}
          >
            <SceneDetail
              scene={selectedScene()!}
              characters={mockCharacters}
              onClose={handleCloseRight}
            />
          </div>
        </Show>
      </div>
    </div>
  )
}
