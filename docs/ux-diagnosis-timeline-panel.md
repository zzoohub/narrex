# UX Diagnosis: Timeline Panel Controls

**Type:** Diagnosis (Mode B)
**Date:** 2026-03-09
**Scope:** 타임라인 하단 패널의 컨트롤 배치, 가시성, 어포던스

---

## 1. Context

### User Goal (JTBD)
**When I** am structuring my novel in the NLE timeline, **I want to** manage tracks and scenes with intuitive controls, **so that I can** focus on story structure rather than hunting for UI controls.

### User Context
- **Device**: Desktop (768px+ enforced)
- **Environment**: 장시간 작업 세션, 타임라인과 에디터 사이를 빈번하게 전환
- **Mental state**: 공간적 사고 모드 -- 장면 배치, 트랙 구조, 시간 흐름을 파악하는 중
- **Platform**: Web (SolidJS), "Ink & Amber" 다크 우선 디자인 시스템

### User의 핵심 불만
> "하단바의 가시성이 떨어진다. 특히 패널 열고닫는 부분, 트랙 펼치고 간소화하는 부분, 트랙추가 버튼 전부 다 뭔가 좀 어정쩡한 위치인 것 같다."

### 관련 기존 문서
- `docs/ux-panel-collapse.md` -- 패널 접기/펼치기 전체 설계
- `docs/ux-timeline-zoom-placement.md` -- 줌 컨트롤 배치 진단 (이미 수정 반영됨)

---

## 2. 현재 구현 분석

현재 타임라인 패널의 구조를 코드 기반으로 정리하면 다음과 같다.

```
+----------- 112px track label col ----------+--- Ruler ticks ---------------------+
|                                             |                                     |
|  [v] (14px, collapse panel)                 | 0  1  2  3  4  ...    [-]100%[+]|[] |
|  (center-justified, px-1)                   |            (absolute right: 8px)    |
+---------------------------------------------+-------------------------------------+
| [v] Track 1                                 | [Scene A  ][Scene B  ]  [+]        |
+---------------------------------------------+-------------------------------------+
| [v] Track 2                                 | [Scene C       ]   [+]             |
+---------------------------------------------+-------------------------------------+
|                        [+ 트랙 추가]                                               |
|                        (padding-left: 124px)                                       |
+------------------------------------------------------------------------------------+
```

### 컨트롤 5가지의 현재 상태

| # | 컨트롤 | 위치 | 크기 | 시각적 단서 |
|---|--------|------|------|------------|
| 1 | **패널 접기** (chevron-down) | 룰러 행의 트랙 라벨 컬럼, 중앙 정렬 | 14px 아이콘, ~26px 탭 영역 | 아이콘만, 라벨/텍스트 없음 |
| 2 | **트랙 접기/펼치기** (chevron-down/right) | 각 트랙 라벨 영역의 왼쪽, 텍스트와 gap-1 | 12px 아이콘, ~20px 탭 영역 | 아이콘만, 의미 불명확 |
| 3 | **트랙 추가** (+ 트랙 추가) | 모든 트랙 아래, padding-left: 124px | Ghost Button (sm) | 텍스트 있지만 위치가 어색 |
| 4 | **줌 툴바** | 룰러 우측 끝, absolute right: 8px | 14px 아이콘들, backdrop-blur | 반투명 배경으로 구분됨 |
| 5 | **하단 엣지 탭** (접혀있을 때) | 중앙 하단, absolute centered | 56x24px, chevron-up | edge-tab CSS 클래스 |

---

## 3. 컨트롤별 진단

### 3.1 패널 접기 버튼 (Severity: Major)

**현재 상태:**
- 14px chevron-down 아이콘 하나만 112px 컬럼의 정중앙에 위치
- 라벨 없음, 배경 없음
- `items-center justify-center` 정렬

**문제 진단:**

**(A) Von Restorff Effect 위반 -- 시각적 존재감 부족**

112px 너비의 영역 한가운데에 14px 아이콘 하나만 덩그러니 있다. 주변에 대비되는 요소가 없고, 아이콘 자체도 `text-fg-muted` (다크 테마에서 `#5e5a52`) 색상이어서 `bg-surface` (`#151519`) 배경과의 대비가 매우 낮다. 사용자가 이 버튼의 존재를 인지하려면 의도적으로 해당 영역을 탐색해야 한다.

**(B) Jakob's Law 위반 -- NLE 관례와 불일치**

전문 NLE/DAW 도구에서 패널 접기 버튼의 배치 관례는 다음과 같다:

| 도구 | 패널 접기 위치 | 형태 |
|------|---------------|------|
| **Premiere Pro** | 패널 헤더 바의 우상단 | 텍스트 + 아이콘 또는 패널 이름 옆 |
| **DaVinci Resolve** | 패널 자체의 탭 영역 또는 메뉴 | 탭 클릭 토글 |
| **Logic Pro** | 도구 바의 전용 버튼 | 명확한 토글 아이콘 |
| **VS Code** | 패널 헤더의 우측 끝 | X 아이콘 또는 chevron |
| **Figma** | 패널 헤더 내 | 패널 이름과 함께 |

공통점: **패널의 이름이나 역할을 알 수 있는 라벨 근처에 접기 버튼이 위치한다.** 현재 Narrex의 구현은 라벨 없이 아이콘만 있어서 "이 버튼이 무엇을 접는 건지" 맥락이 없다.

**(C) Fitts's Law -- 어중간한 위치**

`justify-center`로 112px 컬럼 한가운데에 놓였는데, 사용자의 시선은 대부분 트랙 라벨이나 클립 영역에 있다. 콘텐츠와 관계없는 빈 공간 한가운데의 작은 아이콘은 발견하기 어렵다.

**레퍼런스 비교 판정:** `ux-panel-collapse.md` 설계 문서에서는 "타임라인 헤더(h-10)의 우측 끝"에 접기 버튼을 배치하도록 명시했지만, 현재 구현에는 h-10 헤더 바 자체가 없다. 타임라인에는 별도 헤더가 없고 28px 룰러 행이 헤더 역할을 겸하고 있다. 이 차이가 문제의 원인이다.


### 3.2 트랙 접기/펼치기 (Severity: Major)

**현재 상태:**
- 12px chevron 아이콘이 트랙 라벨 텍스트 왼쪽에 위치
- `p-0.5` (2px 패딩) = 약 16px 탭 영역
- 클릭 시 트랙 높이를 56px -> 24px으로 축소하거나 복원
- 접힌 상태: chevron-right, 라벨 + "N scenes" 텍스트만 표시

**문제 진단:**

**(A) Fitts's Law 심각 위반 -- 타겟 크기 미달**

12px 아이콘에 2px 패딩이면 탭 영역이 약 16px. 웹 클릭 타겟 최소 권장 크기 24px에도 못 미치고, 권장값 32px에는 한참 부족하다. 사용자가 작은 아이콘을 정밀하게 클릭해야 하며, 바로 옆의 트랙 라벨 텍스트를 잘못 클릭할 위험이 높다.

**(B) Cognitive Load -- 기능 의미의 불명확성**

chevron-down/right 아이콘만으로는 "트랙을 시각적으로 축소한다"는 의미를 전달하기 어렵다. NLE 맥락에서 chevron은 여러 의미를 가질 수 있다:
- 트랙의 하위 항목을 펼치기/접기 (트리 뷰)
- 트랙 자체의 높이를 축소
- 트랙 내용 숨기기

사용자가 "이걸 누르면 뭐가 되는 건데?" 하고 주저할 수 있다.

**(C) Jakob's Law -- NLE 관례와 부분적 불일치**

| 도구 | 트랙 높이 조절 방법 | 트랙 접기 방법 |
|------|-------------------|---------------|
| **Premiere Pro** | 트랙 헤더의 삼각형 토글 | 같은 삼각형 -- 관례화됨 |
| **DaVinci Resolve** | 트랙 헤더 더블클릭 또는 드래그 | 트랙 높이 드래그 |
| **Logic Pro** | 트랙 헤더의 disclosure triangle | 표준 macOS 패턴 |
| **Ableton Live** | 트랙 하단 경계 드래그 | 접기 없음 (높이 자유 조절) |

Premiere Pro의 disclosure triangle 패턴은 현재 Narrex의 패턴과 가장 유사하지만, Premiere에서는 삼각형이 더 크고(약 10-12pt), 트랙 이름과 시각적으로 명확하게 구분된다. Narrex의 12px chevron은 이보다 훨씬 작다.


### 3.3 트랙 추가 버튼 (Severity: Major)

**현재 상태:**
- `Button variant="ghost" size="sm"` 컴포넌트, `IconPlus + "트랙 추가"` 텍스트
- 위치: 모든 트랙 하단에 `padding-left: 124px` (TRACK_LABEL_WIDTH + 12px)
- 이 padding으로 인해 버튼이 클립 영역의 좌측 시작점과 정렬됨
- 트랙 라벨 컬럼 아래가 아닌, 클립 영역 시작점에 위치

**문제 진단:**

**(A) 정보 아키텍처 위반 -- 잘못된 공간적 귀속**

"트랙 추가"는 트랙 목록에 대한 조작이다. 트랙 라벨은 왼쪽 112px 컬럼에 있다. 그런데 "트랙 추가" 버튼은 124px 왼쪽에 패딩을 넣어서 클립 영역 시작점에 정렬했다. 이 배치는 사용자의 멘탈 모델과 불일치한다:

```
사용자의 기대                        현재 구현
+-----------+------- clips ---+     +-----------+------- clips ---+
| Track 1   | [Scene A]       |     | Track 1   | [Scene A]       |
| Track 2   | [Scene B]       |     | Track 2   | [Scene B]       |
| [+추가]   |                 |     |           | [+ 트랙 추가]   |
+-----------+-----------------+     +-----------+-----------------+
  라벨 컬럼 아래에 위치해야 자연       클립 영역에 위치 -> 어색
```

사용자는 트랙 라벨 영역 아래에서 "트랙 추가"를 찾으려 할 것이다. 왜냐하면 트랙의 이름(라벨)이 왼쪽 컬럼에 있기 때문이다. 그런데 버튼은 그 영역이 아닌 124px 오른쪽에 있다.

**Gestalt 근접성 원칙 위반**: 트랙 라벨들과 물리적으로 떨어져 있어서 "트랙 목록의 마지막 항목"으로 인식되지 않는다.

**(B) Jakob's Law -- NLE 관례와 비교**

| 도구 | 트랙 추가 위치 | 형태 |
|------|---------------|------|
| **Premiere Pro** | 트랙 헤더 영역 우클릭 컨텍스트 메뉴 또는 "패널 메뉴" | 메뉴 항목 |
| **DaVinci Resolve** | 트랙 헤더 영역 우클릭 "Add Track" | 컨텍스트 메뉴 |
| **Logic Pro** | 트랙 리스트 하단 "+" 버튼 (트랙 라벨 영역 내) | 라벨 영역 내 버튼 |
| **Ableton Live** | 트랙 리스트 하단 빈 영역 더블클릭 또는 Create 메뉴 | 직접 조작 |
| **GarageBand** | 트랙 헤더 아래 "+" 원형 버튼 | 라벨 영역 하단 |

공통점: **트랙 추가는 트랙 라벨/헤더 영역의 연장선상에 위치한다.** Logic Pro와 GarageBand가 가장 직관적인 패턴을 사용하며, 둘 다 트랙 헤더 컬럼의 하단에 "+" 버튼을 배치한다.

**(C) Progressive Disclosure 부족 -- Ghost 버튼의 가시성 문제**

`variant="ghost"` 버튼은 배경과 테두리가 없어서 hover 전까지 존재감이 매우 낮다. 다크 테마에서 `text-fg-muted` 텍스트는 거의 보이지 않는다. "트랙 추가"는 트랙이 아직 충분하지 않을 때 빈번하게 사용되는 기능인데, ghost 버튼으로 숨겨둘 이유가 없다.


### 3.4 줌 툴바 (Severity: Minor -- 이미 개선됨)

`ux-timeline-zoom-placement.md`의 진단에 따라 이미 룰러 우측으로 이동 완료. 현재 구현 상태:
- `position: absolute; right: 8px` 으로 룰러 행 우측에 고정
- `bg-surface/80 backdrop-blur-sm`으로 배경 처리
- 아이콘 14px, 적절한 gap

**남은 사소한 문제:**
- `min-w-[3.5ch]` -> 3자리 퍼센트(100%, 200%)에서 약간 좁을 수 있음. `min-w-[4ch]` 권장.
- `border border-border-subtle` 추가로 배경과의 경계를 더 명확히 할 수 있음.

이 항목은 이미 해결된 상태이므로 이후 섹션에서는 다루지 않는다.


### 3.5 하단 엣지 탭 (Severity: Minor)

**현재 상태:**
- 패널 접혀 있을 때 중앙 하단에 56x24px 탭 표시
- `edge-tab edge-tab--bottom` CSS 클래스 적용
- chevron-up 아이콘

**문제 진단:**

**(A) 디자인 문서와 구현이 일치 -- 양호**

`ux-panel-collapse.md` 설계대로 구현되어 있다. 크기, 위치, 스타일 모두 명세와 일치한다.

**(B) 미세한 가시성 문제**

56x24px는 기능적으로는 충분하지만, 넓은 에디터 영역 하단 중앙에 작은 탭 하나만 있으면 시각적 존재감이 약할 수 있다. 특히 에디터에 집중하고 있는 사용자는 하단 가장자리를 잘 보지 않는다.

**개선 제안 (선택적):** hover 시 너비를 약간 확장하거나, 라벨 텍스트("Timeline")를 함께 표시하면 발견 가능성이 높아진다. 다만 이는 Minor 이슈이며, 키보드 단축키(`Cmd+Shift+T`)로 대체 가능하므로 우선순위가 낮다.

---

## 4. NLE/DAW 레퍼런스 비교 종합

### 4.1 타임라인 컨트롤의 공간 분할 관례

전문 NLE/DAW 도구에서 타임라인 영역은 공통적으로 다음과 같이 공간을 분할한다:

```
+-- Header/Toolbar --+-- Ruler -------------------------------------------+
| [Transport] [Tools]|  0   1   2   3   4   5   ...   [Zoom Controls]    |
+--------------------+----------------------------------------------------+
| Track 1 [controls] | [Clip A][Clip B]                                  |
| Track 2 [controls] | [Clip C]                                          |
| Track 3 [controls] | [Clip D][Clip E]                                  |
| [+ Add Track]      |                                                   |
+--------------------+---------------------------------------------------+
```

**핵심 규칙:**

1. **좌측 컬럼 = 트랙 관리 영역**: 트랙 이름, 뮤트/솔로, 높이 조절, 트랙 추가 등 "트랙 자체"에 대한 모든 조작이 여기에 위치
2. **우측 영역 = 콘텐츠 + 뷰포트 조작**: 클립, 룰러, 줌 컨트롤 등 "타임라인 콘텐츠"에 대한 조작
3. **상단 = 전역 도구**: 패널 관리, 스냅, 플레이백 등

### 4.2 Narrex와 레퍼런스 앱의 핵심 차이

| 항목 | NLE 관례 | Narrex 현재 | 차이 |
|------|---------|------------|------|
| 패널 접기 | 헤더 바 또는 패널 탭에 위치 | 룰러 행 좌상단, 라벨 없음 | 헤더 바가 없어서 룰러에 끼워넣음 |
| 트랙 높이 조절 | 큰 삼각형 or 드래그 | 12px chevron, 20px 탭 영역 | 너무 작고 의미 불명확 |
| 트랙 추가 | 트랙 라벨 영역 하단 | 클립 영역에 정렬 (124px 패딩) | 공간적 귀속 오류 |
| 줌 | 우측 또는 하단 | (이미 우측으로 이동 완료) | 해결됨 |

### 4.3 근본 원인

**Narrex 타임라인에는 "헤더 바"가 없다.**

대부분의 NLE 도구에는 트랙 위에 독립적인 헤더/툴바 행(30-40px)이 있어서 패널 제목, 도구 버튼, 줌 컨트롤 등이 명확하게 배치된다. Narrex는 이를 생략하고 28px 룰러 행이 모든 역할을 겸하도록 설계했다. 그 결과:

- 패널 접기 버튼이 룰러 좌측 빈 공간에 홀로 놓임 (라벨/맥락 부재)
- 줌 컨트롤이 원래 룰러 좌측에 끼여 있었음 (이미 수정됨)
- 트랙 추가 버튼이 헤더에 갈 자리가 없어서 트랙 아래 어중간한 위치에 배치

---

## 5. 개선 제안

### 5.1 타임라인 헤더 바 신설 (핵심 변경)

28px 룰러 위에 32px 높이의 타임라인 헤더 바를 추가한다. 이 바에 패널 관리, 타임라인 라벨, 트랙 추가 버튼을 집약한다.

```
+--- 112px label col --+--- Timeline area ----------------------------------+
| TIMELINE         [v] | [+ Add Track]                  [-] 100% [+] | [fit]|
+----------------------+-----------------------------------------------------|
| (룰러 28px)          | 0   1   2   3   4   5   6   ...                     |
+----------------------+-----------------------------------------------------|
| [v] Track 1          | [Scene A  ][Scene B  ]  [+]                        |
+----------------------+-----------------------------------------------------+
| [v] Track 2          | [Scene C       ]   [+]                              |
+----------------------+-----------------------------------------------------+
```

#### 헤더 바 명세

- **높이**: 32px (`h-8`)
- **배경**: `bg-surface`, `border-b border-border-subtle`
- **좌측 (112px 컬럼 내)**:
  - "TIMELINE" 라벨: `text-[11px] font-medium text-fg-secondary uppercase tracking-wider`
  - 패널 접기 버튼: `IconChevronDown size={14}`, 우측 정렬
  - 라벨과 접기 버튼은 `justify-between`으로 배치
- **우측 (타임라인 영역)**:
  - 트랙 추가 버튼: 좌측 정렬, `IconPlus + t('timeline.addTrack')`, ghost 스타일
  - 줌 툴바: 우측 끝 고정 (현재 룰러에서 헤더로 이동)

**설계 근거:**

| 결정 | 원칙 |
|------|------|
| 헤더 바 추가 | **Jakob's Law** -- 모든 NLE 도구가 타임라인 헤더를 가지고 있음 |
| "TIMELINE" 라벨 추가 | **Cognitive Load (recognition over recall)** -- 패널의 정체성 명시 |
| 접기 버튼을 라벨 옆에 배치 | **Gestalt Proximity** -- 패널 이름과 접기 컨트롤이 의미적으로 연결 |
| 32px 높이 | 세로 공간 비용과 기능성의 균형. 28px는 아이콘과 텍스트를 위한 최소 공간에 미달 |

**세로 공간 비용 분석:**
- 추가되는 높이: 32px
- 현재 타임라인 패널 기본 높이: 240px
- 비율: 32/240 = 13.3%
- 이 32px를 투자함으로써 얻는 것: 패널 라벨, 적절한 접기 버튼, 트랙 추가의 올바른 위치, 줌의 안정적 배치
- 필요 시 기본 높이를 256px로 약간 증가시켜 콘텐츠 영역 손실을 보상 가능


### 5.2 트랙 접기/펼치기 개선

#### 아이콘 크기 및 탭 영역 확대

- 아이콘: 12px -> **14px**
- 패딩: `p-0.5` -> **`p-1`** (4px)
- 결과 탭 영역: 14 + 8 = **22px** (최소, rounded-md 포함 시 약 28px)
- 권장: `min-w-[28px] min-h-[28px]` 명시로 웹 클릭 타겟 최소 기준 충족

```tsx
// Before
<button class="p-0.5 rounded text-fg-muted hover:text-fg transition-colors cursor-pointer flex-shrink-0">
  <IconChevronDown size={12} />
</button>

// After
<button class="p-1.5 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer flex-shrink-0 min-w-7 min-h-7 flex items-center justify-center">
  <IconChevronDown size={14} />
</button>
```

#### Hover 피드백 강화

현재는 `hover:text-fg`만 적용되어 있다. `hover:bg-surface-raised`를 추가하여 hover 시 버튼의 경계가 시각적으로 드러나도록 한다. 이는 나머지 툴바 버튼(줌 등)과 스타일을 통일하는 효과도 있다.

**설계 근거:**

| 결정 | 원칙 |
|------|------|
| 아이콘 12px -> 14px | **Fitts's Law** -- 더 큰 타겟은 더 빠르고 정확한 클릭 |
| 탭 영역 확대 | **Ergonomics** -- 웹 클릭 타겟 최소 24px, 권장 32px |
| hover 배경 추가 | **Interaction Patterns (피드백)** -- 모든 인터랙티브 요소는 hover 시 시각적 반응 필요 |


### 5.3 트랙 추가 버튼 재배치

#### 방안: 타임라인 헤더 바로 이동

"트랙 추가" 버튼을 트랙 아래에서 타임라인 헤더 바의 좌측(트랙 라벨 컬럼 오른쪽)으로 이동한다.

```
+--- 112px label col --+--- Header area ------------------------------------+
| TIMELINE         [v] | [+ 트랙 추가]                  [-] 100% [+] | [fit]|
+----------------------+-----------------------------------------------------|
```

**이점:**
1. 트랙 관리 영역(좌측 컬럼)과 근접 -- Gestalt Proximity 충족
2. 항상 보이는 고정 위치 -- 스크롤해도 사라지지 않음
3. Ghost 버튼이어도 헤더 바 맥락 안에서 발견 가능성 높음
4. 트랙 수가 많아져도 스크롤 끝까지 내릴 필요 없음

**기존 위치의 인라인 입력 UX 보존:**

현재 "트랙 추가" 클릭 시 해당 위치에 인라인 텍스트 입력이 나타난다. 헤더로 이동 시 인라인 입력도 헤더 내에서 펼쳐지거나, 또는 새 트랙이 기본 이름("Track N")으로 즉시 생성된 후 트랙 라벨을 더블클릭하여 이름을 변경하는 패턴으로 전환할 수 있다. 후자가 NLE 관례에 더 부합한다 (Logic Pro, Premiere Pro 모두 트랙 생성 후 이름 변경 방식).

**설계 근거:**

| 결정 | 원칙 |
|------|------|
| 헤더로 이동 | **Jakob's Law** -- Logic Pro, GarageBand 패턴: 트랙 관리 영역의 상단에 위치 |
| 고정 위치 | **Fitts's Law** -- 사용자가 스크롤 위치와 무관하게 접근 가능 |
| 즉시 생성 후 이름 변경 | **Doherty Threshold** -- 클릭 한 번으로 트랙 생성, 이름은 나중에 |

#### 대안 검토: 트랙 라벨 컬럼 하단 유지

트랙 라벨 컬럼 하단에 두되, padding-left를 제거하고 라벨 컬럼 내에 정렬하는 방안:

```
+--- 112px label col --+--- clips --------+
| Track 1              | [Scene A]         |
| Track 2              | [Scene B]         |
| [+ 트랙 추가]        |                   |
+----------------------+-------------------+
```

이 방안은 Logic Pro/GarageBand의 "트랙 리스트 하단 + 버튼" 패턴과 일치한다. 그러나 트랙이 많아지면 스크롤 끝까지 내려야 하는 단점이 있다. 헤더 배치가 더 우월하다.


### 5.4 전체 레이아웃 After

```
+--- 112px label col --+--- Timeline area ------------------------------------+
| TIMELINE         [v] | [+ 트랙 추가]                    [-] 100% [+] | [fit]|
|                      |                                   ~~~반투명 bg~~~     |
+----------------------+------------------------------------------------------+
| (룰러 28px)          | 0   1   2   3   4   5   6   ...                       |
+----------------------+------------------------------------------------------+
| [>] Track 1          | [Scene A  ][Scene B  ]  [+]                          |
+----------------------+------------------------------------------------------+
| [>] Track 2          | [Scene C       ]   [+]                                |
+----------------------+------------------------------------------------------+
```

**변경 요약:**

| 요소 | Before | After |
|------|--------|-------|
| 패널 접기 버튼 | 룰러 행 좌상단, 라벨 없음 | 헤더 바 우측, "TIMELINE" 라벨 옆 |
| 트랙 접기 chevron | 12px, p-0.5, hover 배경 없음 | 14px, p-1.5, hover:bg-surface-raised |
| 트랙 추가 | 트랙 아래 124px padding, ghost | 헤더 바 좌측, 항상 보임 |
| 줌 컨트롤 | 룰러 우측 (유지) | 헤더 바 우측으로 이동 가능 (선택) |
| 타임라인 헤더 | 없음 | 32px 헤더 바 신설 |

---

## 6. 줌 컨트롤의 위치: 룰러 유지 vs 헤더 이동

헤더 바를 신설하면 줌 컨트롤의 위치에 대해 두 가지 옵션이 발생한다:

### Option A: 줌을 룰러 행에 유지 (현재대로)

```
+--- Header (32px) ---+----------------------------------------------+
| TIMELINE         [v] | [+ 트랙 추가]                                |
+----------------------+----------------------------------------------+
| Ruler (28px)         | 0  1  2  3  4  ...        [-] 100% [+] |[fit]|
+----------------------+----------------------------------------------+
```

- 장점: 줌이 룰러 눈금과 같은 행에 있어서 "이 눈금 간격을 조절한다"는 의미가 직관적
- 단점: 헤더 우측이 비어 있어서 공간 활용이 비효율적

### Option B: 줌을 헤더로 이동

```
+--- Header (32px) ---+----------------------------------------------+
| TIMELINE         [v] | [+ 트랙 추가]       [-] 100% [+] |[fit]      |
+----------------------+----------------------------------------------+
| Ruler (28px)         | 0  1  2  3  4  5  6  ...                     |
+----------------------+----------------------------------------------+
```

- 장점: 헤더 한 줄에 모든 도구가 모여 시각적으로 깔끔. 룰러가 순수하게 눈금만 표시
- 단점: 줌과 룰러의 의미적 연관이 약간 약해짐

**판정:** **Option B 권장.** 이유:
1. Premiere Pro, DaVinci Resolve 모두 줌 컨트롤이 타임라인 헤더/툴바에 위치 (룰러 내가 아님)
2. 룰러가 깔끔해지면 타임라인 스크롤 시 줌 컨트롤이 룰러 눈금과 겹치지 않음
3. 도구 모음이 한 행에 집약되어 Cognitive Load 감소

---

## 7. 우선순위 정리

| 순위 | 항목 | 심각도 | 변경 범위 | 효과 |
|------|------|--------|---------|------|
| **1** | 타임라인 헤더 바 신설 + 패널 접기 버튼 재배치 | Major | 구조 변경 | 패널 정체성, 접기 가시성, 트랙 추가 위치를 한번에 해결 |
| **2** | 트랙 추가 버튼을 헤더로 이동 | Major | 위치 이동 | #1과 함께 구현 |
| **3** | 트랙 접기 chevron 확대 + hover 피드백 | Major | 스타일 변경 | 타겟 크기 준수, 인터랙티브 요소 가시성 |
| **4** | 줌 컨트롤 헤더 이동 (선택) | Minor | 위치 이동 | 룰러 정리, 도구 집약 |
| **5** | 하단 엣지 탭 라벨 추가 (선택) | Minor | 텍스트 추가 | 발견 가능성 약간 향상 |
| **6** | 줌 퍼센트 min-width 수정 | Minor | CSS 미세 조정 | 레이아웃 안정성 |

**추천 구현 순서:** #1 + #2를 함께, 그다음 #3, 이후 #4는 선택적.

---

## 8. 구현 명세

### 8.1 TimelinePanel 컴포넌트 구조 변경

```tsx
// TimelinePanel render structure (proposed)
<div class="flex flex-col h-full bg-surface border-t border-border-default">
  {/* Hint banner (기존 유지) */}
  <Show when={showHint()}>...</Show>

  {/* NEW: Timeline header bar */}
  <div class="flex items-center flex-shrink-0 border-b border-border-subtle" style={{ height: '32px' }}>
    {/* Left: label column */}
    <div
      class="flex-shrink-0 flex items-center justify-between px-3 border-r border-border-subtle"
      style={{ width: `${TRACK_LABEL_WIDTH}px` }}
    >
      <span class="text-[11px] font-medium text-fg-secondary uppercase tracking-wider select-none">
        {t('timeline.title')}
      </span>
      <Show when={props.onCollapse}>
        <button
          type="button"
          onClick={props.onCollapse}
          class="p-1 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
          aria-label={t('timeline.collapse')}
          aria-expanded={true}
        >
          <IconChevronDown size={14} />
        </button>
      </Show>
    </div>

    {/* Right: track add + zoom controls */}
    <div class="flex-1 flex items-center justify-between px-3">
      <Button
        variant="ghost"
        size="sm"
        icon={<IconPlus size={14} />}
        onClick={() => setAddingTrack(true)}
      >
        {t('timeline.addTrack')}
      </Button>

      {/* Zoom toolbar */}
      <div class="flex items-center gap-1">
        <button aria-label="Zoom out" onClick={zoomOut} ...>
          <IconZoomOut size={14} />
        </button>
        <span class="text-[10px] text-fg-muted tabular-nums min-w-[4ch] text-center select-none">
          {Math.round((scale() / DEFAULT_SCALE) * 100)}%
        </span>
        <button aria-label="Zoom in" onClick={zoomIn} ...>
          <IconZoomIn size={14} />
        </button>
        <div class="w-px h-3.5 bg-border-default mx-0.5" />
        <button aria-label={t('timeline.fit')} onClick={zoomFit} ...>
          <IconMaximize size={14} />
        </button>
      </div>
    </div>
  </div>

  {/* Timeline body (ruler + tracks) - 줌 컨트롤 제거 */}
  <div ref={timelineBodyRef} class="flex-1 overflow-auto relative" ...>
    {/* Ruler row - 접기 버튼과 줌 모두 제거, 순수 눈금만 */}
    <div class="flex flex-shrink-0" style={{ height: `${RULER_HEIGHT}px` }}>
      <div class="flex-shrink-0 border-r border-border-subtle" style={{ width: `${TRACK_LABEL_WIDTH}px` }} />
      <div class="relative flex-1">
        <For each={rulerTicks()}>...</For>
        {/* 줌 컨트롤 삭제 -- 헤더로 이동됨 */}
      </div>
    </div>

    {/* Tracks (기존 유지, track add row 제거) */}
    <For each={ws.trackScenes()}>...</For>

    {/* Track add row 삭제 -- 헤더로 이동됨 */}
  </div>
</div>
```

### 8.2 트랙 접기 버튼 스타일 수정

```tsx
// Before
<button
  type="button"
  class="p-0.5 rounded text-fg-muted hover:text-fg transition-colors cursor-pointer flex-shrink-0"
  onClick={() => toggleTrackCollapse(track.id)}
  aria-label={isCollapsed() ? 'Expand track' : 'Collapse track'}
>
  <Show when={isCollapsed()} fallback={<IconChevronDown size={12} />}>
    <IconChevronRight size={12} />
  </Show>
</button>

// After
<button
  type="button"
  class="p-1 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer flex-shrink-0"
  onClick={() => toggleTrackCollapse(track.id)}
  aria-label={isCollapsed() ? t('timeline.expandTrack') : t('timeline.collapseTrack')}
  aria-expanded={!isCollapsed()}
>
  <Show when={isCollapsed()} fallback={<IconChevronDown size={14} />}>
    <IconChevronRight size={14} />
  </Show>
</button>
```

### 8.3 인라인 트랙 추가 입력 처리

트랙 추가 버튼이 헤더로 이동하므로 인라인 입력 방식을 변경한다:

**추천 방식:** 기본 이름으로 즉시 생성, 더블클릭 이름 변경

```tsx
// 헤더의 "트랙 추가" 버튼
<Button
  variant="ghost"
  size="sm"
  icon={<IconPlus size={14} />}
  onClick={() => ws.addTrack(`Track ${ws.trackScenes().length + 1}`)}
>
  {t('timeline.addTrack')}
</Button>
```

더블클릭 이름 변경은 이미 구현되어 있다 (`onDblClick={() => startRenamingTrack(...)}`). 별도 추가 작업 불필요.

### 8.4 i18n 키 추가

```tsx
// timeline 관련 새 키
'timeline.title': 'Timeline' / '타임라인'
'timeline.collapse': 'Collapse timeline' / '타임라인 접기'
'timeline.expandTrack': 'Expand track' / '트랙 펼치기'
'timeline.collapseTrack': 'Collapse track' / '트랙 접기'
```

---

## 9. 접근성 점검

### 타겟 크기
- [x] 패널 접기 버튼: p-1 + 14px icon = ~22px (28px 영역 내, 최소 충족)
- [x] 트랙 접기 버튼: p-1 + 14px icon = ~22px -> `p-1.5` 또는 `min-w-7`로 28px 보장 권장
- [x] 트랙 추가 버튼: Button 컴포넌트의 sm 사이즈 = 32px 높이 (충족)
- [x] 줌 버튼: 기존 28px 유지 (충족)

### 키보드 내비게이션
- [x] Tab 순서: 헤더 (TIMELINE 접기 -> 트랙 추가 -> 줌 버튼들) -> 룰러 -> 트랙 접기 -> 클립들
- [x] Enter/Space: 모든 버튼 활성화
- [x] Escape: 드래그/리사이즈 취소 (기존 유지)

### 스크린 리더
- [x] 패널 접기: `aria-label`, `aria-expanded`
- [x] 트랙 접기: `aria-label`, `aria-expanded`
- [x] 줌 버튼: `aria-label`
- [ ] 헤더 영역에 `role="toolbar"` 추가 권장

### 대비
- [x] `text-fg-muted` on `bg-surface`: 다크 테마에서 `#5e5a52` on `#151519` = 약 2.5:1 (UI 컴포넌트 최소 3:1 미달)
- **주의**: 트랙 접기 chevron의 `text-fg-muted` 대비가 WCAG 3:1 UI 컴포넌트 기준에 미달할 수 있음. `text-fg-secondary` (`#a8a49c` on `#151519` = 약 5.5:1)로 변경하거나, hover 시에만 인터랙티브임을 표시하는 대안 고려.

---

## 10. Design Rationale 요약

| 결정 | 원칙 | 레퍼런스 |
|------|------|---------|
| 타임라인 헤더 바 신설 | **Jakob's Law** -- 모든 NLE에 존재하는 구조 | Premiere Pro, Logic Pro |
| 패널 접기를 라벨 옆에 | **Gestalt Proximity** -- 의미적으로 연관된 요소의 물리적 근접 | VS Code, Figma |
| 트랙 추가를 헤더로 이동 | **Fitts's Law** -- 고정 위치, 스크롤 무관 접근 | Logic Pro, GarageBand |
| 트랙 chevron 확대 | **Fitts's Law** -- 타겟 크기 기준 충족 | Ergonomics spec |
| 줌을 헤더로 이동 | **Cognitive Load** -- 도구 집약, 룰러 정리 | DaVinci Resolve |
| 즉시 생성 후 이름 변경 | **Doherty Threshold** -- 한 클릭으로 결과 도출 | Logic Pro, Premiere Pro |

---

## 11. Open Questions

1. **헤더 32px의 세로 공간 비용을 어떻게 보상할 것인가?** 기본 패널 높이를 240px -> 256px로 증가시킬지, 아니면 32px 추가를 수용할지.

2. **트랙 추가 시 인라인 입력을 완전히 제거할 것인가?** 즉시 생성 후 이름 변경 방식으로 전환하면 UX 흐름이 한 단계 줄어들지만, 사용자가 "이름 없는 트랙"이 생기는 것에 불편할 수 있다.

3. **트랙 접기 chevron의 대비 문제**: `text-fg-muted` vs `text-fg-secondary` 어느 것을 기본 상태로 사용할지. UI 컴포넌트 WCAG 3:1 기준 충족을 위해 `text-fg-secondary` 사용을 권장하지만, 시각적으로 너무 두드러질 수 있다.

4. **줌 컨트롤의 최종 위치**: 룰러 유지(현재대로)와 헤더 이동 중 선택. 본 문서는 헤더 이동을 권장하지만, 구현 비용 대비 효과가 크지 않다면 룰러 유지도 합리적이다.
