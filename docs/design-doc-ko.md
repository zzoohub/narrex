# Narrex — 소프트웨어 아키텍처 설계 문서

**상태**: Draft
**작성자**: zzoo
**날짜**: 2026-03-07
**PRD 참조**: docs/prd.md, docs/prd-phase-1.md

---

## 1. 컨텍스트 & 범위

### 1.1 문제 정의

한국 웹소설 시장의 예비 작가들은 이야기를 가지고 있지만, 체계적인 다회차 원고로 만들어내지 못한다. 병목은 창의력이 아니라 — 수십 개의 사건을 구조화하고, 40회차 이상에 걸쳐 캐릭터와 플롯 일관성을 유지하며, 회차당 3,000-5,000자의 산문을 생산하는 노동이다. 한국이든 해외든, 시각적 스토리 구조와 AI 장면별 초안 작성을 결합한 도구는 존재하지 않는다.

Narrex는 이야기가 빈 페이지가 아닌 **이벤트 타임라인**인 비주얼 소설 에디터다. 사용자가 캐릭터, 관계, 플롯 포인트를 인터랙티브 멀티트랙 타임라인 위에 배치하면, AI가 장면별로 산문을 생성한다. 시각적 구조가 자동으로 AI 프롬프트로 조립되므로 — 프롬프트 엔지니어링이 필요 없다.

### 1.2 시스템 컨텍스트 다이어그램

```
docs/diagrams/system-context.d2 참조
```

### 1.3 가정

1. **장면 수준 한국어 산문 생성이 가능하다.** Frontier급 LLM이 수정 가능한 수준의 한국어 산문을 생성한다. 품질이 부족하면 provider adapter 추상화로 빠르게 전환 가능.
2. **컨텍스트 압축이 서사적 충실도를 유지한다.** AI 생성 요약이 15-20개 노드(Phase 1 범위)에 걸쳐 충분한 디테일을 유지한다. 40회차 이상은 검증 필요.
3. **초기 개발은 1인 개발자.** 아키텍처는 수평 확장성보다 운영 단순성과 개발 속도를 최적화한다.
4. **데스크톱 우선.** 타임라인과 에디터에 1280px 이상의 화면이 필요. 모바일은 범위 외.
5. **LLM API 비용이 주요 변동 비용이다.** 장면당 ~$0.03-0.06에서 비용 최적화는 처음부터 아키텍처적 관심사.
6. **사용자는 15-30초 생성 시간을 감수한다.** 토큰별 스트리밍 렌더링으로 체감 대기 시간을 2초 미만으로 줄인다.

---

## 2. 목표 & 비목표

### 2.1 목표

- **30초 이내 AI 생성**, 첫 토큰 스트리밍 2초 이내
- **활성 사용자당 월 평균 AI 비용 $5 미만** (Basic 플랜 사용 패턴 기준, 100회 생성/월)
- **1초 미만 체감 지연의 자동 저장** (타임라인, 캐릭터, 에디터 모든 편집)
- **500ms 이내 컨텍스트 어셈블리** — config, 캐릭터, 요약, 관계를 프롬프트로 조립
- **무중단 배포** (Cloud Run 롤링 업데이트)
- **Scale-to-zero** — 활성 사용자 없을 때 비용 절감 (1인 개발자 경제성)
- **Provider-agnostic LLM 통합** — Gemini, Claude, Ollama(로컬) 간 adapter trait으로 코드 변경 없이 전환
- **1,000명 동시 사용자 지원** (수평 자동 확장)

### 2.2 비목표

- **실시간 협업** — 단일 작가 제품. 충돌 해소, WebSocket 동기화 없음.
- **모바일 앱** — 데스크톱 우선. React Native 없음.
- **멀티 리전 active-active** — us-east 단일 리전으로 충분. CDN이 정적 자산 분배.
- **파인튜닝 모델** — 프롬프트 엔지니어링과 컨텍스트 어셈블리 활용. 산문 품질 정체 시 재검토.
- **오프라인 지원** — AI 생성에 네트워크 필수 (핵심 가치).
- **자체 호스팅 LLM** — 클라우드 API가 현재 규모에서 더 나은 품질/비용 비율 제공.

---

## 3. 고수준 아키텍처

### 3.1 아키텍처 스타일

**시스템 아키텍처: Modular Monolith + SSE Streaming**

명확한 경계를 가진 도메인 모듈로 구성된 단일 배포 Rust 서비스. 모듈 간 통신은 in-process 함수 호출과 경량 내부 이벤트 버스(요약 생성 등 비동기 부작용용). 사용자 대면 AI 기능은 SSE 스트리밍.

**근거**: 1인 개발자, 초기 단계 제품. Modular monolith는 분산 시스템 복잡성(서비스 메시, 서비스 간 인증, 분산 트레이싱)을 제거하면서 도메인 격리를 유지한다. Shopify/Toss 패턴 — 모놀리스로 시작, 데이터가 경계를 증명할 때만 추출 — 이 단계에서 올바른 접근.

**고려한 대안**:
- **Microservices**: 시기상조. 1인 개발자가 서비스 디스커버리, 서비스 간 인증, 분산 트레이싱, 독립 배포 파이프라인을 유지할 수 없다.
- **Serverless functions**: LLM 생성이 15-30초 스트리밍. 일반적인 함수 타임아웃 초과. Cloud Run의 300초 요청 타임아웃이 필요.

**코드 구조: Hexagonal (Ports & Adapters)**

모든 도메인 모듈이 hexagonal 아키텍처를 따른다. 도메인 로직은 순수 — 프레임워크, DB, LLM 의존성 없음. 외부 상호작용은 포트(Rust trait)와 구체적 어댑터를 통해 수행.

**스택**:

| 계층 | 기술 | 배포 |
|------|------|------|
| Frontend | TanStack Start + SolidJS | Cloudflare Workers/Pages |
| Backend | Rust (Axum) | GCP Cloud Run (us-east4) |
| Database | Neon (PostgreSQL) | AWS us-east-1 (Virginia) |
| Cache | Upstash Redis | — |
| Object Storage | Cloudflare R2 | — |
| CDN / DNS | Cloudflare | Global edge |

### 3.2 컨테이너 다이어그램

```
docs/diagrams/container.d2 참조
```

**API 설계 철학**:

- **REST** + JSON. 리소스가 도메인 엔티티(프로젝트, 노드, 캐릭터, 초안)에 매핑.
- **버전 관리**: URL 경로 (`/api/v1/...`). 호환성 깨지는 변경은 새 버전.
- **페이지네이션**: 커서 기반 (타임라인 노드는 위치 순, 프로젝트는 최근 편집 순).
- **스트리밍**: AI 생성용 SSE 엔드포인트 (`/api/v1/nodes/{id}/generate`). 비스트리밍 작업은 표준 POST.

### 3.3 컴포넌트 개요

API 서버의 도메인 모듈:

| 모듈 | 책임 | 크리티컬 패스 |
|------|------|--------------|
| **auth** | OAuth2 흐름, JWT 발급/검증, 세션 관리 | 로그인, 모든 인증 요청 |
| **project** | 프로젝트 CRUD, config 관리, 파일 임포트 파싱 | 프로젝트 생성, config 업데이트 |
| **timeline** | 노드 CRUD, 트랙 관리, 정렬, 분기/합류 연결, 수직 정렬 | 노드 조작, 드래그앤드롭 |
| **character** | 캐릭터 CRUD, 관계 관리, 캐릭터 카드 | 캐릭터 맵 상호작용 |
| **generation** | 컨텍스트 어셈블리, LLM 프롬프트 구성, provider adapter 오케스트레이션, 스트리밍, 요약 생성 | AI 초안 생성 (핵심 가치) |
| **editor** | 초안 저장, 방향 기반 편집 오케스트레이션, 텍스트 버전 관리 | 에디터 상호작용 |
| **structuring** | 입력 분석, 자동 구조화 파이프라인 (텍스트/파일 -> Config + Timeline + Characters) | 프로젝트 생성 (첫인상) |

**모듈 의존성** (내부 방향만):
- `generation`은 `project`, `timeline`, `character`에 의존 (프롬프트 어셈블리용 컨텍스트 읽기)
- `structuring`은 `project`, `timeline`, `character`에 의존 (초기 구조 쓰기)
- `editor`는 `timeline`, `generation`에 의존 (노드 데이터 읽기, 재생성 트리거)
- 모든 모듈이 `auth`에 의존 (미들웨어)

`generation` 모듈이 크리티컬 패스 — 여러 모듈에서 컨텍스트를 오케스트레이션하고 SSE 스트리밍 연결을 관리. 스케일링 필요 시 최우선 추출 후보.

---

## 4. 데이터 아키텍처

### 4.1 데이터 흐름

**흐름 1: 아이디어 -> 자동 구조화된 프로젝트 (핵심 온보딩)**

```
사용자 입력 (텍스트 또는 파일)
  -> API: structuring 모듈이 입력 파싱
  -> LLM provider adapter: Config + Timeline + Characters를 요청하는 구조화 프롬프트
  <- LLM 응답 (스트리밍): 구조화된 JSON
  -> API: 단일 DB 트랜잭션으로 기록
    -> project 레코드 (config 값)
    -> track 레코드
    -> node 레코드 (위치, 트랙 할당)
    -> character 레코드
    -> relationship 레코드
  -> 응답: 완전한 워크스페이스 상태
```

일관성: Strong. 모든 쓰기가 단일 DB 트랜잭션. 클라이언트가 완전한 워크스페이스 상태를 수신.

**흐름 2: 노드 -> AI 초안 생성 (핵심 가치 전달)**

```
사용자가 노드에서 "초안 생성" 클릭
  -> API: generation 모듈이 컨텍스트 어셈블리
    -> 읽기: 프로젝트 config (DB, Redis 캐시)
    -> 읽기: 노드 상세 (DB)
    -> 읽기: 할당된 캐릭터의 카드 + 관계 (DB, 캐시)
    -> 읽기: 선행 노드의 압축 요약 (DB/캐시)
    -> 읽기: 다른 트랙의 동시 노드 (DB)
    -> 읽기: 다음 노드 제목 + 요약 (DB)
  -> 구조화된 프롬프트 조립 (템플릿 + 전체 컨텍스트)
  -> LLM provider adapter: 스트리밍 요청
  <- SSE 스트림: LLM의 토큰
  -> API: SSE 스트림을 클라이언트로 프록시
  -> 클라이언트: 에디터에서 점진적 렌더링
  -> 스트림 완료 시:
    -> 전체 초안 텍스트를 DB에 저장
    -> 노드 상태를 "AI 초안"으로 업데이트
    -> 비동기: 압축 요약 생성
      -> LLM provider adapter: 요약 요청 (경량 모델)
      -> 요약을 DB + 캐시에 저장
```

일관성: 초안 쓰기는 Strong (단일 행 upsert). 요약 생성은 Eventually consistent (비동기, 논블로킹).

**흐름 3: 방향 기반 편집 (부분 재생성)**

```
사용자가 텍스트 선택 + 방향 입력 ("더 긴장감 있게")
  -> API: 선택 범위 + 방향 + 전체 초안 수신
  -> API: 컨텍스트 어셈블리 (흐름 2와 동일)
    + 원본 전체 초안 텍스트
    + 선택된 텍스트 범위
    + 사용자 방향 지시
  -> LLM provider adapter: 스트리밍 요청
  <- SSE 스트림: 선택 범위만의 대체 텍스트
  -> 클라이언트: 선택 영역을 스트리밍 출력으로 대체
  -> 완료 시: 업데이트된 초안을 DB에 저장
```

### 4.2 저장소 전략

| 저장소 | 데이터 | 선택 이유 | 일관성 | 보존 |
|--------|--------|-----------|--------|------|
| **Neon (PostgreSQL)** | 프로젝트, 노드, 트랙, 연결, 캐릭터, 관계, 초안, 요약, 사용자 | 관계형 — 엔티티 간 풍부한 관계. 워크스페이스 상태의 ACID 트랜잭션. | Strong | 무기한 |
| **Upstash Redis** | 조립된 프롬프트 컨텍스트 캐시, 레이트 리밋 카운터, refresh token 블록리스트 | Key-value — 반복 컨텍스트 어셈블리의 빠른 읽기. 레이트 리밋의 원자적 카운터. | Eventual (캐시) | TTL 기반: 컨텍스트 15분, 레이트 리밋 1분 |
| **Cloudflare R2** | 임포트 파일, 캐릭터 프로필 이미지, 내보낸 원고 [Phase 2] | 객체 저장소 — 바이너리 블롭, presigned URL 직접 업로드, 이그레스 비용 없음. | Eventual | 무기한 |

**별도 벡터 저장소를 사용하지 않는 이유**: Phase 1은 시맨틱 검색이나 RAG를 사용하지 않는다. LLM은 관계형 쿼리로 조립된 구조화된 컨텍스트를 받는다. Phase 3+ 리비전 도구에 시맨틱 유사도 검색이 필요하면 별도 벡터 DB 대신 Neon에 pgvector 확장을 추가한다.

### 4.3 캐싱 전략

| 캐시 데이터 | 저장소 | TTL | 무효화 | 근거 |
|-------------|--------|-----|--------|------|
| 조립된 프롬프트 컨텍스트 (config + 캐릭터 데이터) | Redis | 15분 | config 또는 캐릭터 업데이트 시 명시적 삭제 | 편집 사이 안정적. 세션 내 반복 생성에서 재쿼리 방지. |
| 노드 요약 | Redis + DB (원본) | 1시간 | 해당 노드의 초안 변경 시 | 요약 생성 비용 높음 (LLM 호출). 하위 생성의 재계산 방지. |
| 사용자 세션 | Redis | 7일 (refresh token 수명) | 로그아웃 또는 토큰 순환 시 | 요청마다 DB 조회 없이 빠른 인증 검증. |

---

## 5. 인프라 & 배포

### 5.1 컴퓨팅 플랫폼

| 컴포넌트 | 플랫폼 | 리전 | 근거 |
|----------|--------|------|------|
| API 서버 | GCP Cloud Run | us-east4 (Virginia) | 컨테이너 기반, 자동 확장, scale-to-zero. LLM 스트리밍용 300초 요청 타임아웃. Neon(us-east-1)과 동일 지역 (~1-3ms 크로스 클라우드 지연). |
| 웹 클라이언트 | Cloudflare Workers/Pages | 글로벌 엣지 | 정적 자산 + SSR at edge. TanStack Start가 Vinxi/Nitro로 Workers에 네이티브 배포. |

**Cloud Run 선택 이유**:
- **vs. Cloud Functions**: 기본 60초 타임아웃(최대 540초). LLM 스트리밍에 300초 필요.
- **vs. GKE**: 1인 개발자에게 Kubernetes 운영 부담 불필요.
- **vs. Cloudflare Workers (API용)**: 30초 CPU 시간 제한. 컨텍스트 어셈블리 + 스트리밍 초과.

**스케일링 모델**:
- API 서버: min 0, max 10 인스턴스. 인스턴스당 동시 요청 80 타겟. 비활성 시 scale-to-zero.
- 콜드 스타트 예산: <2초 (Rust 바이너리는 Cloud Run에서 ~500ms 콜드 스타트).

### 5.2 배포 전략

```
PR 머지 -> GitHub Actions
  -> cargo build --release (멀티 스테이지 Docker)
  -> cargo test (유닛 + 통합)
  -> 컨테이너 이미지를 Artifact Registry에 푸시
  -> gcloud run deploy (롤링 업데이트, 트래픽 마이그레이션)
  -> 헬스 체크: /health가 200 반환
  -> 롤백: gcloud run services update-traffic (즉시, 이전 리비전)
```

Cloud Run은 이전 리비전을 유지. 롤백은 트래픽 분할 작업(<5초), 재배포가 아님.

### 5.3 환경 토폴로지

| 환경 | 인프라 | 목적 |
|------|--------|------|
| 로컬 개발 | Docker Compose (PostgreSQL, Redis) + `cargo run` + Ollama (로컬 LLM) | 개발. Docker로 로컬 DB, API는 네이티브 실행으로 빠른 반복. Ollama로 무료 LLM. |
| 스테이징 | Cloud Run (스테이징 서비스) + Neon 브랜치 + Gemini/Claude API 키 | 프로덕션 전 검증. |
| 프로덕션 | Cloud Run + Neon main + Gemini/Claude API 키 | 라이브 서비스. |

로컬 개발은 Docker Compose로 PostgreSQL, Redis 실행 — 클라우드 의존 없이 오프라인 개발 가능. 스테이징과 프로덕션은 Neon 브랜치로 별도 DB 프로비저닝 없이 동일 스키마 사용.

---

## 6. 횡단 관심사

### 6.1 인증 & 인가

**인증 흐름**: Google OAuth2 -> 자체 발급 JWT

```
클라이언트 -> Google OAuth2 동의 화면
  -> Google 콜백 (auth code)
  -> API: code를 Google 토큰으로 교환
  -> API: DB에서 사용자 생성/조회
  -> API: access token (JWT, 15분) + refresh token (불투명, 30일, httpOnly 쿠키) 발급
  -> 클라이언트: access token을 메모리에 저장
```

**토큰 수명**:
- Access token: JWT, 15분 만료, RS256 서명. `user_id`, `email` 포함.
- Refresh token: 불투명 랜덤 문자열, 30일, httpOnly + Secure + SameSite=Strict 쿠키. Redis에 저장. 사용 시마다 순환 (이전 토큰 무효화).

**인가 모델**: 소유권 기반. 사용자는 자신의 프로젝트만 접근. 쿼리 수준(`WHERE user_id = $1`)과 미들웨어에서 검증. RBAC 없음 — 역할 없는 단일 사용자 제품.

### 6.2 관측성

**로깅**:
- 구조화된 JSON → stdout (Cloud Run → Cloud Logging)
- 필드: `timestamp`, `level`, `request_id`, `user_id`, `module`, `message`, `duration_ms`
- AI 전용: 모든 LLM 호출에 `model`, `token_count_input`, `token_count_output`, `cost_usd`, `generation_type`

**메트릭** (Cloud Monitoring):
- 엔드포인트별 RED (rate, errors, duration)
- AI 전용: 생성/분, 평균 토큰/생성, 비용/사용자/일, TTFT
- 비즈니스: 프로젝트 생성/일, 초안 있는 노드/일

**알림**:
- 에러율 > 5% (5분간)
- p99 지연 > 10초 (비생성 엔드포인트)
- LLM adapter 에러율 > 10%
- 일일 AI 비용 > $50

**트레이싱**: Phase 1에 불필요 (modular monolith — 단일 프로세스). 서비스 추출 시 OpenTelemetry 추가.

### 6.3 에러 처리 & 복원력

**LLM 생성 실패** (가장 중요한 경로):
- 재시도: LLM 제공자의 5xx에 2초 백오프로 1회 자동 재시도
- 폴백: adapter가 Gemini 실패 시 Claude로 전환
- 사용자 대면: "이 장면을 생성할 수 없습니다. 연결을 확인하고 다시 시도하세요." + 재시도 버튼
- 부분 초안 보존: 스트림 중간 중단 시 수신된 내용 저장

**타임아웃 예산**:

| 경로 | 타임아웃 | 근거 |
|------|---------|------|
| LLM adapter → Provider (장면 생성) | 120초 | 스트리밍 포함 긴 생성 |
| LLM adapter → Provider (요약, 구조화) | 60초 | 짧은 비스트리밍 |
| API → Neon | 5초 | DB 쿼리는 빠라야 함 |
| API → Redis | 1초 | 캐시 미스는 DB로 폴스루 |
| 클라이언트 → API (생성) | 150초 | 스트리밍 위 오버헤드 포함 |
| 클라이언트 → API (CRUD) | 10초 | 표준 작업 |

### 6.4 보안

- **전송**: TLS 1.3. Cloudflare가 엣지에서 TLS 종료. Cloud Run이 HTTPS 강제.
- **저장 시 암호화**: Neon AES-256. R2 저장 시 암호화. 이메일 외 민감 PII 없으므로 컬럼 레벨 암호화 불필요.
- **시크릿**: `pulumi config set --secret`. 시크릿: DB 연결 문자열, OAuth 클라이언트 시크릿, JWT 서명 키, LLM API 키.
- **입력 검증**: `validator` 크레이트로 모든 입력 검증. 텍스트 입력 최대 10K 자, 파일 최대 10MB.
- **레이트 리밋**: Upstash Redis. CRUD 사용자당 100요청/분. 생성 사용자당 10회/분. AI 비용 남용 방지.

### 6.5 테스트 아키텍처

**전략**: 유닛 중심 피라미드. 도메인 로직(컨텍스트 어셈블리, 프롬프트 구성, 노드 정렬)이 순수하고 광범위하게 유닛 테스트됨.

| 계층 | 대상 | 방법 | 목표 |
|------|------|------|------|
| 유닛 | 도메인 로직: 컨텍스트 어셈블리, 노드 정렬, 프롬프트 템플릿, 검증 | `cargo test` — 순수 함수, 모킹 불필요 (hexagonal 포트가 도메인을 의존성 없이 만듦) | 도메인 모듈 80%+ 커버리지 |
| 통합 | DB 어댑터 (SQLx 쿼리), LLM 게이트웨이 클라이언트, R2 클라이언트 | `cargo test` + Neon 브랜치 + provider adapter 테스트 설정 | 모든 어댑터 경계 |
| E2E | 핵심 여정: 프로젝트 생성 → 자동 구조화 → 초안 생성 → 편집 | Playwright + 스테이징 | 크리티컬 흐름 3개 |
| AI 품질 | 생성 출력 품질, 요약 충실도, 한국어 산문 자연스러움 | LLM-as-judge 평가 (장르 3개, 시나리오 50개) | 주간, PR당 아님 |

### 6.6 성능 & 확장성

**예상 부하 프로필**:
- 출시: 100-500 DAU, ~5명 동시, ~500 생성/일
- 성장: 5K-10K DAU, ~50명 동시, ~5K 생성/일
- 피크: KST 저녁 (7-11 PM), 평균의 3배

**병목과 완화**:

| 병목 | 영향 | 완화 |
|------|------|------|
| 컨텍스트 어셈블리 (다수 DB 쿼리) | LLM 호출 전 지연 | Redis에 캐시 (15분 TTL). 배치 쿼리 (N+1 대신 2개 쿼리로 전체 캐릭터 + 관계). |
| LLM 생성 (15-30초) | 사용자 차단 | SSE 스트리밍 (TTFT <2초). 안정 프리픽스 프롬프트 캐싱. Phase 2 모델 캐스케이딩. |
| 초안 저장 후 요약 생성 | 저장 응답 차단 가능 | 내부 이벤트 버스로 비동기. 실패 시 다음 접근에서 재시도. |

---

## 7. 통합 포인트

| 외부 시스템 | 제공 | 프로토콜 | 실패 모드 | SLA 의존성 |
|------------|------|---------|----------|-----------|
| **Google AI (Gemini)** | 텍스트 생성 (primary), 요약 | HTTPS via `GeminiAdapter` | Claude로 폴백. 모두 실패 시 재시도 표시. | 높음 — 핵심 기능. ~99.9%. |
| **Anthropic (Claude)** | 텍스트 생성 (fallback), 품질 중요 작업 | HTTPS via `AnthropicAdapter` | 양쪽 모두 실패 시 재시도 표시. | 중간 — 보조 제공자. ~99.9%. |
| **Google OAuth2** | 사용자 인증 | HTTPS (OAuth2 코드 흐름) | 로그인 실패. 기존 세션 영향 없음. | 낮음 — 새 로그인만. |
| **Neon** | PostgreSQL DB | TCP via pooler | 모든 데이터 작업 실패. 자동 저장 재시도 큐. | 치명적 — 99.95% SLA. |
| **Upstash Redis** | 캐싱, 레이트 리밋 | HTTP/TCP | 캐시 미스가 DB로 폴스루. 레이트 리밋 일시 비활성. | 낮음 — 느리지만 고장 아님. |
| **Cloudflare R2** | 파일 저장소 | S3 호환 HTTPS | 업로드/다운로드 실패. 핵심 기능 영향 없음. | 낮음 — 보조 진입 경로. |

---

## 8. 리스크 & 미결 질문

### 8.1 기술적 리스크

| 리스크 | 영향 | 가능성 | 완화 |
|--------|------|--------|------|
| 15+ 노드에서 컨텍스트 어셈블리 프롬프트가 LLM 컨텍스트 윈도우 초과 | 생성 품질 저하 또는 절삭 | 중간 | 토큰 예산 관리: 컨텍스트 16K 토큰, 가장 오래된 요약부터 절삭. 생성당 총 토큰 모니터링. |
| SSE 스트리밍이 긴 생성 중 연결 끊김 | 불완전한 초안 | 낮음 | Cloud Run이 SSE 네이티브 지원. 300초 타임아웃. 클라이언트 재연결 + 마지막 수신 위치. 서버에 부분 초안 저장. |
| 한국어 산문 품질이 "수정할 가치" 임계값 미달 | 핵심 가치 제안 실패 | 중간 | 출시 전: 3개 장르 50+ 장면 타겟 사용자 테스트. Adapter로 Gemini/Claude 간 전환. 장르별 프롬프트 엔지니어링. |

### 8.2 미결 질문

1. **로컬 개발용 Ollama 모델 선정.** 무료 로컬 반복에 적합한 한국어 산문 품질의 모델은? 후보: llama3, gemma2, EEVE-Korean. *필요: 로컬 품질 벤치마킹.*

2. **20+ 노드에서 요약 압축 충실도.** 복합 요약(요약의 요약)이 서사적 디테일을 유지하는가? *필요: 25노드 원고로 테스트, 모순 비율 측정.*

3. **Notion .zip 임포트 깊이.** Notion 내보내기의 복잡한 내부 구조를 얼마나 깊이 파싱? *MVP: 텍스트 콘텐츠만 추출, Notion 고유 구조(데이터베이스, 토글) 무시.*

---

## 9. Architecture Decision Records (ADRs)

### ADR-1: 백엔드 언어 — Rust (Axum)

- **상태**: Accepted
- **컨텍스트**: AI 생성용 SSE 스트리밍, 낮은 요청당 비용(1인 개발자 경제성), 코드 리뷰 없는 솔로 개발자를 위한 컴파일 타임 안전성이 필요.
- **결정**: Rust + Axum 프레임워크, GCP Cloud Run.
- **고려한 대안**:
  - **FastAPI (Python)**: 기각. 초기 FastAPI 스캐폴딩이 있었고 Python은 성숙한 LLM 도구가 있지만, LLM API 호출은 단순 HTTP — Rust가 `reqwest` + `serde`로 처리. Python 런타임 오버헤드(50-100MB vs. Rust 10-30MB)와 느린 콜드 스타트가 인스턴스당 비용 증가.
  - **Hono (TypeScript)**: 기각. Cloudflare Workers의 30초 CPU 시간 제한이 장기 실행 생성 요청과 충돌.
- **결과**: (+) 서브밀리초 응답, 10-30MB 메모리, 거의 제로 콜드 스타트, 컴파일러가 오류 클래스 제거. (-) Python 대비 AI 도구 생태계 작음. 향후 기여자 학습 곡선 높음.

### ADR-2: 프론트엔드 프레임워크 — TanStack Start + SolidJS

- **상태**: Accepted
- **컨텍스트**: 멀티트랙 타임라인(드래그앤드롭, 노드 상태 업데이트, 패널 리사이징)과 스트리밍 텍스트 렌더링에 세밀한 반응성 필요.
- **결정**: TanStack Start (SSR) + SolidJS (반응형 UI), Cloudflare Workers 배포.
- **고려한 대안**:
  - **Next.js (React)**: 기각. React의 가상 DOM 디핑은 타임라인에 불필요한 오버헤드 — 단일 노드 상태 변경 시 해당 노드만 업데이트 필요. SolidJS의 세밀한 반응성이 이를 정밀하게 처리. React 생태계 이점(shadcn/ui, Radix)은 커스텀 디자인 시스템("Ink & Amber")이 있어 비중요.
- **결과**: (+) 작은 번들, 정밀 DOM 업데이트, 가상 DOM 오버헤드 없음. (-) 컴포넌트 생태계 작음. 일부 라이브러리(리치 텍스트 에디터)에 커스텀 SolidJS 구현 필요할 수 있음.

### ADR-3: 시스템 아키텍처 — Modular Monolith

- **상태**: Accepted
- **컨텍스트**: 1인 개발자, 초기 단계 제품. 운영 부담 없는 도메인 분리 필요.
- **결정**: 도메인 모듈(auth, project, timeline, character, generation, editor, structuring)로 구성된 단일 배포 Rust 바이너리. In-process 통신. 비동기 부작용용 내부 이벤트 버스.
- **고려한 대안**:
  - **Microservices**: 기각. 1인 개발자가 서비스 메시, 분산 트레이싱, 서비스 간 인증, 독립 배포 파이프라인을 유지할 수 없음.
  - **Serverless functions**: 기각. 15-30초 스트리밍이 함수 타임아웃 초과.
- **결과**: (+) 단순 배포, 모듈 간 네트워크 오버헤드 없음, 단일 Dockerfile. (-) 전체 단위로 스케일. 모듈 경계 준수에 규율 필요.

### ADR-4: 데이터베이스 — Neon (Serverless PostgreSQL)

- **상태**: Accepted
- **컨텍스트**: 풍부한 관계(프로젝트, 노드, 트랙, 캐릭터, 관계)의 관계형 모델링 필요. 글로벌 대상.
- **결정**: Neon, us-east-1 (Virginia).
- **고려한 대안**:
  - **Supabase (Seoul)**: 기각. 글로벌 대상이므로 Seoul 리전이 최적이 아님. Neon 브랜칭과 scale-to-zero가 1인 개발자 비용 모델에 더 적합.
  - **GCP Cloud SQL**: 기각. Scale-to-zero 없음 — 유휴 시 최소 ~$7/월.
  - **PlanetScale/Turso**: 기각. MySQL/SQLite 생태계. PostgreSQL(pgvector, 확장)이 AI 기능에 더 미래지향적.
- **결과**: (+) Scale-to-zero, dev/staging 브랜칭, 풀 PostgreSQL, pgvector 준비. (-) 크로스 클라우드 지연(Neon AWS, API GCP) — 동일 지역 공존으로 완화(~1-3ms).

### ADR-5: 컴퓨팅 플랫폼 — GCP Cloud Run

- **상태**: Accepted
- **컨텍스트**: 자동 확장, scale-to-zero, LLM 스트리밍용 300초 요청 타임아웃이 있는 컨테이너 호스팅 필요.
- **결정**: API 서버용 GCP Cloud Run. 프론트엔드용 Cloudflare Workers/Pages.
- **고려한 대안**:
  - **AWS Lambda/Fargate**: 기각. Cloud Run이 더 단순한 가격, 네이티브 컨테이너 지원, 관대한 무료 티어(200만 요청/월).
  - **Fly.io**: 기각. Cloud Run보다 덜 성숙. GCP 생태계(Pub/Sub, Cloud Tasks, Cloud Logging)가 향후 성장에 더 나은 플랫폼 응집력.
- **결과**: (+) Scale-to-zero, 300초 타임아웃, 자동 확장, GCP 생태계. (-) 콜드 스타트(~500ms, 허용 가능). 컨테이너화로 벤더 락인 완화.

### ADR-6: 인증 — Google OAuth2 + 자체 발급 JWT

- **상태**: Accepted
- **컨텍스트**: 글로벌 대상, 1인 개발자 — 가장 넓은 도달 범위의 가장 단순한 인증.
- **결정**: Google OAuth2로 ID. 자체 발급 JWT (RS256)로 세션. httpOnly 쿠키에 refresh token.
- **고려한 대안**:
  - **Auth0/Clerk**: 기각. 비용($23+/월) + 중요 외부 의존성. 단일 OAuth 제공자는 직접 구현이 간단.
  - **Supabase Auth**: 기각. Neon을 DB로 사용 중인데 Supabase 의존성 추가.
  - **Kakao + Naver OAuth**: 연기 — 아키텍처 변경 없이 추가 제공자로 나중에 추가 가능.
- **결과**: (+) 비용 없음, 완전한 제어, 인증 서드파티 의존성 없음. (-) 토큰 순환과 리프레시 흐름 직접 구현 필요.

### ADR-7: LLM 통합 — Rust Provider Adapter + SSE Streaming

- **상태**: Accepted
- **컨텍스트**: PRD가 폴오버와 비용 추적이 있는 provider-agnostic LLM을 요구. Narrex는 2개 제공자(Gemini primary, Claude secondary) + 로컬 개발용 Ollama만 사용. 생성은 스트리밍 필수.
- **결정**: Hexagonal `LlmPort` trait에 구체 adapter(`GeminiAdapter`, `AnthropicAdapter`, `OllamaAdapter`). 모든 LLM 호출은 API 서버 프로세스 내부에서 수행. API에서 클라이언트로 SSE 스트리밍.
- **고려한 대안**:
  - **LiteLLM (Python 게이트웨이)**: 기각. 별도 Cloud Run 서비스, Python 의존성, LLM 호출당 ~50ms 네트워크 홉 추가. 100+ 제공자 지원 — 2개 제공자에는 과잉. 폴오버, 비용 추적, 재시도 로직은 Rust로 직접 구현 가능.
  - **직접 API 호출 (추상화 없이)**: 기각. 제공자 락인. 폴오버 없음. 통합 비용 추적 없음.
- **결과**: (+) 단일 배포 바이너리. Python 의존성 없음. LLM 호출 네트워크 오버헤드 제로. trait으로 타입 안전한 제공자 전환. (-) 제공자별 스트리밍 API를 Rust로 직접 구현 필요 (~1주, `reqwest` + `async-stream` 사용, 어댑터 3개).

---

## 10. AI/LLM 아키텍처

### 10.1 LLM 통합 패턴

**Hexagonal Provider Adapter** — LLM 호출은 Rust trait(`LlmPort`)으로 추상화, 제공자별 구체 adapter 구현.

```rust
// Port (도메인 경계)
trait LlmPort: Send + Sync {
    async fn generate_stream(&self, prompt: StructuredPrompt) -> Result<impl Stream<Item = Token>>;
    async fn generate(&self, prompt: StructuredPrompt) -> Result<String>;
}

// Adapter (인프라)
struct GeminiAdapter { /* reqwest client, API key */ }    // Primary — 비용 최적화
struct AnthropicAdapter { /* reqwest client, API key */ }  // Secondary — 품질 폴백
struct OllamaAdapter { /* local endpoint */ }              // 로컬 개발 전용
```

**제공자 라우팅**:
- **Gemini** (primary): 모든 생성 작업. 한국어 산문 최적 비용/품질 비율.
- **Claude** (fallback): Gemini 실패 시 또는 품질 중요 작업에 활성화.
- **Ollama** (local): 개발 전용. API 비용 없이 자유로운 반복.

**모델 캐스케이딩 [Phase 2]**: 작업 유형별 라우팅:

| 작업 | 모델 티어 | 예시 |
|------|-----------|------|
| 인라인 제안 | 경량 ($) | Gemini Flash |
| 장면 생성 | 중간 ($$) | Gemini Pro |
| 구조 계획 / 품질 중요 | 프론티어 ($$$) | Claude Sonnet |

Phase 1은 모든 작업에 Gemini Pro 사용, 실패 시 Claude 자동 폴백.

### 10.2 스트리밍 아키텍처

**프로토콜**: SSE (Server-Sent Events)

- **API 서버**: Axum `Sse` 응답 + `async-stream`. Adapter가 토큰을 직접 클라이언트로 스트리밍, 토큰 카운팅만 버퍼링.
- **클라이언트**: `fetch()` + `ReadableStream`. 각 토큰에 SolidJS 시그널 업데이트로 반응형 에디터 렌더링.
- **타임아웃**: Cloud Run 300초. 클라이언트 150초 + 재연결 로직.

**SSE가 WebSocket보다 나은 이유**: SSE는 무상태, HTTP 네이티브, 서버리스와 호환. WebSocket은 양방향 실시간(협업, 음성)에만 정당화 — 여기서는 해당 없음.

### 10.3 컨텍스트 어셈블리 파이프라인

시각적 구조를 효과적인 프롬프트로 변환하는 파이프라인. 모든 생성 요청에 실행.

```
컨텍스트 어셈블리 파이프라인
===========================

1. 프로젝트 Config (예산: ~500 토큰)
   장르, 테마, 시대/배경, 시점, 분위기

2. 현재 노드 (예산: ~1K 토큰)
   제목, 줄거리 요약, 장소, 분위기 태그

3. 캐릭터 — 이 장면에 관련된 것만 필터 (예산: ~2K 토큰)
   이름, 성격, 외모, 비밀, 동기
   + 할당된 캐릭터 간 관계

4. 서사 컨텍스트 (예산: ~11K 토큰, 유동적)
   선행 노드의 압축 요약
   타임라인 위치 순 정렬

5. 병렬 컨텍스트 (예산: ~1K 토큰)
   다른 트랙의 동시 이벤트
   (수직 정렬 노드)

6. 전방 컨텍스트 (예산: ~500 토큰)
   다음 노드 제목 + 요약 (있을 경우)

   ============> 구조화된 프롬프트 템플릿
   ============> LLM Adapter (스트리밍)
```

**토큰 예산 관리**:
- 총 컨텍스트 예산: 16K 토큰 (생성 출력 여유 확보)
- 우선순위: Config > 현재 노드 > 캐릭터 > 전방 > 병렬 > 서사
- 서사 요약 초과 시 가장 오래된 것부터 절삭 (먼 사건일수록 관련성 낮음)

### 10.4 요약 압축

초안 저장 시 압축 요약을 비동기 생성:

```
초안 텍스트 (1,500-3,000자)
  -> LLM (경량 모델): "서사 컨텍스트용 요약"
  -> 요약 (200-400자):
     - 무슨 일이 일어났는가 (플롯 진행)
     - 누가 관여했는가 (캐릭터 행동)
     - 무엇이 바뀌었는가 (관계, 새 정보, 감정 상태)
     - 무엇이 설정되었는가 (잠재적 복선)
  -> DB + Redis에 저장 (1시간 TTL)
```

**품질 리스크**: 복합 요약은 20+ 노드에서 디테일 손실. Phase 1 완화: 요약의 요약 대신 풀 요약 사용. 토큰 사용량 모니터링. 예산 초과 시 계층형 압축: 최근 5개 노드 풀 요약, 오래된 노드 초압축.

### 10.5 비용 최적화

| 전략 | Phase | 예상 효과 |
|------|-------|-----------|
| 프롬프트 캐싱 (안정 프리픽스: config + 캐릭터 데이터) | Phase 1 | 반복 생성 20-40% 비용 감소 |
| 요약 압축 (200-400자 vs. 3K자 초안) | Phase 1 | 서사 컨텍스트 토큰 5-10배 감소 |
| 요약용 경량 모델 | Phase 1 | 장면 생성 비용의 ~10%로 요약 |
| 작업 유형별 모델 캐스케이딩 | Phase 2 | 인라인 제안 70-80% 감소 |
| 유사 프롬프트 시맨틱 캐싱 | Phase 3+ | 공통 장면 패턴 30-50% 감소 |

### 10.6 가드레일

**입력 검증**:
- 텍스트 입력: 최대 10K 자 (과대 입력을 통한 프롬프트 인젝션 방지)
- 파일 임포트: 최대 10MB, 검증된 파일 유형만
- 규칙 기반 필터: 시스템 프롬프트 인젝션 패턴 거부

**출력 검증**:
- 길이 검사: 예상의 2배 초과 시 절삭 + 경고
- PII 감지 불필요 (창작 소설)
- 사실성 검증 불필요 (창작 생성)

**콘텐츠 안전**: LLM 제공자 내장 안전 필터에 의존. 과도한 필터링은 창작 소설 사용성을 해침. 한 제공자가 창작 콘텐츠를 부적절하게 차단하면 Adapter가 대체 제공자로 라우팅.

### 10.7 AI 전용 관측성

| 메트릭 | 수집 | 알림 임계값 |
|--------|------|------------|
| 요청당 토큰 사용량 (입력/출력) | 모든 LLM 호출에 로깅 | — (모니터링) |
| 요청/사용자/일별 비용 | 토큰 로그에서 집계 | > $5/사용자/일 |
| Time-to-first-token (TTFT) | 첫 SSE 이벤트 타임스탬프 | > 5초 (p95) |
| 생성 실패 | Adapter 에러 카운트 | > 10% (5분간) |
| 컨텍스트 어셈블리 시간 | 파이프라인 타이머 | > 500ms (p95) |

---

## 11. Phase별 구현 요약

### Phase 1: 핵심 루프 MVP

**컴포넌트**:
- API 서버: auth, project, timeline, character, generation, editor, structuring 모듈
- LLM adapter: GeminiAdapter (primary) + AnthropicAdapter (fallback) + OllamaAdapter (로컬 개발)
- 웹 클라이언트: 대시보드, 프로젝트 생성, 워크스페이스 (Config Bar, 타임라인, 캐릭터 맵, 에디터, 노드 상세)

**인프라**:
- GCP Cloud Run (API 서버 — 단일 서비스)
- Neon PostgreSQL (us-east-1)
- Cloudflare Workers/Pages (프론트엔드)
- Upstash Redis (캐시, 레이트 리밋)
- Cloudflare R2 (파일 저장)

**핵심 ADR**: 전체 (ADR-1 ~ ADR-7)

**AI**: 단일 모델 생성, SSE 스트리밍, 전체 컨텍스트 어셈블리 파이프라인, 요약 압축, 프롬프트 캐싱

### Phase 2: 에피소드 레이어 + 폴리시

**신규 컴포넌트**:
- 에피소드 구성 모듈 (API) — 이벤트-에피소드 매핑, 구분선, 글자수
- AI 채팅 패널 (컨텍스트 인식 어시스턴트)
- 내보내기 모듈 (DOCX, EPUB, 일반 텍스트)
- 초안 변형 (장면당 2-3개) + 비교 UI
- 톤/스타일 슬라이더
- 복선 연결선
- 인라인 자동완성
- 장르 템플릿 갤러리
- 온보딩 튜토리얼

**신규 통합**:
- Adapter config의 모델 캐스케이딩 (Gemini Flash / Gemini Pro / Claude Sonnet)
- 백그라운드 생성용 Batch API (내보내기 준비)
- GCP Cloud Tasks (백그라운드 작업)

### Phase 3+: 깊이 + 즐거움

**신규 컴포넌트**:
- 월드 맵 모듈 + UI (실제/가상 지도)
- 시간적 관계 추적 (스토리 시간에 따른 관계 변화)
- 리비전 도구 (캐릭터 일관성, 복선 검증, 모순 감지, 스타일 검토)
- AI Surprise 모드
- AI 갭 감지 (빠진 장면 제안)
- AI 캐릭터/관계 제안

**신규 통합**:
- Neon에 pgvector 확장 (리비전 도구용 시맨틱 검색)
- Redis 벡터 검색을 통한 시맨틱 캐싱

**인프라 평가**:
- pgvector 한계 시 전용 벡터 저장소
- 대규모 원고의 이벤트 기반 리비전 처리용 GCP Pub/Sub
