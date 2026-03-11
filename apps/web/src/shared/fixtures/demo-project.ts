import type { Project, ProjectSummary } from '@/entities/project/model'
import type { Track } from '@/entities/track'
import type { Scene } from '@/entities/scene'
import type { Character, CharacterRelationship } from '@/entities/character'
import type { SceneConnection } from '@/entities/connection'
import type { Workspace } from '@/entities/project/api'
import type { Locale } from '@/shared/types'

// ---- Constants ----------------------------------------------------------------

export const DEMO_PROJECT_ID = 'demo-project'

const TRACK_PRESENT = 'demo-track-present'
const TRACK_PAST = 'demo-track-past'

const CHAR_HAYOON = 'demo-char-hayoon'
const CHAR_DOYOON = 'demo-char-doyoon'
const CHAR_YOUNGSUK = 'demo-char-youngsuk'
const CHAR_CHAERIN = 'demo-char-chaerin'
const CHAR_JUNSEO = 'demo-char-junseo'

const SCENE_IDS = [
  'demo-scene-1', 'demo-scene-2', 'demo-scene-3',
  'demo-scene-4', 'demo-scene-5', 'demo-scene-6',
  'demo-scene-7', 'demo-scene-8', 'demo-scene-9',
] as const

const REL_IDS = [
  'demo-rel-1', 'demo-rel-2', 'demo-rel-3',
  'demo-rel-4', 'demo-rel-5', 'demo-rel-6',
] as const

const CONN_IDS = ['demo-conn-1', 'demo-conn-2'] as const

const NOW = '2026-01-01T00:00:00.000Z'

// ---- Content ----------------------------------------------------------------

const SCENE1_CONTENT_KO = `시외버스에서 내리자 바다 냄새가 먼저 왔다. 소금기와 비릿함이 섞인, 해운리만의 냄새.

7년이면 많은 게 변한다. 정류장 옆의 슈퍼는 편의점이 되었고, 중학교 앞 문방구는 사라졌다. 하지만 골목 끝에서 바다가 보이는 건 그대로였고, 파도서점의 낡은 간판도 그대로였다.

열쇠가 잘 돌아가지 않았다. 세 번째 시도에서 뻑뻑하게 열렸다.

먼지 냄새, 오래된 종이 냄새, 그리고 — 할머니 냄새. 설명할 수 없지만 분명한, 라벤더와 누룽지 사이 어딘가의 냄새.

카운터 위에 봉투가 놓여 있었다. 할머니의 동글동글한 글씨.

'하윤아, 서점은 네 거란다. 서두르지 마. 천천히 둘러보렴.'

하윤은 봉투를 내려놓고 서점을 둘러보았다. 7년 만에 돌아온 해운리는 달라진 것도 있었고, 달라지지 않은 것도 있었다. 달라지지 않은 것들이 더 아팠다.`

const SCENE2_CONTENT_KO = `노크 소리에 고개를 들었다.

서점 유리문 너머에 남자가 서 있었다. 역광이라 얼굴이 잘 안 보였다. 키가 크고 어깨가 넓었다. 소매를 걷어 올린 작업복 차림.

문을 열었다. 빛이 걷히면서 얼굴이 보였다.

'...도윤?'

강도윤이 서 있었다. 7년 전보다 얼굴이 각졌고, 어깨가 넓어졌고, 손이 거칠어졌다. 하지만 눈은 그대로였다.

'오랜만이다.' 그가 말했다. 목소리가 낮아졌다.

'리모델링 의뢰받았어. 영숙 할머니 생전에.' 잠깐 멈칫했다. '너 온다는 건 몰랐어.'

7년간 떠올리지 않으려 했던 사람이 2주간 매일 온다. 괜찮을 리가 없었다.`

const SCENE1_CONTENT_EN = `The sea hit me first — that salt-and-brine smell that belongs only to Haeunri.

Seven years changes a lot. The corner store became a convenience mart, the stationery shop across from the middle school vanished. But the ocean was still visible at the end of every alley, and the faded sign of Wave Bookshop still hung where it always had.

The key barely turned. Third try.

Dust, old paper, and — Grandma's scent. Impossible to name but unmistakable: somewhere between lavender and scorched rice.

An envelope sat on the counter. Grandma's round handwriting.

"Hayoon-ah, the bookshop is yours. Take your time. Look around slowly."

Hayoon set the envelope down and looked around. Some things in Haeunri had changed. Some hadn't. The unchanged things hurt more.`

const SCENE2_CONTENT_EN = `A knock at the door.

Through the glass, a man stood silhouetted — tall, broad-shouldered, sleeves rolled to the elbow.

She opened the door. The light shifted and she saw his face.

"...Doyoon?"

Kang Doyoon. Sharper jaw, broader shoulders, rougher hands than seven years ago. But the same eyes — deep, quiet, holding something back.

"It's been a while." His voice was lower.

"I got the renovation request. From Grandma Youngsuk, before she passed." A brief pause. "I didn't know you'd be here."

The person she'd spent seven years trying not to think about would be here every day for two weeks. There was no way she'd be fine.`

// ---- Locale data ----------------------------------------------------------------

interface LocaleData {
  title: string
  genre: string
  theme: string
  eraLocation: string
  tone: string
  trackLabels: [string, string]
  characters: Array<{
    name: string
    personality: string
    appearance: string
    secrets: string
    motivation: string
  }>
  scenes: Array<{
    title: string
    plotSummary: string | null
    location: string | null
    moodTags: string[]
  }>
  relationships: Array<{ label: string }>
  scene1Content: string
  scene2Content: string
}

const KO: LocaleData = {
  title: '다시, 그 계절',
  genre: '현대 로맨스',
  theme: '말하지 못한 마음은 사라지는 게 아니라 기다리고 있었다는 것.',
  eraLocation: '해운리 — 남해안의 작은 해안 마을, 현대.',
  tone: '따뜻하고 잔잔한 문체. 감정을 직접 설명하기보다 행동과 풍경으로 보여준다.',
  trackLabels: ['현재 — 하윤의 귀향', '7년 전 — 그해 여름'],
  characters: [
    { name: '서하윤', personality: '서른 살. 번아웃으로 퇴사한 편집자. 외할머니가 남긴 파도서점을 정리하기 위해 7년 만에 해운리로 돌아온다.', appearance: '단발머리에 얇은 뿔테 안경. 린넨 셔츠에 넓은 바지.', secrets: '서울을 떠난 건 번아웃만이 아니다 — 기획을 빼앗기고 팀에서 밀려났다.', motivation: '서점을 정리하고 서울로 돌아갈 계획이었으나, 할머니의 편지와 잊으려 했던 사람이 발목을 잡는다.' },
    { name: '강도윤', personality: '서른한 살. 3년 전 해운리로 돌아온 건축가. 과묵하고 성실하며, 감정을 잘 드러내지 않는다.', appearance: '큰 키에 넓은 어깨. 소매를 걷어 올린 작업복 차림. 왼쪽 손목에 낡은 시계.', secrets: '하윤이 떠난 뒤 영숙 할머니가 혼자 서점을 지키는 게 마음에 걸려 돌아왔다.', motivation: '7년 전 전하지 못한 마음을 말하는 것.' },
    { name: '서영숙', personality: '하윤의 외할머니. 75세에 타계. 편지와 서점에 남긴 흔적으로만 등장한다.', appearance: '흰 머리를 낮게 묶고, 둥근 안경, 항상 앞치마.', secrets: '도윤이 졸업 전날 쓴 편지를 가지고 있었다.', motivation: '죽어서도 편지를 통해 손녀를 진실로 이끈다.' },
    { name: '이채린', personality: '스물아홉 살. 해운리 토박이. 하윤의 절친. 카페 만조를 운영한다. 밝고 직설적.', appearance: '파마 머리에 밝은 표정. 카페 앞치마에 마카롱 가루.', secrets: '하윤이 떠나고 혼자 남겨진 게 힘들었다.', motivation: '하윤과의 우정을 되찾는 것.' },
    { name: '박준서', personality: '서른두 살. 도윤의 죽마고우. 횟집을 운영한다. 순박하고 의리 있으며, 채린 앞에서만 말수가 줄어든다.', appearance: '떡벌어진 체격에 햇볕에 그을린 피부. 항상 고무장화.', secrets: '채린을 고등학교 때부터 좋아했지만 고백 못 함.', motivation: '채린에게 마음을 전하는 것.' },
  ],
  scenes: [
    { title: '파도서점', plotSummary: '하윤이 7년 만에 해운리에 도착한다. 외할머니가 남긴 파도서점은 먼지와 추억으로 가득하다.', location: '파도서점, 해운리 중심가', moodTags: ['향수', '쓸쓸함', '따뜻함'] },
    { title: '재회', plotSummary: '서점 리모델링 상담을 위해 건축가가 온다 — 강도윤. 7년 만의 재회.', location: '파도서점, 오전', moodTags: ['긴장', '설렘', '어색함'] },
    { title: '조수', plotSummary: '채린이 하윤을 찾아온다. 반가움과 서운함이 동시에 터진다.', location: '카페 만조, 해운리 항구 옆', moodTags: ['반가움', '서운함', '떠보기'] },
    { title: '밀물', plotSummary: '서점 리모델링이 시작된다. 벽 틈에서 영숙 할머니가 숨겨둔 상자를 발견한다.', location: '파도서점, 리모델링 중', moodTags: ['가까워짐', '발견', '설렘'] },
    { title: '고백 미수', plotSummary: '해운리 여름 축제. 도윤이 말을 꺼내려는 순간 하윤의 핸드폰이 울린다.', location: '해운리 방파제, 여름 축제', moodTags: ['축제', '아쉬움', '엇갈림'] },
    { title: '파도가 돌아오듯', plotSummary: '리모델링 완성 날. 할머니 상자에서 발견한 편지를 연다 — 안에 편지가 두 통이다.', location: '파도서점 — 리모델링 완성 날', moodTags: ['클라이맥스', '고백', '선택'] },
    { title: '그해 여름의 시작', plotSummary: '7년 전, 고3 여름. 하윤과 도윤이 파도서점에서 나란히 앉아 수능 공부를 하던 시절.', location: '파도서점, 7년 전 여름', moodTags: ['청춘', '설렘', '순수'] },
    { title: '비가 오던 밤', plotSummary: '여름 소나기에 파도서점에 갇힌 밤. 촛불 아래서 서로의 이야기를 한다.', location: '파도서점, 7년 전 여름 — 비 오는 밤', moodTags: ['고요', '긴장', '아련함'] },
    { title: '전하지 못한 편지', plotSummary: '졸업 전날 밤. 도윤이 편지를 쓴다. 아침, 하윤은 서울행 버스를 탄다.', location: '해운리 버스 정류장 + 파도서점', moodTags: ['이별', '미련', '약속'] },
  ],
  relationships: [
    { label: '첫사랑 / 재회' },
    { label: '외할머니 → 손녀' },
    { label: '절친 / 재회' },
    { label: '죽마고우' },
    { label: '짝사랑' },
    { label: '편지의 보관자' },
  ],
  scene1Content: SCENE1_CONTENT_KO,
  scene2Content: SCENE2_CONTENT_KO,
}

const EN: LocaleData = {
  title: 'Again, That Season',
  genre: 'Contemporary Romance',
  theme: 'Unspoken feelings don\'t vanish — they wait.',
  eraLocation: 'Haeunri — a small coastal village on the southern coast, present day.',
  tone: 'Warm and quiet prose. Shows emotion through action and landscape rather than telling.',
  trackLabels: ['Present — Hayoon\'s Return', '7 Years Ago — That Summer'],
  characters: [
    { name: 'Seo Hayoon', personality: 'Thirty. Burned-out editor who quit her Seoul publishing job. Returns to Haeunri for the first time in 7 years to settle her grandmother\'s bookshop.', appearance: 'Short bob with thin horn-rimmed glasses. Linen shirts and wide trousers.', secrets: 'Leaving Seoul wasn\'t just burnout — a trusted senior stole her proposal and she was pushed out.', motivation: 'Planned to settle the bookshop and return to Seoul, but grandma\'s letter and the person she tried to forget hold her back.' },
    { name: 'Kang Doyoon', personality: 'Thirty-one. Architect who returned to Haeunri three years ago. Quiet, diligent, rarely shows emotion.', appearance: 'Tall with broad shoulders. Rolled-up work sleeves. Old watch on his left wrist.', secrets: 'Returned to Haeunri because Grandma Youngsuk was keeping the bookshop alone after Hayoon left.', motivation: 'To finally say what he couldn\'t 7 years ago.' },
    { name: 'Seo Youngsuk', personality: 'Hayoon\'s grandmother. Passed at 75. Appears only through letters and traces left in the bookshop.', appearance: 'White hair tied low, round glasses, always in an apron.', secrets: 'Kept the letter Doyoon wrote the night before graduation.', motivation: 'Even in death, guides her granddaughter to the truth through letters.' },
    { name: 'Lee Chaerin', personality: 'Twenty-nine. Haeunri local. Hayoon\'s best friend. Runs Café Manjo. Bright and blunt.', appearance: 'Permed hair, bright face. Macaron flour on her café apron.', secrets: 'Being left alone after Hayoon departed was harder than she admits.', motivation: 'To rebuild the friendship with Hayoon.' },
    { name: 'Park Junseo', personality: 'Thirty-two. Doyoon\'s lifelong buddy. Runs the family sashimi restaurant. Gets tongue-tied only around Chaerin.', appearance: 'Stocky build, sun-tanned skin. Always in rubber boots.', secrets: 'Has liked Chaerin since high school but never confessed.', motivation: 'To tell Chaerin how he feels.' },
  ],
  scenes: [
    { title: 'Wave Bookshop', plotSummary: 'Hayoon arrives in Haeunri for the first time in 7 years. Grandma\'s bookshop is full of dust and memories.', location: 'Wave Bookshop, central Haeunri', moodTags: ['nostalgia', 'loneliness', 'warmth'] },
    { title: 'Reunion', plotSummary: 'An architect comes for the renovation consultation — Kang Doyoon. First meeting in 7 years.', location: 'Wave Bookshop, morning', moodTags: ['tension', 'flutter', 'awkwardness'] },
    { title: 'Rising Tide', plotSummary: 'Chaerin visits Hayoon. Joy and resentment surface at once.', location: 'Café Manjo, by the harbor', moodTags: ['reunion', 'hurt', 'probing'] },
    { title: 'High Water', plotSummary: 'Renovation begins. A hidden box from Grandma Youngsuk is found in the wall.', location: 'Wave Bookshop, under renovation', moodTags: ['closeness', 'discovery', 'flutter'] },
    { title: 'Almost Confessed', plotSummary: 'Summer festival. Doyoon tries to say something, but Hayoon\'s phone rings.', location: 'Haeunri breakwater, summer festival', moodTags: ['festival', 'regret', 'missed timing'] },
    { title: 'Like the Tide Returns', plotSummary: 'Renovation done. The hidden envelope holds two letters — one from Grandma, one from Doyoon.', location: 'Wave Bookshop — completion day', moodTags: ['climax', 'confession', 'choice'] },
    { title: 'That Summer Begins', plotSummary: 'Seven years ago. Senior year summer. Hayoon and Doyoon study side by side in the bookshop.', location: 'Wave Bookshop, 7 years ago', moodTags: ['youth', 'flutter', 'innocence'] },
    { title: 'The Rainy Night', plotSummary: 'Trapped in the bookshop by a summer downpour. By candlelight, they share their dreams.', location: 'Wave Bookshop, 7 years ago — rainy night', moodTags: ['stillness', 'tension', 'wistfulness'] },
    { title: 'The Unsent Letter', plotSummary: 'Night before graduation. Doyoon writes a letter. Morning — Hayoon catches the Seoul bus.', location: 'Haeunri bus stop + Wave Bookshop', moodTags: ['farewell', 'longing', 'promise'] },
  ],
  relationships: [
    { label: 'First love / Reunion' },
    { label: 'Grandmother → Granddaughter' },
    { label: 'Best friends / Reunion' },
    { label: 'Lifelong buddies' },
    { label: 'One-sided crush' },
    { label: 'Keeper of the letter' },
  ],
  scene1Content: SCENE1_CONTENT_EN,
  scene2Content: SCENE2_CONTENT_EN,
}

const LOCALE_DATA: Record<Locale, LocaleData> = { ko: KO, en: EN }

// ---- Scene-to-character mapping (same for both locales) -----------------------

const SCENE_CHARS: string[][] = [
  [CHAR_HAYOON],
  [CHAR_HAYOON, CHAR_DOYOON],
  [CHAR_HAYOON, CHAR_CHAERIN, CHAR_JUNSEO],
  [CHAR_HAYOON, CHAR_DOYOON, CHAR_JUNSEO],
  [CHAR_HAYOON, CHAR_DOYOON, CHAR_CHAERIN, CHAR_JUNSEO],
  [CHAR_HAYOON, CHAR_DOYOON, CHAR_YOUNGSUK],
  [CHAR_HAYOON, CHAR_DOYOON, CHAR_YOUNGSUK, CHAR_CHAERIN],
  [CHAR_HAYOON, CHAR_DOYOON],
  [CHAR_HAYOON, CHAR_DOYOON, CHAR_YOUNGSUK],
]

const SCENE_TRACKS = [
  TRACK_PRESENT, TRACK_PRESENT, TRACK_PRESENT,
  TRACK_PRESENT, TRACK_PRESENT, TRACK_PRESENT,
  TRACK_PAST, TRACK_PAST, TRACK_PAST,
]

const SCENE_POSITIONS = [0, 1, 2, 3, 4, 5, 1, 3, 4]
const SCENE_DURATIONS = [1, 1, 1, 1, 1, 1.5, 1, 1, 1]

// ---- Builders ----------------------------------------------------------------

export function buildDemoWorkspace(locale: Locale): Workspace {
  const d = LOCALE_DATA[locale]
  const charIds = [CHAR_HAYOON, CHAR_DOYOON, CHAR_YOUNGSUK, CHAR_CHAERIN, CHAR_JUNSEO]

  const project: Project = {
    id: DEMO_PROJECT_ID,
    title: d.title,
    genre: d.genre,
    theme: d.theme,
    eraLocation: d.eraLocation,
    pov: 'third_limited',
    tone: d.tone,
    sourceType: null,
    createdAt: NOW,
    updatedAt: NOW,
  }

  const tracks: Track[] = [
    { id: TRACK_PRESENT, projectId: DEMO_PROJECT_ID, position: 1, label: d.trackLabels[0], createdAt: NOW, updatedAt: NOW },
    { id: TRACK_PAST, projectId: DEMO_PROJECT_ID, position: 2, label: d.trackLabels[1], createdAt: NOW, updatedAt: NOW },
  ]

  const scenes: Scene[] = d.scenes.map((s, i) => ({
    id: SCENE_IDS[i]!,
    trackId: SCENE_TRACKS[i]!,
    projectId: DEMO_PROJECT_ID,
    startPosition: SCENE_POSITIONS[i]!,
    duration: SCENE_DURATIONS[i]!,
    status: i === 0 ? 'edited' as const : i === 1 ? 'ai_draft' as const : 'empty' as const,
    title: s.title,
    plotSummary: s.plotSummary,
    location: s.location,
    moodTags: s.moodTags,
    content: i === 0 ? d.scene1Content : i === 1 ? d.scene2Content : null,
    characterIds: SCENE_CHARS[i]!,
    createdAt: NOW,
    updatedAt: NOW,
  }))

  const characters: Character[] = d.characters.map((c, i) => ({
    id: charIds[i]!,
    projectId: DEMO_PROJECT_ID,
    name: c.name,
    personality: c.personality,
    appearance: c.appearance,
    secrets: c.secrets,
    motivation: c.motivation,
    profileImageUrl: null,
    graphX: [0, 200, -200, 200, -200][i]!,
    graphY: [0, -80, 0, 80, 160][i]!,
    createdAt: NOW,
    updatedAt: NOW,
  }))

  const relDefs: Array<{
    aId: string; bId: string
    visual: CharacterRelationship['visualType']
    dir: CharacterRelationship['direction']
  }> = [
    { aId: CHAR_HAYOON, bId: CHAR_DOYOON, visual: 'solid', dir: 'bidirectional' },
    { aId: CHAR_YOUNGSUK, bId: CHAR_HAYOON, visual: 'arrowed', dir: 'a_to_b' },
    { aId: CHAR_HAYOON, bId: CHAR_CHAERIN, visual: 'dashed', dir: 'bidirectional' },
    { aId: CHAR_DOYOON, bId: CHAR_JUNSEO, visual: 'solid', dir: 'bidirectional' },
    { aId: CHAR_JUNSEO, bId: CHAR_CHAERIN, visual: 'arrowed', dir: 'a_to_b' },
    { aId: CHAR_YOUNGSUK, bId: CHAR_DOYOON, visual: 'dashed', dir: 'bidirectional' },
  ]

  const relationships: CharacterRelationship[] = relDefs.map((r, i) => ({
    id: REL_IDS[i]!,
    projectId: DEMO_PROJECT_ID,
    characterAId: r.aId,
    characterBId: r.bId,
    label: d.relationships[i]!.label,
    visualType: r.visual,
    direction: r.dir,
    createdAt: NOW,
    updatedAt: NOW,
  }))

  const connections: SceneConnection[] = [
    { id: CONN_IDS[0]!, projectId: DEMO_PROJECT_ID, sourceSceneId: SCENE_IDS[4]!, targetSceneId: SCENE_IDS[7]!, connectionType: 'branch', createdAt: NOW },
    { id: CONN_IDS[1]!, projectId: DEMO_PROJECT_ID, sourceSceneId: SCENE_IDS[8]!, targetSceneId: SCENE_IDS[5]!, connectionType: 'merge', createdAt: NOW },
  ]

  return { project, tracks, scenes, characters, relationships, connections }
}

export function buildDemoProjectSummary(locale: Locale): ProjectSummary {
  const d = LOCALE_DATA[locale]
  const ws = buildDemoWorkspace(locale)
  return {
    id: DEMO_PROJECT_ID,
    title: d.title,
    genre: d.genre,
    sceneCount: ws.scenes.length,
    draftedSceneCount: ws.scenes.filter((s) => s.status !== 'empty').length,
    createdAt: NOW,
    updatedAt: NOW,
  }
}
