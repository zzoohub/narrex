import {
  createContext,
  createSignal,
  useContext,
} from 'solid-js'
import type { Accessor, ParentComponent } from 'solid-js'
import type { Locale } from '@/shared/types'

const translations: Record<Locale, Record<string, string>> = {
  ko: {
    // Navigation
    'nav.projects': '프로젝트',
    'nav.newProject': '새 프로젝트',
    'nav.account': '계정',
    // Dashboard
    'dashboard.title': '내 프로젝트',
    'dashboard.newProject': '새 프로젝트',
    'dashboard.empty.title': '아직 프로젝트가 없습니다',
    'dashboard.empty.description': '첫 이야기를 시작하세요',
    'dashboard.empty.cta': '첫 프로젝트 만들기',
    'dashboard.card.scenes': '{drafted}/{total} 장면 작성',
    'dashboard.card.lastEdited': '최종 수정',
    // Project creation
    'creation.title': '새 이야기 시작하기',
    'creation.description': '이야기 아이디어를 설명하세요. 메모, 줄거리, 등장인물 설명 등 무엇이든 붙여넣으세요.',
    'creation.placeholder': '회귀 판타지: 전쟁에서 패배한 기사가 어린 시절로 돌아가 운명을 바꾸려 한다...',
    'creation.importLabel': '또는 파일 가져오기:',
    'creation.dropzone': '여기에 파일을 놓으세요 (.md, .txt, Notion .zip)',
    'creation.browseFiles': '파일 찾기',
    'creation.submit': '내 이야기 구성하기',
    'creation.back': '프로젝트로 돌아가기',
    'creation.clarify.title': '이야기를 구성하기 위해 조금 더 알려주세요.',
    'creation.clarify.genre': '어떤 장르인가요? (예: 회귀 판타지, 로맨스, 무협)',
    'creation.clarify.character': '주인공은 누구인가요?',
    'creation.clarify.conflict': '핵심 갈등이나 사건은 무엇인가요?',
    'creation.processing.title': '이야기를 구성하는 중...',
    'creation.processing.characters': '등장인물과 관계를 찾는 중',
    'creation.processing.timeline': '줄거리를 타임라인으로 정리하는 중',
    'creation.processing.world': '작품 세계를 설정하는 중',
    'creation.error': '이 입력을 구성할 수 없습니다. 등장인물과 줄거리에 대한 내용을 추가해 보세요.',
    'creation.errorRetry': '다시 시도',
    // Config
    'config.title': '작품 설정',
    'config.genre': '장르',
    'config.theme': '테마',
    'config.era': '시대 / 배경',
    'config.pov': '시점',
    'config.mood': '분위기',
    'config.pov.first': '1인칭',
    'config.pov.thirdLimited': '3인칭 제한',
    'config.pov.thirdOmniscient': '3인칭 전지',
    // Timeline
    'timeline.title': '타임라인',
    'timeline.addTrack': '트랙 추가',
    'timeline.fit': '전체 보기',
    'timeline.hint': '이것은 출발점입니다 — 노드를 드래그하거나 추가, 삭제하여 구성을 조정하세요.',
    // Characters
    'characters.title': '등장인물',
    'characters.add': '등장인물 추가',
    'characters.empty': '아직 등장인물이 없습니다. 이야기를 구성하면 자동으로 생성됩니다.',
    'characters.name': '이름',
    'characters.personality': '성격',
    'characters.appearance': '외모',
    'characters.secrets': '비밀',
    'characters.motivation': '동기',
    'characters.deleteCharacter': '등장인물 삭제',
    // Scene detail
    'sceneDetail.title': '장면 상세',
    'sceneDetail.sceneTitle': '제목',
    'sceneDetail.characters': '등장인물',
    'sceneDetail.location': '배경',
    'sceneDetail.mood': '분위기 (작품 설정 재정의)',
    'sceneDetail.plotSummary': '줄거리 요약',
    'sceneDetail.plotPlaceholder': '이 장면에서 무슨 일이 일어나나요? 자세할수록 AI 초안의 품질이 높아집니다.',
    // Editor
    'editor.selectScene': '타임라인에서 장면을 선택해 집필을 시작하세요',
    'editor.readyTitle': '이 장면에 생명을 불어넣을 준비가 되었습니다.',
    'editor.readyDescription': '상세 패널에서 줄거리 요약을 작성한 후 초안을 생성하세요.',
    'editor.generate': '초안 생성',
    'editor.regenerate': '다시 생성',
    'editor.editWithAi': 'AI로 수정',
    'editor.aiDirection': '어떻게 바꿀까요?',
    'editor.apply': '적용',
    'editor.generating': '생성 중...',
    'editor.stop': '중단',
    'editor.characters': '자',
    // Status
    'status.empty': '미작성',
    'status.aiDraft': 'AI 초안',
    'status.edited': '수정 완료',
    'status.needsRevision': '재확인 필요',
    // Common
    'common.save': '저장',
    'common.saved': '모든 변경 사항 저장됨',
    'common.saving': '저장 중...',
    'common.cancel': '취소',
    'common.delete': '삭제',
    'common.add': '추가',
    'common.close': '닫기',
    'common.undo': '실행 취소',
  },
  en: {
    'nav.projects': 'Projects',
    'nav.newProject': 'New Project',
    'nav.account': 'Account',
    'dashboard.title': 'My Projects',
    'dashboard.newProject': 'New Project',
    'dashboard.empty.title': 'No projects yet',
    'dashboard.empty.description': 'Start your first story',
    'dashboard.empty.cta': 'Create Your First Project',
    'dashboard.card.scenes': '{drafted}/{total} scenes drafted',
    'dashboard.card.lastEdited': 'Last edited',
    'creation.title': 'Start a New Story',
    'creation.description': 'Describe your story idea. Paste your notes, outline, character descriptions \u2014 anything you have.',
    'creation.placeholder': 'A regression fantasy where a failed knight returns to his childhood to change fate...',
    'creation.importLabel': 'Or import a file:',
    'creation.dropzone': 'Drop a file here (.md, .txt, or Notion .zip export)',
    'creation.browseFiles': 'Browse Files',
    'creation.submit': 'Structure My Story',
    'creation.back': 'Back to Projects',
    'creation.clarify.title': 'I need a bit more detail to structure your story.',
    'creation.clarify.genre': 'What genre is this? (e.g., regression fantasy, romance, martial arts)',
    'creation.clarify.character': 'Who is the main character?',
    'creation.clarify.conflict': 'What is the central conflict or event?',
    'creation.processing.title': 'Structuring your story...',
    'creation.processing.characters': 'Finding characters and relationships',
    'creation.processing.timeline': 'Organizing plot points into a timeline',
    'creation.processing.world': 'Setting up your story world',
    'creation.error': "We couldn't structure this input. Try adding more detail about your characters and plot.",
    'creation.errorRetry': 'Try Again',
    'config.title': 'Story Settings',
    'config.genre': 'Genre',
    'config.theme': 'Theme',
    'config.era': 'Era / Location',
    'config.pov': 'Point of View',
    'config.mood': 'Mood / Tone',
    'config.pov.first': '1st Person',
    'config.pov.thirdLimited': '3rd Limited',
    'config.pov.thirdOmniscient': '3rd Omniscient',
    'timeline.title': 'Timeline',
    'timeline.addTrack': 'Add Track',
    'timeline.fit': 'Fit',
    'timeline.hint': 'This is a starting point \u2014 drag, add, or delete nodes to match your vision.',
    'characters.title': 'Characters',
    'characters.add': 'Add Character',
    'characters.empty': 'No characters yet. Characters are created automatically when you structure your story.',
    'characters.name': 'Name',
    'characters.personality': 'Personality',
    'characters.appearance': 'Appearance',
    'characters.secrets': 'Secrets',
    'characters.motivation': 'Motivation',
    'characters.deleteCharacter': 'Delete Character',
    'sceneDetail.title': 'Scene Detail',
    'sceneDetail.sceneTitle': 'Title',
    'sceneDetail.characters': 'Characters',
    'sceneDetail.location': 'Location',
    'sceneDetail.mood': 'Mood / Tone (overrides config)',
    'sceneDetail.plotSummary': 'Plot Summary',
    'sceneDetail.plotPlaceholder': 'What happens in this scene? The more detail you provide, the better the AI draft will be.',
    'editor.selectScene': 'Select a scene on the timeline to start writing',
    'editor.readyTitle': 'Ready to bring this scene to life.',
    'editor.readyDescription': 'Add a plot summary in the detail panel, then generate your first draft.',
    'editor.generate': 'Generate Draft',
    'editor.regenerate': 'Re-generate',
    'editor.editWithAi': 'Edit with AI',
    'editor.aiDirection': 'How should this change?',
    'editor.apply': 'Apply',
    'editor.generating': 'Generating...',
    'editor.stop': 'Stop',
    'editor.characters': 'chars',
    'status.empty': 'Empty',
    'status.aiDraft': 'AI Draft',
    'status.edited': 'Edited',
    'status.needsRevision': 'Needs Revision',
    'common.save': 'Save',
    'common.saved': 'All changes saved',
    'common.saving': 'Saving...',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.add': 'Add',
    'common.close': 'Close',
    'common.undo': 'Undo',
  },
  es: {},
  'pt-BR': {},
  id: {},
  ja: {},
}

type TranslationKey = keyof (typeof translations)['ko']

interface I18nContextValue {
  locale: Accessor<Locale>
  setLocale: (l: Locale) => void
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue>()

export const I18nProvider: ParentComponent<{ initial?: Locale }> = (props) => {
  const [locale, setLocale] = createSignal<Locale>(props.initial ?? 'ko')

  const t = (key: string, params?: Record<string, string | number>): string => {
    const dict = translations[locale()] ?? translations.en
    let text = dict[key] ?? translations.en[key] ?? key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replaceAll(`{${k}}`, String(v))
      }
    }
    return text
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {props.children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
