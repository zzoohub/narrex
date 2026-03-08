# UX Diagnosis: 좌측 패널 상단바 (Character Map Header)

**Status:** Draft
**Date:** 2026-03-09
**Mode:** Diagnosis (Mode B)
**Scope:** 좌측 패널 헤더의 역할 정의, 정보 구조, 인터랙션 패턴

---

## 1. 컨텍스트

### 사용자 목표 (JTBD)
"스토리 아이디어를 구조화된 다회차 소설 초안으로 만들고 싶다."

워크스페이스에서의 하위 목표: "필요한 참조 정보(캐릭터, 관계)를 빠르게 확인/수정하면서, 에디터에 집중해 글을 쓰고 싶다."

### 분석 대상
- `apps/web/src/widgets/character-map/index.tsx` -- GraphView 헤더, CharacterCard 헤더
- `apps/web/src/views/workspace/index.tsx` -- WorkspaceLayout의 좌측 패널 영역
- 비교 대상: `apps/web/src/widgets/timeline-panel/index.tsx` -- 타임라인 패널 헤더

---

## 2. 질문 1: 좌측 패널이 "캐릭터 맵" 전용이어야 하는가?

### 현재 상태

좌측 패널(280px)은 `CharacterMap` 위젯 하나만 렌더링한다. 패널 자체가 위젯이고, 위젯이 패널이다.

### 분석

**현재 구조가 Phase 1에서는 타당하다.** 근거:

1. **IA 문서(`ux-design.md`) 확인**: Phase 1의 좌측 패널 역할은 "Character Map"으로 정의되어 있다. Phase 3+에서 "World Map Panel"이 좌측 사이드바에 추가될 예정이다.

2. **IA 원칙 -- Principle of Growth (성장 원칙)**: 현재 좌측 패널 안에 캐릭터 맵 하나만 있는데, 이를 위해 탭 시스템이나 드로어 전환 UI를 지금 넣으면 과잉 설계다. 하나의 기능에 탭 하나짜리 탭바를 만드는 것은 인지 부하만 증가시킨다 (Cognitive Load -- 불필요한 복잡성은 제거해야 한다).

3. **그러나 Phase 2-3을 고려한 확장 포인트는 설계해야 한다**: Phase 2에서 "AI Chat Panel"이 우측에 추가되고, Phase 3+에서 "World Map"이 좌측에 추가된다. 이 시점에 좌측 패널은 "탭 전환 가능한 사이드바"로 진화해야 한다.

### 판정

| 판정 | 설명 |
|------|------|
| Phase 1: 현행 유지 | 좌측 = 캐릭터 맵 전용. 탭 UI 불필요. |
| Phase 3+ 진화 계획 | 좌측 패널 상단에 탭 헤더 추가 (Characters / World Map). VS Code Activity Bar가 아닌 간단한 segmented control 패턴 (탭 2개). Jakob's Law -- Figma의 Layers/Assets/Pages 전환과 동일 패턴. |
| 지금 할 것 | 헤더에 "CHARACTERS" 라벨을 유지하되, 패널 타이틀이 아닌 "현재 보고 있는 뷰의 라벨"로 의미적 역할을 명확히 한다. 향후 탭 전환 시 이 자리가 탭 영역이 된다. |

---

## 3. 질문 2: 현재 상단바의 문제 진단

### 현재 GraphView 헤더 구조

```
+--- h-10, px-4 -------------------------------------------+
| "CHARACTERS"                  [+ 등장인물 추가]  [<]      |
+-----------------------------------------------------------+
```

### 현재 CharacterCard 헤더 구조

```
+--- h-10, px-4 -------------------------------------------+
| [<-] "CHARACTERS"                                 [<]    |
+-----------------------------------------------------------+
```

### 진단 결과

#### Issue 1: 라벨이 두 뷰에서 동일한데 역할이 다르다 (Critical)

**원칙 위반**: Cognitive Load -- 동일한 시각 단서가 다른 맥락에서 같은 정보를 반복

- GraphView에서 "CHARACTERS"는 패널 타이틀이다.
- CharacterCard에서 "CHARACTERS"는 뒤로가기 네비게이션의 대상 표시 역할을 한다.
- 그런데 CharacterCard에서는 현재 보고 있는 캐릭터의 이름이 헤더에 전혀 없다. 사용자는 어떤 캐릭터를 편집 중인지 헤더만 보고는 알 수 없다.

**비교**: 타임라인 패널은 뷰가 하나뿐이라 이 문제가 없다. 하지만 좌측 패널은 그래프/카드 두 뷰를 전환하므로, 헤더가 현재 컨텍스트를 반영해야 한다.

**심각도**: Critical -- 사용자가 어떤 화면에 있는지 인지하기 어렵다.

---

#### Issue 2: CharacterCard 헤더에 캐릭터 이름이 없다 (Critical)

**원칙 위반**: IA -- Principle of Front Doors ("모든 화면은 identity를 가져야 한다: 여기가 어디인지")

CharacterCard 헤더:
```
[<-] CHARACTERS                                     [<]
```

사용자는 카드 본문까지 스크롤해야 이름을 확인한다. 헤더는 화면의 정체성(identity)을 즉시 전달해야 한다. 현재 "CHARACTERS"는 섹션 이름이지 개별 캐릭터 이름이 아니다.

**심각도**: Critical -- 현재 편집 대상을 식별할 수 없다.

---

#### Issue 3: "등장인물 추가" 버튼 라벨이 너비에 비해 길다 (Major)

**원칙 위반**: Cognitive Load -- 280px 패널에서 텍스트 + 아이콘 조합의 "등장인물 추가" 버튼은 헤더 공간의 40% 이상을 차지한다.

현재 한국어 라벨: "등장인물 추가" (7글자)
영어 라벨: "Add Character" (13자)

280px 패널 헤더에서:
- 좌측: "등장인물" (타이틀, ~64px)
- 우측: [+ 등장인물 추가] (~100px) + [<] (~28px)
- 남는 공간이 거의 없어 타이틀과 버튼이 빽빽하다.

**비교**: 타임라인 패널은 타이틀 없이 컨트롤만 배치하여 이 문제를 우회했다.

**심각도**: Major -- 좁은 패널에서 정보 밀도가 과도하다.

---

#### Issue 4: GraphView와 CharacterCard 헤더 높이는 동일하나 콘텐츠 밀도가 불균형 (Minor)

**원칙 위반**: Visual Spacing 일관성

- GraphView: 타이틀(좌) + 버튼 2개(우) -- 적절한 밀도
- CharacterCard: 뒤로가기 + 타이틀(좌) + 접기 버튼 1개(우) -- 좌측에 몰림, 우측이 허전

이는 시각적 균형(visual balance)의 문제로, 기능에는 영향 없지만 미세한 불편감을 준다.

**심각도**: Minor -- 시각적 불균형.

---

#### Issue 5: collapse 버튼의 아이콘 크기가 14px로 작다 (Minor)

**원칙 위반**: Fitts's Law -- 웹 클릭 타겟 최소 24x24px, 권장 32x32px

현재 collapse 버튼: `p-1` (4px padding) + 14px 아이콘 = 약 22x22px 시각 크기.
실제 클릭 영역은 `p-1`을 포함해 약 22px. 최소 권장치(24px)에 못 미친다.

뒤로가기 버튼(`IconArrowLeft size={16}`)은 상대적으로 16px라 약간 낫지만 여전히 작다.

**비교**: 타임라인 패널의 collapse 버튼도 동일 크기로, 이 문제는 시스템 전체에 걸쳐 있다.

**심각도**: Minor -- 기능적 문제는 아니지만 클릭 정확도가 낮아질 수 있다.

---

#### Issue 6: 접근성 -- CharacterCard의 뒤로가기 버튼에 aria-label이 없다 (Major)

**원칙 위반**: Accessibility -- "All interactive elements need accessible names"

```tsx
<button onClick={props.onBack}
  class="p-1 rounded-md text-fg-muted ...">
  <IconArrowLeft size={16} />    // 아이콘만, aria-label 없음
</button>
```

스크린 리더 사용자는 이 버튼의 용도를 알 수 없다. GraphView의 collapse 버튼에는 `aria-label="Collapse character panel"`이 있지만, CharacterCard의 뒤로가기 버튼에는 없다.

**심각도**: Major -- 접근성 위반 (WCAG 2.1 AA).

---

#### Issue 7: "등장인물 추가" 버튼이 두 곳에 있다 (Minor)

**원칙 위반**: 반복 제거 (First Principles -- "제거해도 목표 달성에 지장 없는 것은 제거하라")

GraphView에서 "등장인물 추가" 버튼이 두 곳에 있다:
1. 헤더의 [+ 등장인물 추가] 버튼
2. 빈 상태(empty state)의 [+ 등장인물 추가] 버튼

빈 상태에서 CTA가 있으므로 헤더 버튼 없이도 첫 캐릭터를 추가할 수 있다. 그러나 캐릭터가 이미 있을 때는 헤더 버튼이 유일한 추가 경로이므로, 헤더 버튼 자체는 필요하다. 문제는 중복이 아니라 빈 상태에서의 이중 CTA이나, 빈 상태에서 CTA는 UX Writing 원칙에 의해 필수이고, 헤더 버튼은 loaded 상태에서 필수이다. 따라서 이는 의도된 설계이며, 실제 문제가 아니다.

**판정 변경**: 이 이슈는 false positive. 삭제.

---

### 진단 요약 (우선순위순)

| 순위 | ID | 심각도 | 문제 | 위반 원칙 |
|------|-----|--------|------|-----------|
| 1 | I1 | Critical | CharacterCard 헤더에 캐릭터 이름 없음 | IA Front Doors, Cognitive Load |
| 2 | I2 | Critical | 두 뷰의 헤더 라벨이 동일하여 컨텍스트 구분 불가 | Cognitive Load |
| 3 | I3 | Major | 접근성: 뒤로가기 버튼에 aria-label 없음 | WCAG 2.1 AA |
| 4 | I4 | Major | "등장인물 추가" 라벨이 280px 패널에서 너무 김 | Cognitive Load, Visual Spacing |
| 5 | I5 | Minor | CharacterCard 헤더의 시각적 불균형 | Aesthetic-Usability |
| 6 | I6 | Minor | collapse/뒤로가기 버튼 클릭 영역이 24px 미만 | Fitts's Law |

---

## 4. 질문 3: 개선 제안

### 개선안 A: GraphView 헤더 재설계

#### 현재
```
| "CHARACTERS"              [+ 등장인물 추가]  [<] |
```

#### 제안
```
| "등장인물"                          [+]    [<]  |
```

변경 사항:

1. **"등장인물 추가" 버튼을 아이콘 전용으로 변경**: `[+]` 아이콘 버튼(icon-only ghost button). `aria-label="등장인물 추가"`. 280px 패널에서 텍스트 라벨은 공간 대비 정보량이 낮다. 아이콘(+)만으로 의미가 명확하다 -- "+" 아이콘은 "추가"의 보편적 시각 언어이며 Jakob's Law에 부합한다.

2. **UPPERCASE 제거**: 현재 CSS에 `uppercase tracking-wide`가 적용되어 있다. 한국어에서 UPPERCASE는 의미가 없고(한글에 대소문자 구분 없음), 영어에서는 가독성을 떨어뜨린다 (all-caps는 단어 형태 인식을 방해). Sentence case("Characters", "등장인물")로 변경 권장. 이것은 기존 타임라인 패널의 타이틀이 포함되지 않는 구조와도 다르므로, 패널 타이틀의 스타일을 통일할 기회이기도 하다.

3. **클릭 영역 확대**: 아이콘 버튼들의 패딩을 `p-1`에서 `p-1.5`로 변경하여 최소 26x26px 확보. 시각적으로는 여전히 compact하지만 Fitts's Law 최소 기준(24px)을 충족.

결과:
```
+--- h-10, px-4 -------------------------------------------+
| 등장인물                                    [+]    [<]   |
+-----------------------------------------------------------+
```

**근거**:
- Cognitive Load 감소: 헤더에서 "추가" 텍스트를 읽을 필요 없음. 아이콘만으로 충분.
- Fitts's Law: 버튼 간 간격이 넓어져 오클릭 위험 감소.
- Visual Spacing: 좌측 타이틀과 우측 컨트롤 사이에 여유 공간 확보.

---

### 개선안 B: CharacterCard 헤더 재설계

#### 현재
```
| [<-] "CHARACTERS"                              [<] |
```

#### 제안
```
| [<-]  캐릭터 이름                       [...]  [<] |
```

변경 사항:

1. **"CHARACTERS" 라벨을 캐릭터 이름으로 교체**: 현재 편집 중인 캐릭터의 이름을 표시한다. 이름이 길면 `truncate`로 말줄임. 이것으로 IA Front Doors 원칙을 충족한다 -- "여기가 어디인지 즉시 알 수 있다".

2. **뒤로가기 버튼에 aria-label 추가**: `aria-label="관계도로 돌아가기"` (en: `"Back to character map"`). WCAG 2.1 AA 충족.

3. **[...] 옵션 메뉴 추가 (선택적)**: 캐릭터 삭제 버튼이 현재 카드 하단에만 있다. 헤더에 3-dot 메뉴를 두고 "삭제" 등의 부차적 액션을 넣는 것은 관례적이지만, 현재 카드 하단 배치도 충분히 합리적이다. 이 부분은 judgment call -- Phase 1에서는 생략 가능.

결과:
```
+--- h-10, px-4 -------------------------------------------+
| [<-]  강유진                                       [<]   |
+-----------------------------------------------------------+
```

**근거**:
- IA Front Doors: "어디에 있는지"를 즉시 인식. 브레드크럼 역할을 뒤로가기 화살표가 담당하고, 현재 위치를 이름이 표시.
- Cognitive Load 감소: "CHARACTERS"라는 섹션명 반복 불필요. 뒤로가기 화살표가 이미 "여기는 하위 뷰이고, 돌아갈 곳이 있다"는 것을 충분히 전달.
- Jakob's Law: iOS/Android의 상세 화면 헤더 패턴. `[<] 이전 화면 제목` 대신 `[<] 현재 항목 이름`을 쓰는 것은 Figma, Notion 등의 사이드바 패턴과 일치.

---

### 개선안 C: 타이틀 스타일 통일 (시스템 레벨)

현재 패널 타이틀 스타일:
```css
text-xs font-medium text-fg-secondary uppercase tracking-wide
```

문제:
- `text-xs` (12px): 패널 타이틀 치고 너무 작다. 패널 영역이 280px인데 타이틀이 12px면 존재감이 약하다.
- `uppercase`: 한국어에서 무의미, 영어에서 가독성 저하.
- `text-fg-secondary`: 부차적 정보 색상인데, 타이틀은 해당 영역의 가장 중요한 식별자다.

제안:
```
text-sm font-semibold text-fg  (sentence case, no uppercase)
```

- `text-sm` (14px): 패널 타이틀로 적절한 크기. 본문(편집기 내용)보다 작지만 캡션보다는 크다.
- `font-semibold`: 글자 두께로 시각적 위계 확보. `uppercase` 없이도 타이틀임을 인지 가능.
- `text-fg`: 주 전경색으로 존재감 확보.
- Sentence case: "등장인물" (ko), "Characters" (en).

**근거**: Von Restorff Effect -- 타이틀은 패널 헤더에서 가장 중요한 단일 요소여야 한다. 현재는 "추가" 버튼과 시각적 무게가 비슷하여 주의가 분산된다. 타이틀을 `text-fg` + `font-semibold`로 강화하면, 사용자 시선이 자연스럽게 타이틀 -> 액션 버튼 순으로 이동한다.

**참고**: 이 변경은 타임라인 패널, 씬 디테일 패널 등 모든 패널 헤더에 일괄 적용해야 한다 (일관성).

---

### 개선안 D: 뷰 전환 트랜지션 (선택적, Phase 1 후반)

현재 GraphView <-> CharacterCard 전환은 `<Show when={selectedChar()}>` 조건부 렌더링으로 즉시 전환된다. 트랜지션 없이 콘텐츠가 바뀌면 사용자는 "어디서 왔고 어디로 돌아갈 수 있는지"의 공간 감각을 잃는다.

제안:
- GraphView -> CharacterCard: 슬라이드-인 from right (200ms, ease-out). Stack Navigation 패턴 (Interaction Patterns: "Push to detail: Slide in from right, 300ms" -- 280px 패널에서는 200ms로 단축).
- CharacterCard -> GraphView: 슬라이드-아웃 to right (200ms, ease-out). "Pop back to list: Slide out to right, 250ms".

**근거**: Doherty Threshold -- 즉시 전환은 공간적 연속성을 끊는다. 좌에서 우로의 슬라이드는 "더 깊이 들어간다"는 시각적 비유를 제공한다.

**주의**: `prefers-reduced-motion` 환경에서는 즉시 전환(현행 유지).

---

### 개선안 E: 향후 확장을 위한 구조적 고려

Phase 3+에서 World Map이 추가될 때 좌측 패널 헤더의 진화:

```
Phase 1 (현재):
+--- h-10 ------------------------------------------------+
| 등장인물                                    [+]    [<]   |
+----------------------------------------------------------+

Phase 3+ (탭 추가 시):
+--- h-10 ------------------------------------------------+
| [등장인물] [월드맵]                               [<]   |
+----------------------------------------------------------+
```

- 탭 바 높이는 현재 h-10 (40px)을 유지할 수 있다. Segmented control 스타일로 2개 탭을 표시.
- [+] 버튼은 탭 콘텐츠 내부로 이동 (각 뷰가 자체 추가 액션을 가짐).
- [<] collapse 버튼은 패널 레벨이므로 탭과 무관하게 우측 끝에 유지.

이 진화는 현재 설계의 breaking change가 아니다. 지금은 탭 없이 타이틀만 있으므로, Phase 3+에서 타이틀 자리에 탭을 넣으면 된다.

---

## 5. 최종 권장 사항 요약

### 즉시 적용 (Critical + Major 수정)

| # | 변경 | 해결하는 이슈 | 원칙 |
|---|------|--------------|------|
| 1 | CharacterCard 헤더에 캐릭터 이름 표시 | I1, I2 | IA Front Doors, Cognitive Load |
| 2 | CharacterCard 뒤로가기 버튼에 aria-label 추가 | I3 | WCAG 2.1 AA |
| 3 | "등장인물 추가" 버튼을 아이콘 전용([+])으로 변경 | I4 | Cognitive Load, Fitts's Law |

### 추가 권장 (Minor 수정 + 시스템 레벨)

| # | 변경 | 해결하는 이슈 | 원칙 |
|---|------|--------------|------|
| 4 | 패널 타이틀 스타일 통일 (text-sm font-semibold text-fg, sentence case) | I5 | Von Restorff, Visual Consistency |
| 5 | 버튼 패딩 p-1 -> p-1.5 (최소 클릭 영역 24px+ 확보) | I6 | Fitts's Law |
| 6 | GraphView <-> CharacterCard 슬라이드 트랜지션 | 공간 연속성 | Doherty Threshold |

### 하지 않는 것

| 결정 | 이유 |
|------|------|
| 좌측 패널에 탭 UI 추가하지 않음 | Phase 1에서 뷰가 하나뿐 -- 과잉 설계 (Cognitive Load) |
| CharacterCard 헤더에 [삭제] 버튼 추가하지 않음 | 카드 하단에 이미 있음 -- 중복 (First Principles "제거할 수 있으면 제거") |
| 좌측 패널 역할 재정의하지 않음 | IA 문서와 정합. Phase 3+ 시 자연스럽게 진화 가능 |

---

## 6. 개선 후 예상 화면

### GraphView 헤더 (개선 후)
```
+--- h-10, px-4 -------------------------------------------+
| 등장인물                                    [+]    [<]   |
+-----------------------------------------------------------+
  ^text-sm                                     ^icon-only
  font-semibold                                aria-label=
  text-fg                                      "등장인물 추가"
  sentence case
```

### CharacterCard 헤더 (개선 후)
```
+--- h-10, px-4 -------------------------------------------+
| [<-]  강유진                                       [<]   |
+-----------------------------------------------------------+
  ^aria-label=            ^text-sm                   ^collapse
  "관계도로              font-semibold
   돌아가기"             text-fg
                         truncate
```

### 빈 상태 (변경 없음)
```
+--- h-10, px-4 -------------------------------------------+
| 등장인물                                    [+]    [<]   |
+-----------------------------------------------------------+
|                                                           |
|       아직 등장인물이 없습니다.                           |
|       이야기를 구성하면 자동으로                          |
|       생성됩니다.                                         |
|                                                           |
|              [+ 등장인물 추가]                            |
|                                                           |
+-----------------------------------------------------------+
```
빈 상태의 CTA 버튼은 full label 유지 (빈 상태에서는 공간이 충분하고, 사용자에게 명확한 안내가 필요).

---

## 7. 설계 근거 (Design Rationale)

### 어떤 인지 원칙이 각 결정을 뒷받침하는가

| 결정 | 원칙 | 설명 |
|------|------|------|
| 캐릭터 이름을 헤더에 표시 | IA Front Doors | 모든 화면에 identity가 있어야 한다 |
| "등장인물 추가" -> [+] | Cognitive Load | 280px에서 텍스트를 읽는 비용 > 보편 아이콘 인식 비용 |
| 뒤로가기에 aria-label | WCAG 2.1 AA | 모든 인터랙티브 요소에 접근 가능한 이름 필요 |
| 타이틀을 text-fg + semibold로 | Von Restorff | 패널에서 가장 중요한 요소가 가장 눈에 띄어야 함 |
| uppercase 제거 | Cognitive Load | 한국어에서 무의미, 영어에서 가독성 저하 |
| 슬라이드 트랜지션 | Doherty Threshold | 즉시 전환은 공간 감각을 끊음 |
| 패널 역할 재정의 안 함 | Principle of Growth | Phase 3+ 탭 추가 시 자연 진화 가능 |

### 무엇을 제거했고 왜

- "등장인물 추가" 텍스트 라벨: [+] 아이콘으로 대체. 280px 패널에서 텍스트 라벨은 공간 대비 가치가 낮다.
- CharacterCard 헤더의 "CHARACTERS" 라벨: 캐릭터 이름으로 대체. 중복 정보 제거.
- `uppercase tracking-wide`: 한국어에서 무의미한 스타일링 제거.

### 열린 질문

1. **패널 타이틀 스타일 변경의 범위**: 캐릭터 맵 헤더만 변경할지, 전체 패널 헤더를 일괄 변경할지. 일괄 변경을 권장하나, 변경 범위가 넓어지므로 별도 작업으로 분리할 수 있다.
2. **슬라이드 트랜지션의 우선순위**: Phase 1에서 구현해야 하는지, 아니면 polish 작업으로 후순위인지. Critical/Major 이슈 해결 후 진행 권장.
3. **[+] 아이콘 전용 버튼의 발견 가능성(discoverability)**: 아이콘만으로 "등장인물 추가"임을 충분히 전달하는가? 판단: D3 그래프 위 캐릭터 노드들이 이미 존재하는 컨텍스트에서, 패널 상단의 [+]는 "여기에 뭔가를 추가한다"는 의미가 자명하다. 그러나 tooltip(`title` 속성 또는 hover tooltip)으로 보강하면 더 낫다.
