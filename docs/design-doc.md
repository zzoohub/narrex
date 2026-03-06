# Narrex — Software Architecture Design Document

**Status:** Draft
**Author:** zzoo
**Date:** 2026-03-07
**PRD Reference:** docs/prd-phase-1.md (Phase 1), docs/prd.md (Full Vision)

---

## 1. Context & Scope

### 1.1 Problem Statement

Aspiring Korean web novel writers have stories in their heads but cannot turn them into manuscripts. The bottleneck is not ideas — it is structuring dozens of events, maintaining consistency across chapters, and producing thousands of characters of prose per scene. Existing tools operate at the wrong unit of work: sentence-level autocomplete or fully automated generation with no author control.

Narrex is a visual novel editor where stories are timelines of event nodes, not blank pages. Authors set up characters, relationships, and plot points on an interactive multi-track timeline, then generate AI prose scene by scene. The visual structure automatically assembles into AI prompts — no prompt engineering required.

Phase 1 validates the core loop: idea input -> auto-structuring -> visual timeline editing -> AI scene generation -> direction-based editing.

### 1.2 System Context Diagram

![System Context](diagrams/system-context.svg)

**Actors:**
- **Writer** — primary user. Interacts via desktop web browser (>=1280px).
- **LLM Providers** — OpenAI, Anthropic, Google. Receive assembled prompts, return streamed prose.
- **OAuth Providers** — Google, Kakao. Handle user authentication.

### 1.3 Assumptions

1. **Korean LLM prose quality is sufficient.** Frontier models produce Korean prose good enough to revise, not discard. If wrong: core product thesis fails.
2. **Single user per project.** No real-time collaboration. Multi-user is explicitly out of scope.
3. **Desktop-first.** Primary interaction on >=1280px screens. Mobile is out of scope.
4. **Beta scale.** Phase 1 targets 20-50 invited users. Architecture supports growth but doesn't need thousands of concurrent users at launch.
5. **AI cost ceiling.** Per-user AI cost must stay below ~$5/month at $12/month Basic pricing (40% cost ceiling).
6. **Provider switching is necessary.** The LLM landscape changes rapidly. The system must support switching providers without code changes.

---

## 2. Goals & Non-Goals

### 2.1 Goals

- Support the complete Phase 1 core loop (idea -> structure -> generate -> edit) with <30s generation latency
- Stream AI-generated text to the client as tokens arrive (SSE)
- Auto-assemble AI prompts from structured data (config, characters, timeline context) without user prompt engineering
- Handle projects with up to 50 timeline nodes across 5 parallel tracks without performance degradation
- Support provider-agnostic LLM integration (OpenAI, Anthropic, Google) switchable via configuration
- Track per-user AI token usage and cost
- Auto-save all user edits with <1s debounce, zero data loss

### 2.2 Non-Goals

- **Real-time collaboration** — single-user product, no WebSocket for collaborative editing
- **Mobile app** — desktop web only for Phase 1
- **Offline support** — requires server for AI generation and data persistence
- **Multi-region deployment** — single region sufficient for beta
- **Model fine-tuning** — use frontier models with prompt engineering
- **Self-hosted LLM in production** — Ollama for local dev only; production uses cloud providers
- **Episode organization layer** [Phase 2] — nodes map 1:1 to scenes in Phase 1
- **Export functionality** [Phase 2]
- **Revision tools** [Phase 3+]
- **World map** [Phase 3+]

---

## 3. High-Level Architecture

### 3.1 Architecture Style

**System Architecture: Modular Monolith + Async Background Tasks**

A single FastAPI backend service with internal domain module boundaries, plus Redis-backed background workers for non-blocking tasks. All LLM-facing user interactions use SSE streaming directly from the API process.

**Why Modular Monolith over Microservices:**
- Solo developer — operational simplicity is paramount
- All domains share the same database (no data isolation need)
- The domains (timeline, character, generation) are tightly coupled around the project aggregate
- A modular monolith can be extracted into services later if needed (Shopify pattern)

**Why Python (FastAPI) over Rust (Axum):**
- LLM integration is the core feature. Python's AI ecosystem (LiteLLM, tokenizers, structured output parsing) is significantly richer
- Streaming from LLM providers is well-tested in Python's async ecosystem (httpx + asyncio)
- Solo developer velocity matters more than per-request performance at beta scale
- Trade-off: higher memory/CPU per instance (~100MB vs ~10MB Rust), but acceptable for 20-50 users

**Code Structure: Hexagonal (Ports & Adapters)**
- Domain logic is pure Python, no framework dependencies
- Ports define interfaces (LLM provider, storage, etc.)
- Adapters implement ports (PostgreSQL, LiteLLM, R2, etc.)
- Swappable adapters enable: Ollama for local dev, cloud providers for production; in-memory for testing, PostgreSQL for production

### 3.2 Container Diagram

![Container Diagram](diagrams/container.svg)

| Container | Technology | Responsibility | Communication |
|---|---|---|---|
| **Web Client** | TanStack Start + SolidJS + Tailwind CSS v4 | Desktop-first SPA: timeline, character map, editor, config bar | REST + SSE to API |
| **API Server** | FastAPI + Uvicorn | Business logic, auth, data access, LLM orchestration, SSE streaming, context assembly | REST/SSE from client; HTTP to LLM Gateway; SQL to DB; Redis for cache/queue |
| **Background Worker** | ARQ (Python, Redis-backed) | Async tasks: node summary compression, file parsing | Consumes Redis queue; SQL to DB; HTTP to LLM Gateway |
| **LLM Gateway** | LiteLLM (self-hosted) | Provider-agnostic routing to OpenAI/Anthropic/Google. Failover, cost tracking, unified API | HTTP from API/Worker; HTTP to LLM providers |
| **PostgreSQL** | PostgreSQL 18 (Docker dev / Neon prod) | Primary data store: users, projects, timelines, characters, drafts, summaries | SQL from API/Worker |
| **Redis** | Redis 7 (Docker dev / Memorystore prod) | Task queue (ARQ), session cache, rate limiting | From API/Worker |
| **Object Storage** | Cloudflare R2 | Character profile images, imported files | Presigned URLs from API; direct upload from client |

### 3.3 Component Overview

The API server is organized into domain modules with clear boundaries:

**Auth Module**
- User registration, social login (Google, Kakao), JWT issuance/refresh
- Session management, rate limiting
- Dependency: none (other modules depend on auth context)

**Project Module**
- Project CRUD, config management (genre, tone, era, POV, mood)
- File import parsing (Notion .zip, .md, .txt)
- Auto-structuring orchestration (calls Generation module for LLM structuring)
- Dependency: Auth, Generation

**Timeline Module**
- Track CRUD (create, rename, delete parallel tracks)
- Node CRUD with ordering (add, delete, reorder within and across tracks)
- Node connections (sequential, branch, merge)
- Vertical alignment management (simultaneous events across tracks)
- Node state machine (Empty -> AI Draft -> Edited -> Needs Revision)
- Dependency: Auth, Project

**Character Module**
- Character CRUD with card fields (name, personality, appearance, secrets, motivation, image)
- Relationship CRUD (type, label, direction)
- Dependency: Auth, Project

**Generation Module** [Critical Path]
- Context assembly pipeline: gathers Config + Node details + Character cards + Relationships + Prior summaries + Next node preview + Simultaneous events
- LLM prompt construction and submission
- SSE token streaming to client
- Direction-based partial editing (selected text + direction -> regenerate selection)
- Node summary compression (background task after draft save)
- Dependency: Project, Timeline, Character, LLM Gateway (port)

**Editor Module**
- Draft persistence (save/load prose text per node)
- Character count tracking
- Config-change detection (mark nodes as "Needs Revision")
- Dependency: Auth, Project, Timeline

---

## 4. Data Architecture

### 4.1 Data Flow

**Flow 1: Project Creation (Idea -> Auto-Structure)**

```
User input (text or file)
  |
  v
API validates input
  |
  +--> [If vague] Return clarifying questions -> User answers -> Re-submit
  |
  +--> [If sufficient] Call LLM via gateway with structuring prompt
         |
         v
       Parse LLM response into:
         - ProjectConfig (genre, tone, era, POV, mood)
         - Tracks + Nodes (timeline structure)
         - Characters + Relationships
         |
         v
       Single DB transaction: create all entities
         |
         v
       Stream staged progress to client via SSE
         ("Finding characters...", "Building timeline...", "Done")
```

Consistency: strong — all entities created atomically. If LLM call fails, no partial state in DB.

**Flow 2: AI Draft Generation** [Critical Path]

```
Client: POST /api/nodes/{id}/generate
  |
  v
API assembles context:
  +-- Project config (genre, tone, era, POV)
  +-- Node details (title, plot summary, location, mood tags)
  +-- Character cards + relationships (for assigned characters)
  +-- Preceding node summaries (ordered, budget-limited)
  +-- Next node title + summary (if exists)
  +-- Simultaneous events from other tracks
  |
  v
Construct prompt from template + assembled context
  |
  v
Send to LLM Gateway (streaming)
  |
  v
Forward tokens to client via SSE as they arrive
  |
  v
On stream complete:
  +-- Save full draft to DB
  +-- Update node status to "AI Draft"
  +-- Enqueue background task: generate compressed summary
```

Consistency: draft saved after full generation completes. If stream interrupts, no partial draft in DB — client shows whatever was streamed, user can re-generate.

**Flow 3: Direction-Based Edit**

```
Client: POST /api/nodes/{id}/edit-with-ai
  Body: { selected_text, surrounding_context, direction }
  |
  v
API assembles scene context (same as generation, scoped to passage)
  |
  v
Construct editing prompt:
  "Rewrite this passage: [selected_text]
   Direction: [user direction, e.g., 'more tension']
   Keep consistent with: [surrounding context]"
  |
  v
LLM generates replacement text, streamed via SSE
  |
  v
Client replaces only the selected range
  |
  v
Save updated full draft to DB
```

### 4.2 Data Model

Core entities and their relationships (conceptual — not table schemas):

```
User
  |-- has many --> Project
                     |-- has one --> ProjectConfig
                     |-- has many --> Track
                     |                  |-- has many --> Node
                     |                                    |-- has one --> Draft
                     |                                    |-- has one --> NodeSummary
                     |                                    |-- has many --> NodeCharacter (join)
                     |-- has many --> NodeConnection (between nodes, across tracks)
                     |-- has many --> Character
                     |                  |-- has many --> CharacterRelationship
```

**Key entities:**

| Entity | Purpose | Key Fields |
|---|---|---|
| User | Account, auth | id, email, name, oauth_provider, oauth_id |
| Project | Top-level container | id, user_id, title, created_at, updated_at |
| ProjectConfig | Global story settings | project_id, genre, theme, era_location, pov, mood_tags[] |
| Track | Parallel storyline | id, project_id, label, sort_order |
| Node | Event on timeline | id, track_id, title, plot_summary, location, mood_tags[], status (empty/ai_draft/edited/needs_revision), time_position, sort_order |
| NodeConnection | Link between nodes | id, source_node_id, target_node_id, connection_type (sequential/branch/merge) |
| NodeCharacter | Node-character assignment | node_id, character_id |
| Draft | Prose text per node | id, node_id, content, character_count, generated_at, edited_at |
| NodeSummary | Compressed summary for context | id, node_id, summary_text, generated_at |
| Character | Story character | id, project_id, name, personality, appearance, secrets, motivation, image_url |
| CharacterRelationship | Link between characters | id, project_id, character_a_id, character_b_id, label, line_type (solid/dashed/arrowed) |
| GenerationLog | AI usage tracking | id, user_id, project_id, node_id, generation_type, model, provider, input_tokens, output_tokens, cost, latency_ms |

### 4.3 Storage Strategy

**PostgreSQL (Primary Data Store)**
- All transactional data: users, projects, configs, tracks, nodes, connections, characters, relationships, drafts, summaries, generation logs
- Strong consistency for all writes. Read-your-own-writes guaranteed.
- Retention: all user content retained indefinitely. Generation logs retained for 1 year.

**Redis (Cache + Queue)**
- Background task queue (ARQ)
- Session tokens (refresh token store)
- Rate limiting counters (sliding window)
- Cached components for context assembly (project config, character cards, node summaries)
- Consistency: eventual (cache). Tasks at-least-once delivery.
- TTL: cache entries 15min-1hr, session tokens 30 days

**Cloudflare R2 (Object Storage)**
- Character profile images, imported files (.md, .txt, .zip)
- S3-compatible API, no egress fees, presigned URLs for direct client upload
- Retained with project lifecycle. Deleted when project is deleted.

### 4.4 Caching Strategy

| Data | Cache Location | TTL | Invalidation |
|---|---|---|---|
| Project config | Redis | 1 hour | On config update |
| Character cards | Redis | 30 min | On character edit |
| Node summaries | Redis | Until regenerated | On draft change |
| Assembled context | Not cached | — | Changes with any upstream edit |
| Auth sessions | Redis | 30 days | Explicit logout / rotation |

Context assembly is the most latency-sensitive read path, but inputs change frequently. Caching individual components with targeted invalidation is more effective than caching the assembled result.

---

## 5. Infrastructure & Deployment

### 5.1 Compute Platform

**Production: GCP Cloud Run (asia-northeast3, Seoul)**

- API Server: containerized FastAPI. Min 1 instance (avoid cold starts), max 10.
- Background Worker: separate Cloud Run service. Min 0 (scale-to-zero), max 5.
- LLM Gateway: LiteLLM as a separate lightweight Cloud Run service.
- Request timeout: 300s for LLM-streaming endpoints, 60s default.

**Why Cloud Run:**
- FastAPI requires Python runtime — not compatible with Cloudflare Workers (V8 only)
- Auto-scaling without Kubernetes complexity
- Native support for SSE streaming with long timeouts
- GCP ecosystem alignment (Memorystore, Cloud Logging)
- Seoul region for Korean audience latency

**Why not alternatives:**
- Workers: V8-only, can't run Python
- Compute Engine: unnecessary for request-response workloads
- Lambda/Fargate: different cloud ecosystem, no advantage

### 5.2 Deployment Strategy

- **CI/CD:** GitHub Actions
- **Pipeline:** PR merge -> build container -> push to Artifact Registry -> deploy to Cloud Run (rolling update)
- **Database migrations:** Alembic, run as a pre-deploy CI step
- **Rollback:** Cloud Run revision-based instant rollback
- **Strategy:** Rolling update. Blue-green is overkill for beta scale.

### 5.3 Environment Topology

| Environment | API | DB | Redis | LLM |
|---|---|---|---|---|
| Local | Uvicorn (hot reload, port 8080) | Docker PostgreSQL 18 (port 5432) | Docker Redis 7 (port 6379) | Ollama (port 11434) |
| Production | Cloud Run (Seoul) | Neon (closest region) | GCP Memorystore | LiteLLM -> Cloud providers |

Staging environment deferred until team grows beyond solo developer.

---

## 6. Cross-Cutting Concerns

### 6.1 Authentication & Authorization

**Authentication:**
- Social login: Google OAuth2 + Kakao OAuth2 (essential for Korean market)
- Self-issued JWT:
  - Access token: 15 min expiry, in memory (client), sent via `Authorization` header
  - Refresh token: 30 days, httpOnly secure cookie, rotated on use
- No password-based auth — reduces attack surface, simplifies UX

**Authorization:**
- RBAC with two roles: `user` (default), `admin` (internal)
- Resource-level: users can only access their own projects
- Enforced at API middleware layer (FastAPI dependencies)

**Why social login only:** Target users universally have Kakao and Google accounts. Eliminates password management and credential stuffing risk. Trade-off: dependency on OAuth providers — mitigated by supporting multiple providers.

### 6.2 Observability

**Logging:**
- Structured JSON to stdout (12-factor)
- Fields: timestamp, level, request_id, user_id, module, message
- Aggregation: Cloud Logging (GCP native)

**Product Metrics (REQ-051, PostHog):**
- Project creation funnel (started -> input -> structured -> first generation -> first edit)
- AI generation count per user (daily/weekly/monthly)
- Text retention rate (% of AI text kept after editing)
- Session duration and frequency
- Node completion rate (% of nodes with edited drafts)

**AI-Specific Observability:**
- Per-request: model, provider, input/output tokens, cost, latency, TTFT
- Per-user: daily/weekly generation count, cumulative cost
- Stored in PostgreSQL `generation_log` table
- LiteLLM provides built-in cost tracking per request

**Alerting (minimal for beta):**
- Error rate > 5% over 5 minutes
- LLM gateway unavailable (all providers failing)
- Per-user daily cost exceeds $2

### 6.3 Error Handling & Resilience

**LLM calls (highest failure risk):**
- Retry: 2 retries with exponential backoff (1s, 3s) for transient errors (429, 500, 503)
- Timeout: 60s per LLM call (accounts for TTFT + 30s generation)
- Fallback: LiteLLM auto-failover to secondary provider
- Degradation: if all providers fail, clear error with retry button

**Database:**
- Connection pooling: SQLAlchemy async engine (pool_size=10, max_overflow=20)
- Retry on connection failure: 3 attempts with 500ms backoff

**Background tasks:**
- ARQ retry: 3 attempts with exponential backoff
- Summary generation failure is non-critical — context assembly works without summaries, just with lower quality

**Client-side:**
- Auto-save: debounce 1s, retry on failure, show "Offline — changes will sync" status
- SSE interruption: partial results displayed, user re-triggers generation

### 6.4 Security

**Transport:** TLS 1.3 via Cloud Run (managed)

**Data at rest:** Encrypted by default on all platforms (Neon, Memorystore, R2)

**Secret management:** Environment variables via Cloud Run, sourced from Pulumi config secrets

**Input validation:**
- All API inputs validated via Pydantic models
- File uploads: content-type validation, 10MB limit (files), 5MB (images)
- Text inputs: length limits on all fields
- LLM prompt injection: user input placed in designated template sections, never interpolated into system instructions

**Rate limiting (Redis sliding window):**
- Auth endpoints: 10 req/min per IP
- Generation endpoints: 30 req/hour per user
- General API: 100 req/min per user

**OWASP considerations:**
- SQL injection: prevented by SQLAlchemy parameterized queries
- XSS: SolidJS auto-escapes; CSP headers
- CSRF: JWT in Authorization header; SameSite=Strict on refresh cookie
- Denial of wallet: rate limiting on generation endpoints

### 6.5 Performance & Scalability

**Expected load (Phase 1 beta):**
- 20-50 users, 5-15 concurrent
- ~100 AI generations/day total
- ~500 API requests/day total

**Identified bottlenecks:**

| Bottleneck | Impact | Mitigation |
|---|---|---|
| AI generation latency (15-30s) | User waits | SSE streaming — user reads as text generates |
| Context assembly for large projects | Slower generation start | Summaries instead of full text; cache components; limit to most recent N summaries |
| Auto-structuring latency (10-30s) | Onboarding delay | Staged progress streaming via SSE |

**Scaling triggers (post-beta):**
- Cloud Run auto-scales on concurrent requests
- Neon auto-scales compute; add read replicas if read load grows
- Memorystore basic tier sufficient until 1000+ concurrent users

---

## 7. Integration Points

| External Service | Provides | Protocol | Failure Mode | Fallback |
|---|---|---|---|---|
| **OpenAI API** | GPT-4o generation | HTTPS via LiteLLM | 429, 500, timeout | Auto-failover to Anthropic |
| **Anthropic API** | Claude generation | HTTPS via LiteLLM | 429, 500, timeout | Auto-failover to OpenAI |
| **Google AI API** | Gemini generation | HTTPS via LiteLLM | 429, 500, timeout | Auto-failover to others |
| **Ollama** (local dev) | Local LLM | HTTP localhost:11434 | Connection refused | N/A (dev only) |
| **Google OAuth2** | Authentication | HTTPS | 503 | Error message, suggest retry |
| **Kakao OAuth2** | Authentication (Korean) | HTTPS | 503 | Error message, suggest Google |
| **Cloudflare R2** | File/image storage | HTTPS (S3-compat) | 503 | Upload error; existing images from CDN cache |
| **PostHog** | Product analytics | HTTPS (client SDK) | Network failure | Buffer locally, non-blocking |
| **Sentry** | Error tracking | HTTPS (SDK) | Network failure | Log locally, non-blocking |

---

## 8. Migration & Rollout

Not applicable — greenfield project.

**Phase 1 rollout:**
1. Internal testing (developer)
2. Invite-only beta (20-50 users via sign-up whitelist)
3. Collect qualitative feedback + monitor quantitative metrics (REQ-051)
4. Iterate on auto-structuring quality, generation quality, and UX friction before opening access

---

## 9. Risks & Open Questions

### 9.1 Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| AI prose quality in Korean below "worth editing" threshold | Critical — thesis fails | Medium | Multi-provider testing pre-beta. Genre-specific prompt engineering. LiteLLM enables rapid A/B testing. |
| Context window degradation for 15+ node projects | High — later scenes inconsistent | Medium | Summary compression from day one. Monitor quality by node position. Limit context to recent summaries + all character data. |
| SSE streaming fails on Cloud Run | Medium — broken generation UX | Low | Cloud Run supports SSE natively with long timeouts. Client reconnection logic. 300s timeout budget. |
| Auto-structuring produces poor results | High — onboarding fails | Medium | Rich structuring prompt with genre examples. "Re-generate" option. Clarifying questions for vague input. |
| Per-user LLM cost exceeds $5/month ceiling | Medium — unsustainable economics | Low | Per-request cost tracking via LiteLLM. Rate limiting. Cost alerts. |

### 9.2 Open Questions

1. **Which LLM provider produces the best Korean web novel prose?**
   - Options: Claude (Anthropic), GPT-4o (OpenAI), Gemini (Google)
   - Needed: Blind quality test with 50+ sample scenes across 3 genres
   - Decision: Before beta launch

2. **How should context window budget be allocated across sources?**
   - Options: Fixed allocation (30% config+characters, 50% prior summaries, 20% current), dynamic, tiered (recent nodes get more)
   - Needed: Empirical testing at positions 1, 5, 10, 15
   - Decision: During development

3. **Should auto-structuring be synchronous SSE or async job?**
   - Options: (a) Direct SSE from API — simpler, user waits; (b) Job queue + polling — user can navigate
   - Leaning: SSE — UX design specifies staged progress that maps to SSE events
   - Needed: Actual latency measurements
   - Decision: During implementation

4. **Neon region for production?**
   - Options: ap-southeast-1 (Singapore, closest with Neon), us-east-1 (cheapest)
   - Needed: Latency measurements from Korean ISPs
   - Decision: Before production deployment

---

## 10. Architecture Decision Records (ADRs)

### ADR-1: Backend Language — Python (FastAPI)

- **Status:** Accepted
- **Context:** Default backend per team convention is Rust (Axum). Narrex's core feature is LLM-powered text generation with complex context assembly and streaming.
- **Decision:** Python (FastAPI) with hexagonal architecture.
- **Alternatives Considered:**
  - Rust (Axum): lower memory, near-zero cold starts, compiler safety -> rejected because LLM integration libraries (LiteLLM, tokenizers) are Python-first. Streaming SSE with LLM providers has more battle-tested Python implementations. Performance difference irrelevant at beta scale.
  - Node.js (Hono): JS ecosystem alignment with frontend -> rejected because Python's AI ecosystem is stronger, and frontend/backend share no code.
- **Consequences:**
  - (+) Rich AI ecosystem, faster development velocity, simpler LLM streaming
  - (-) Higher memory (~100MB vs ~10MB Rust), slower cold starts (~2s vs ~100ms)
  - (-) No compile-time safety — mitigated by Pydantic validation, strict typing, pytest

### ADR-2: Frontend — TanStack Start (SolidJS)

- **Status:** Accepted
- **Context:** Narrex is a desktop-first interactive workspace with multi-panel layout, drag-and-drop timeline, force-directed character graph, text editor, and SSE streaming.
- **Decision:** TanStack Start + SolidJS + Tailwind CSS v4. Deployed to Cloudflare Workers.
- **Alternatives Considered:**
  - Next.js (React): larger ecosystem -> rejected because app is post-auth (no SEO), highly interactive (SolidJS fine-grained reactivity avoids React re-render overhead).
  - SvelteKit: similar reactivity benefits -> rejected because smaller ecosystem, team convention favors SolidJS, TanStack Router provides type-safe routing.
- **Consequences:**
  - (+) Superior runtime performance for interactive UI, no virtual DOM overhead
  - (-) Smaller ecosystem than React — some libraries may need wrappers

### ADR-3: System Architecture — Modular Monolith

- **Status:** Accepted
- **Context:** Solo developer building a product with tightly coupled domains. Need async processing for summary generation and file parsing, but domains don't need independent scaling.
- **Decision:** Single FastAPI application with internal domain boundaries. ARQ (Redis-backed) for background tasks.
- **Alternatives Considered:**
  - Microservices: separate services per domain -> rejected because solo developer, shared database, tightly coupled domains. Would create a distributed monolith.
  - Full event-driven: all inter-module communication via events -> rejected because most interactions are synchronous user requests. Only background tasks genuinely need async.
  - Serverless functions: each endpoint as a function -> rejected because SSE streaming requires long-lived connections; cold starts unacceptable for interactive UX.
- **Consequences:**
  - (+) Simple deployment, no network overhead between modules, easy local dev
  - (-) Must enforce module boundaries with discipline
  - (-) Scales as a single unit — acceptable at beta scale

### ADR-4: Database — PostgreSQL on Neon

- **Status:** Accepted
- **Context:** Data is inherently relational: projects -> tracks -> nodes; characters have relationships; complex JOIN queries needed for context assembly.
- **Decision:** PostgreSQL 18 (Docker dev) / Neon (production).
- **Alternatives Considered:**
  - Supabase (ap-northeast-2): Korean region, bundled auth/realtime -> rejected because Narrex doesn't need Supabase's real-time features (single-user). Auth handled separately. Neon's scale-to-zero and branching are better for solo developer workflow.
  - MongoDB: flexible schema -> rejected because timeline ordering, node connections, character relationships, and multi-table context assembly are relational operations.
- **Consequences:**
  - (+) Strong consistency, relational queries for context assembly, mature tooling
  - (+) Neon: scale-to-zero for cost, branching for dev workflow
  - (-) Neon's closest region to Korea is ap-southeast-1 (Singapore), ~40ms latency. Acceptable for beta.

### ADR-5: LLM Integration — LiteLLM Gateway

- **Status:** Accepted
- **Context:** PRD requires provider-agnostic LLM access supporting OpenAI, Anthropic, Google. Must support Ollama for local dev. Need cost tracking.
- **Decision:** LiteLLM as self-hosted LLM gateway on Cloud Run.
- **Alternatives Considered:**
  - Direct API integration (per provider): simpler, no overhead -> rejected because requires 3+ provider-specific implementations, no unified cost tracking, no automatic failover, switching requires code changes.
  - Portkey / Helicone: managed gateways -> rejected because subscription cost unjustified at beta scale. LiteLLM provides equivalent features as open-source.
  - Custom abstraction trait: build a thin adapter layer -> rejected because LiteLLM already solves this with 100+ providers, battle-tested streaming, built-in cost tracking.
- **Consequences:**
  - (+) Provider switching via config. Automatic failover. Unified cost tracking. Ollama works through same interface.
  - (-) Extra deployment artifact. ~50ms latency overhead per request.

### ADR-6: Authentication — Social Login + JWT

- **Status:** Accepted
- **Context:** Target users are Korean. Need low-friction onboarding.
- **Decision:** Google OAuth2 + Kakao OAuth2 + self-issued JWT (access + refresh tokens).
- **Alternatives Considered:**
  - Supabase Auth / Auth0 / Clerk: managed auth -> rejected because adds dependency and cost. Two OAuth providers + JWT is simple enough for Phase 1 requirements (no teams, no complex roles).
  - Email/password: standard auth -> rejected because Korean users strongly prefer social login (Kakao). Password management adds complexity.
- **Consequences:**
  - (+) Low-friction onboarding. No password management.
  - (-) Dependency on OAuth providers. Mitigated by supporting both Google and Kakao.

### ADR-7: Streaming Protocol — SSE

- **Status:** Accepted
- **Context:** AI generation takes 15-30s. Users must see text as it's generated. Direction-based edits take 5-10s.
- **Decision:** Server-Sent Events for all LLM-facing interactions. Standard REST for everything else.
- **Alternatives Considered:**
  - WebSocket: bidirectional -> rejected because no bidirectional need (single-user). Requires connection management, doesn't map to HTTP semantics. SSE is simpler.
  - Long polling: simple -> rejected because higher latency per token, worse streaming UX.
- **Consequences:**
  - (+) Built on HTTP, works with Cloud Run, native EventSource API, typed events (progress/token/error/done)
  - (-) Unidirectional — cancel via separate POST or client closing connection

---

## 11. AI/LLM Architecture

### 11.1 LLM Integration Pattern

**Tier 2: LLM Gateway (LiteLLM)**

```
Client --SSE--> API Server --HTTP--> LiteLLM ---> Anthropic (primary)
                                              ---> OpenAI (fallback)
                                              ---> Google (fallback)
```

Phase 1 uses a single model (configurable) for all tasks. Model cascading (Tier 3 — route by task complexity) is deferred to Phase 2 because at beta scale (~100 generations/day), cascading has negligible cost impact.

Local development: LiteLLM routes to Ollama. Same code path as production — only config changes.

### 11.2 Context Assembly Pipeline

This is the architectural core. The "your structure is your prompt" value proposition depends on correct, complete, and efficient context assembly.

The pipeline is deterministic, not agentic — steps are predictable, no tool-use reasoning needed.

```
Node ID
  |
  +---> Load project config (genre, tone, era, POV)
  +---> Load node details (title, plot summary, location, mood tags)
  +---> Load assigned characters -> character cards + relationships
  +---> Load preceding node summaries (ordered, budget-limited)
  +---> Load next node title + summary (if exists)
  +---> Load simultaneous events (other tracks at same time position)
  |
  v
Prompt template assembly
  |
  v
LLM call (streamed)
```

**Context budget allocation** (target ~8K tokens input, ~3K output):

| Source | Budget | Notes |
|---|---|---|
| System prompt + genre instructions | ~1K tokens | Fixed template per genre |
| Config + current node details | ~500 tokens | Compact structured format |
| Character cards + relationships | ~1.5K tokens | Scales with character count per scene |
| Prior node summaries | ~4K tokens | Most recent nodes get more budget |
| Next node + simultaneous events | ~1K tokens | Lightweight — title + summary only |

**Summary compression:** After a draft is saved or edited, a background task (ARQ) generates a ~200-300 token compressed summary. This summary is used as context for future node generations, keeping prior context within budget regardless of project size.

### 11.3 Streaming Architecture

**SSE event types:**

| Event | Data | When |
|---|---|---|
| `progress` | Stage description | During context assembly ("Loading characters...") |
| `token` | Text token(s) | As LLM generates prose |
| `done` | `{ token_count, cost }` | Generation complete |
| `error` | `{ type, message, retryable }` | Generation failed |

**Implementation:** FastAPI `StreamingResponse` with an async generator that consumes the LiteLLM streaming response and yields SSE-formatted events. The generator bridges the LLM provider's token stream to the client's EventSource.

**Timeout budget:** 300s on Cloud Run for generation endpoints. Breakdown: ~5s context assembly + ~5s TTFT + ~30s token generation + safety margin.

### 11.4 Cost Optimization

**Phase 1 (beta):**
- Prompt optimization: no empty fields, compact structured format
- Summary compression: ~200 token summaries vs ~2K full drafts
- Per-request cost tracking via LiteLLM

**Phase 2 (scale):**
- Model cascading: lightweight model for summaries/chat, frontier for scene generation
- Prompt caching: stable context segments (config, early summaries) cached by providers that support it (Anthropic)
- Batch API for non-real-time tasks (summary generation)

**Projected per-scene costs:**

| Task | Input Tokens | Output Tokens | Estimated Cost |
|---|---|---|---|
| Scene generation | ~8K | ~3K | $0.03-0.06 |
| Direction-based edit | ~4K | ~1K | ~$0.02 |
| Summary compression | ~1K | ~300 | ~$0.005 |
| Auto-structuring | ~2K | ~3K | ~$0.04 |

Per-user monthly estimate: $3-8 at moderate usage (50-100 generations/month).

### 11.5 Guardrails

- **Prompt structure:** User content placed in delimited template sections (`<user_config>`, `<plot_summary>`, `<character_data>`). Never interpolated into system instructions.
- **Output language:** System prompt instructs "Generate in natural Korean appropriate to the genre."
- **No factual validation needed** — output is creative fiction, not factual claims.
- **Phase 2+:** Character name consistency check (verify generated text uses correct names from the character map).

### 11.6 AI Observability

**Per-request (stored in `generation_log`):**
- model, provider, input_tokens, output_tokens, cost, latency_ms, ttft_ms
- node_id, project_id, user_id, generation_type (create/edit/structure/summarize)

**Aggregated (PostHog):**
- Generation count per user per day/week/month
- Average cost per generation by type
- Text retention rate (% of AI text kept after editing)
- Re-generation rate per node
- Generation success rate

---

## 12. Phase Implementation Summary

### Phase 1 (Core Loop MVP)

**Components:**
- Web: Dashboard, Project Creation, Workspace (Config Bar, Timeline, Character Map, Editor, Node Detail)
- API: Auth, Project, Timeline, Character, Generation, Editor modules
- Worker: Node summary compression, file parsing
- Gateway: LiteLLM with single model config

**Infrastructure:**
- GCP Cloud Run (Seoul) — API + Worker + LiteLLM
- Neon PostgreSQL
- GCP Memorystore (Redis)
- Cloudflare R2
- Cloudflare Workers (web client)

**Key ADRs:** All 7

### Phase 2 (Episode Layer + Polish)

**New components:**
- Episode organization (entity, dividers, word count estimates, hook types)
- AI Chat Panel (context-aware brainstorming)
- Export service (DOCX, EPUB, plain text)
- Genre template library
- Multiple draft variations (2-3 per scene)
- Tone/style sliders
- Foreshadowing connection lines

**New infrastructure:**
- Model cascading in LiteLLM (lightweight for summaries/chat, frontier for generation)
- Prompt caching (Anthropic provider)

### Phase 3+ (Depth + Delight)

**New components:**
- World Map Panel (visual map, location nodes)
- Revision tools (character consistency, foreshadowing verification, contradiction detection)
- Temporal relationship tracking
- AI gap detection, AI Surprise mode
- Inline autocomplete

**New infrastructure:**
- Potentially pgvector for semantic search across story content (revision tools)
- Potentially dedicated revision service if computational load justifies separation
