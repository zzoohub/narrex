# Narrex — Software Architecture Design Document

**Status:** Draft
**Author:** zzoo
**Date:** 2026-03-07
**PRD Reference:** docs/prd.md, docs/prd-phase-1.md
**UX Design:** docs/ux-design.md

---

## 1. Context & Scope

### 1.1 Problem Statement

Aspiring Korean web novel writers have stories in their heads but cannot translate ideas into structured, multi-episode manuscripts. The bottleneck is not creativity — it is the labor of structuring dozens of interconnected events, maintaining character consistency across 40+ episodes, and producing 3,000-5,000 characters of prose per episode. No existing tool — Korean or international — combines visual story structure with AI scene-level drafting. Narrex is a visual novel editor where the story is a timeline of scenes, not a blank page. The visual structure the author builds (characters, relationships, timeline position, config) automatically assembles into the AI prompt — no prompt engineering required.

### 1.2 System Context Diagram

![System Context](diagrams/system-context.svg)

**Actors:**
- **Writer** — Primary user. Aspiring novelist or hobbyist in the Korean web novel ecosystem. Interacts via desktop web browser.
- **LLM Providers** — Cloudflare Workers AI (primary, free tier) with Google Gemini Flash as paid fallback. Provide scene prose generation, auto-structuring, direction-based edits, and scene summarization.
- **Google OAuth** — Authentication provider. Single sign-on for all users.
- **Neon PostgreSQL** — Primary data store for all project, scene, character, and draft data.
- **Cloudflare R2** — Object storage for file imports (Notion .zip, .md, .txt) and character profile images.

### 1.3 Assumptions

1. **Scene-level Korean prose generation is viable.** Frontier-class LLMs produce Korean prose good enough to revise (not discard). If quality is insufficient, the provider-agnostic gateway enables rapid switching.
2. **Per-scene summaries provide sufficient context.** AI-generated summaries of completed scenes (not full text) can maintain narrative fidelity over 10-20 scenes in Phase 1. Validated at scale in Phase 2+.
3. **Single developer for initial development.** Architecture decisions optimize for operational simplicity and DX over organizational scaling.
4. **Desktop-first.** The timeline and editor require screen real estate. Mobile is out of scope.
5. **Korean web novel writers will pay for AI generation.** Based on comparable creative tool pricing (Canva, Midjourney) but not directly validated.

---

## 2. Goals & Non-Goals

### 2.1 Goals

- Support the full Phase 1 core loop: idea input → auto-structuring → visual timeline → AI scene generation → editing — end-to-end in a single session.
- AI draft generation completes within 30 seconds per scene with SSE streaming (time-to-first-token < 3s).
- Per-user monthly AI cost stays below $5 at moderate usage (consistent with $12/month Basic plan at 40% cost ceiling).
- Support 100 concurrent users at launch with horizontal auto-scaling to 1,000.
- All user edits auto-save within 1 second of last keystroke.
- Provider-agnostic LLM integration: switch providers via config, no code changes.

### 2.2 Non-Goals

- **Real-time collaboration** — Single-author product. No conflict resolution, no presence, no CRDT.
- **Mobile app** — Desktop-first web application. No responsive timeline below 768px.
- **Multi-region deployment** — Single region (us-east) until growth justifies it.
- **Self-hosted LLM inference** — Use provider APIs exclusively. Self-hosting only when monthly spend exceeds ~$50K.
- **Offline support** — Requires network for AI generation and data sync.
- **Fine-tuning** — Exhaust prompt engineering first. Fine-tuning is a Phase 3+ consideration.

---

## 3. High-Level Architecture

### 3.1 Architecture Style

**System Architecture:** Modular monolith with request-response (synchronous) for CRUD operations and SSE streaming for AI generation. No separate worker service in Phase 1 — AI generation is handled as long-running HTTP requests with streaming response.

**Rationale:** A single developer maintaining multiple microservices pays overhead for organizational isolation that doesn't exist. The modular monolith gives domain separation (projects, timeline, characters, AI generation, auth) without deployment overhead. Modules communicate via in-process function calls. The monolith can be decomposed later if team structure demands it (Conway's Law). Toss — a Korean fintech at massive scale — proves this pattern works.

**Code Structure:** Hexagonal Architecture (Ports & Adapters). The domain core (project management, timeline logic, character relationships, AI context assembly) has zero dependencies on infrastructure. Ports define interfaces; adapters implement them (PostgreSQL, LLM providers, R2 storage). AI-assisted development eliminates the boilerplate cost.

**Stack:**
| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | TanStack Start + SolidJS | Fine-grained reactivity for timeline/editor (no virtual DOM diffing), smaller bundles, type-safe routing |
| Backend | Rust / Axum | Sub-ms response times, 10-30MB memory, compile-time safety, lower cloud cost |
| Database | Neon (Serverless PostgreSQL) | Scale-to-zero, branching for dev/staging, full PostgreSQL, us-east-1 |
| Object Storage | Cloudflare R2 | S3-compatible, zero egress fees, presigned URLs for direct upload |
| Cache / Rate Limit | Upstash Redis | HTTP + TCP, scale-to-zero, rate limiting SDK |
| CDN / DNS | Cloudflare | Free tier, global edge, DDoS protection, WAF |
| Compute | GCP Cloud Run | Container auto-scaling, scale-to-zero, generous free tier |
| Frontend Hosting | Cloudflare Workers | Edge SSR, global distribution |
| Auth | Google OAuth2 + self-issued JWT | Widest reach for global audience, low friction |
| Payments | Stripe | Global payment standard [Phase 2] |
| Error Tracking | Sentry | Source maps, breadcrumbs, performance monitoring |
| Analytics | PostHog | Funnels, feature flags, session replay |
| IaC | Pulumi | TypeScript-native, avoids HCL context-switch |

### 3.2 Container Diagram

![Container Diagram](diagrams/container.svg)

**Containers:**

| Container | Technology | Responsibility | Communication |
|-----------|-----------|---------------|---------------|
| Web App | TanStack Start + SolidJS on Cloudflare Workers | SSR, client-side UI (timeline, editor, character map, config bar), routing | HTTPS to API (REST + SSE) |
| API Server | Rust / Axum on GCP Cloud Run | All business logic, auth, CRUD, AI orchestration, streaming proxy | REST API (JSON), SSE for AI streaming |
| LLM Gateway | Rust trait compiled into API | Provider abstraction, request formatting, response parsing, cost tracking | HTTP to LLM provider APIs |
| Context Assembler | Rust module in API | Builds AI prompts from project data (config, characters, summaries, scene details) | In-process function calls |
| Neon PostgreSQL | Managed serverless PostgreSQL | All persistent data: users, projects, scenes, characters, drafts, summaries, generation logs | SQL via pooler (TCP) |
| Cloudflare R2 | Managed object storage | File imports, character profile images | Presigned URLs (HTTP) |
| Upstash Redis | Managed serverless Redis | Session storage, rate limiting, generation deduplication | HTTP (from Workers), TCP (from Cloud Run) |

**API Design Philosophy:**
- **REST** with JSON request/response. No GraphQL — the data access patterns are well-defined and don't benefit from client-specified queries.
- **Versioning:** URL path (`/api/v1/...`). One-way door — URL-based is explicit and cache-friendly.
- **Pagination:** Cursor-based for timeline scenes (ordered by start_position). Offset-based for project lists (low cardinality).
- **SSE** for AI streaming endpoints (`/api/v1/scenes/{id}/generate`, `/api/v1/scenes/{id}/edit`).

### 3.3 Component Overview

The API server is internally organized into domain modules following hexagonal architecture:

| Module | Responsibility | Critical Path? |
|--------|---------------|----------------|
| `auth` | OAuth2 flow, JWT issuance/validation, session management | Yes — guards all endpoints |
| `project` | Project CRUD, config management, source input handling | Yes — project creation is first value moment |
| `timeline` | Track and scene management, ordering, branch/merge connections | Yes — core visual metaphor |
| `character` | Character CRUD, relationship management, character map data | Yes — feeds AI context |
| `generation` | AI context assembly, LLM gateway orchestration, SSE streaming, scene summarization | Yes — core value delivery |
| `editor` | Draft management, direction-based edit orchestration | Yes — closes the core loop |
| `analytics` | Generation logging, cost tracking, usage metrics | No — async, non-blocking |

**Module boundaries:** Each module owns its domain logic and exposes a port interface. Cross-module communication happens via port calls (e.g., `generation` calls `character::get_characters_for_scene()` and `timeline::get_preceding_summaries()`). No module directly accesses another module's database tables — all access goes through the owning module's port.

---

## 4. Data Architecture

### 4.1 Data Flow

**Flow 1: Idea → Auto-Structured Project (Critical Path)**

1. Writer submits free text or uploads file via Web App.
2. Web App POST `/api/v1/projects` with `{ source_type, source_input }` (or file upload to R2 → file_key).
3. API validates input. If file, fetches from R2 and extracts text content.
4. API calls Context Assembler to build an auto-structuring prompt (input text + instructions for extracting characters, plot points, config).
5. Context Assembler sends prompt via LLM Gateway → LLM Provider (SSE stream).
6. API parses structured JSON response (config values, scene list, character list with relationships).
7. API writes to Neon in a transaction: `project` + `track`(s) + `scene`(s) + `character`(s) + `character_relationship`(s) + `scene_character` links.
8. API returns full project structure to Web App.
9. Consistency: **strong** — single transaction, read-your-writes.

**Flow 2: Scene AI Draft Generation (Critical Path)**

1. Writer selects scene, presses "Generate Draft" in editor.
2. Web App POST `/api/v1/scenes/{id}/generate` (SSE response).
3. API fetches from Neon: project config, scene details, involved characters + relationships, preceding scene summaries, simultaneous scenes (overlapping timeline ranges on other tracks), next scene preview.
4. Context Assembler builds the generation prompt from all fetched data.
5. LLM Gateway sends to provider with `stream: true`.
6. API proxies SSE tokens back to Web App in real-time. Writer sees prose streaming in.
7. On stream completion: API writes `draft` record (content, version, char_count, model, token counts, cost) and `generation_log` entry. Updates `scene.status` to `ai_draft`.
8. API generates and caches `scene_summary` for this scene (used as context for future scenes).
9. Consistency: SSE is fire-and-forget for streaming. Draft persistence is **strong** (written after stream completes).

**Flow 3: Direction-Based Edit**

1. Writer selects text passage, enters direction ("more tension"), presses Apply.
2. Web App POST `/api/v1/scenes/{id}/edit` with `{ selection_start, selection_end, direction, full_text }`.
3. API builds an edit prompt: original full text + selected passage + direction + scene context.
4. LLM Gateway streams replacement text via SSE.
5. On completion: API writes new `draft` record (version incremented, source = `direction_edit`, edit_direction stored). Logs to `generation_log`.
6. Web App replaces selected passage with streamed output.

### 4.2 Storage Strategy

| Store | Data | Why This Type | Consistency | Retention |
|-------|------|--------------|-------------|-----------|
| **Neon PostgreSQL** | Users, projects, tracks, scenes, characters, relationships, drafts, summaries, generation logs | Relational — complex joins for context assembly (scenes + characters + relationships + summaries in one query). ACID transactions for project creation. | Strong (read-your-writes) | Indefinite. Soft-delete for projects (`deleted_at`). |
| **Cloudflare R2** | Imported files (.md, .txt, .zip), character profile images | Object storage — binary files, direct upload via presigned URLs, zero egress. | Eventual (S3 consistency model) | Indefinite. Orphan cleanup via periodic job [Phase 2]. |
| **Upstash Redis** | Refresh tokens, rate limit counters, generation deduplication keys | Key-value — ephemeral data with TTL. Sub-ms reads for auth middleware. | Eventual (Redis replication) | TTL-based: refresh tokens 7d, rate limits 1min window, dedup keys 30s. |

**Why not a separate vector store:** Phase 1 does not use RAG. Scene summaries are stored as plain text in `scene_summary` and retrieved by scene ordering (not semantic similarity). If Phase 3+ revision tools need semantic search over the full manuscript, pgvector on Neon is the first option before a dedicated vector DB.

### 4.3 Caching Strategy

| What | Where | TTL | Invalidation |
|------|-------|-----|-------------|
| Scene summaries | Neon `scene_summary` table | None (persistent) | Regenerated when a scene's draft changes |
| Auth session (refresh token mapping) | Upstash Redis | 7 days | Explicit on logout or token rotation |
| Rate limit counters | Upstash Redis | 1 minute sliding window | Auto-expire |
| Generation dedup | Upstash Redis | 30 seconds | Auto-expire. Prevents duplicate generation requests from double-clicks. |

No application-level HTTP response caching in Phase 1. Cloudflare edge caches static assets (JS, CSS, images) with immutable hashes. API responses are not cached — data freshness matters for collaborative-with-self workflows (editing across tabs).

---

## 5. Infrastructure & Deployment

### 5.1 Compute Platform

| Service | Platform | Region | Rationale |
|---------|----------|--------|-----------|
| API Server | GCP Cloud Run | us-east4 (Virginia) | Container auto-scaling, scale-to-zero, co-located with Neon (us-east-1). Request timeout set to 300s for LLM streaming endpoints. |
| Web App | Cloudflare Workers | Global edge | Near-zero cold starts, SSR at the edge, free tier generous. |

**Why Cloud Run over Workers for the API:** The API needs TCP connections to Neon (via pooler), long-running requests (up to 60s for AI generation), and larger memory for context assembly. Workers' 128MB memory limit and 30s CPU time limit are too restrictive. Cloud Run provides container flexibility with auto-scaling.

**Cold starts:** Rust binaries on Cloud Run cold-start in ~200ms (vs 2-5s for JVM). Acceptable for B2C. Minimum instances = 0 at launch (cost optimization), increase to 1 when traffic justifies it.

**Scaling:** Cloud Run horizontal auto-scale. Max instances = 10 at launch (each handles ~50 concurrent requests). Scale trigger: CPU utilization > 60% or request concurrency > 50.

### 5.2 Deployment Strategy

```
PR merge → GitHub Actions CI
  → cargo test + cargo clippy (Rust)
  → bun test (SolidJS)
  → Build container image (multi-stage Dockerfile)
  → Push to GCP Artifact Registry
  → Deploy to Cloud Run (rolling update, traffic migration)
  → Deploy Web to Cloudflare Workers (wrangler deploy)
  → Run smoke tests against production
```

- **Rolling deployment** with Cloud Run's traffic splitting. New revision receives 100% traffic on successful health check. If health check fails, traffic stays on previous revision.
- **Rollback:** `gcloud run services update-traffic --to-revisions=PREVIOUS=100`. Instant, no redeployment.
- **Database migrations:** Run via CI before deploying new application version. Backwards-compatible migrations only (add column, add table — never drop or rename in the same deploy).

### 5.3 Environment Topology

| Environment | Compute | Database | Purpose |
|-------------|---------|----------|---------|
| Local | `cargo run` + `bun dev` | Docker Compose (PostgreSQL 16) | Development. LLM calls hit CF Workers AI REST API. |
| Staging | Cloud Run (min 0) + Workers | Neon branch (branched from production) | Pre-production validation. Same CF Workers AI + Gemini fallback. |
| Production | Cloud Run (min 0→1) + Workers | Neon main branch | Live traffic. |

Neon branching gives staging a copy-on-write database clone — no seed scripts needed, instant provisioning, zero storage cost until writes diverge.

### 5.4 Disaster Recovery & Business Continuity

| Service | RTO | RPO | Strategy |
|---------|-----|-----|----------|
| API (Cloud Run) | < 5 min | N/A (stateless) | Cloud Run auto-heals failed instances. Redeploy from last known-good image. |
| Web (Workers) | < 2 min | N/A (stateless) | Cloudflare global redundancy. Redeploy via wrangler. |
| Database (Neon) | < 30 min | < 5 min | Neon continuous backup with point-in-time recovery. Restore to any point within retention window. |
| R2 | < 10 min | ~0 (durable) | Cloudflare's 11-nines durability. No separate backup needed. |
| Redis (Upstash) | < 5 min | Ephemeral (acceptable loss) | Session data is regenerable. Rate limits reset naturally. |

**Backup strategy:** Neon handles PostgreSQL backups automatically (continuous WAL archiving). No manual backup jobs needed. Restore tested quarterly.

**Runbook:** For a 3 AM page — check Cloud Run logs (GCP Console → Cloud Run → Logs), verify Neon status (Neon Console), check LLM provider status pages. If API is down: redeploy last good revision. If DB is down: wait for Neon recovery or initiate PITR.

### 5.5 Cost Estimation

**Launch (100 DAU, ~20 concurrent):**

| Component | Monthly Cost | Notes |
|-----------|-------------|-------|
| Cloud Run | $0-5 | Scale-to-zero, ~2M requests/month |
| Neon | $0 (free tier) | 0.5GB storage, 190 compute hours |
| Cloudflare Workers | $0 (free tier) | 100K requests/day |
| Cloudflare R2 | $0-1 | < 10GB storage |
| Upstash Redis | $0 (free tier) | 10K commands/day |
| LLM API (AI generation) | $0-10 | CF Workers AI free tier (10K neurons/day). Gemini Flash fallback at $0.10/1M tokens. |
| Sentry | $0 (free tier) | 5K errors/month |
| PostHog | $0 (free tier) | 1M events/month |
| **Total** | **$0-20** | Minimal with CF Workers AI free tier |

**Growth (1,000 DAU, ~200 concurrent):**

| Component | Monthly Cost | Notes |
|-----------|-------------|-------|
| Cloud Run | $20-50 | Auto-scaling, ~20M requests/month |
| Neon | $19 (Launch plan) | 10GB storage |
| Cloudflare Workers | $5 (Paid plan) | 10M requests/month |
| LLM API | $50-200 | CF Workers AI free tier + Gemini Flash overflow. Per-user daily generation limits. |
| Upstash Redis | $10 | Pro plan |
| **Total** | **$560-2,100** | |

**Top 3 cost drivers and levers:**
1. **LLM API costs** — Mitigate: CF Workers AI free tier as primary, Gemini Flash as low-cost fallback ($0.10/1M tokens), per-user daily generation limits, prompt optimization, scene summary caching.
2. **Cloud Run** — Mitigate: Rust's low memory means fewer/smaller instances. Scale-to-zero during off-hours.
3. **Neon** — Mitigate: Scale-to-zero suspends compute when idle. Storage grows slowly (text-heavy, no media).

---

## 6. Cross-Cutting Concerns

### 6.0 SLA/SLO Definitions

| SLO | Metric | Threshold | Window | Alert |
|-----|--------|-----------|--------|-------|
| Availability | Successful HTTP responses / total | 99.5% | 7-day rolling | < 99% over 1 hour |
| API Latency (CRUD) | p99 response time | < 500ms | 5-min rolling | p99 > 1s for 5 min |
| AI Generation TTFT | Time to first SSE token | < 5s | Per request | > 10s for 10% of requests over 15 min |
| AI Generation Total | Full scene generation time | < 45s | Per request | > 60s for 10% of requests over 15 min |
| Auto-save | Time from last keystroke to confirmed save | < 2s | Per save | > 5s for 5% of saves over 5 min |

**Error budget:** At 99.5% availability, ~3.6 hours of downtime per month is tolerable. Below 99% triggers deployment freeze until root cause is resolved.

### 6.1 Authentication & Authorization

**Auth Flow:**
1. Writer clicks "Sign in with Google" → redirect to Google OAuth2 consent screen.
2. Google redirects back with authorization code.
3. API exchanges code for Google tokens, extracts user info (email, name, picture).
4. API upserts `user_account` record. Issues self-signed JWT (access token) + refresh token.
5. Access token (15 min, in memory / `Authorization: Bearer`) returned to client.
6. Refresh token (7 days, `httpOnly` + `Secure` + `SameSite=Lax` cookie) set by API.
7. Client includes access token on every API request. Middleware validates JWT signature + expiry.
8. On 401 (expired access token), client calls `/api/v1/auth/refresh` with cookie → new access + refresh tokens (rotation).

**Authorization model:** Resource-based ownership (simple ABAC). Every mutable resource has a `user_id`. Middleware checks `resource.user_id == authenticated_user.id`. No roles, no teams, no sharing — single-author product.

**Where enforced:** Axum middleware layer. Auth extraction in middleware, ownership check in handler before any mutation.

### 6.2 Observability

**Logging:**
- Structured JSON to stdout (Cloud Run captures automatically → GCP Cloud Logging).
- Fields: `timestamp`, `level`, `request_id` (correlation), `user_id`, `method`, `path`, `status`, `duration_ms`.
- Levels: `ERROR` for failures, `WARN` for degradation, `INFO` for request lifecycle, `DEBUG` for development only.
- Rust: `tracing` + `tracing-subscriber` with JSON formatter.

**Metrics:**
- RED method per endpoint: Rate, Errors, Duration.
- Business metrics via PostHog: project creation funnel, generation count per user, text retention rate, scene completion rate.
- AI-specific: tokens per request (input/output), cost per request, cost per user per month, time-to-first-token.
- Infrastructure: Cloud Run instance count, CPU/memory utilization, cold start frequency.

**Tracing:** Single service — no distributed tracing needed in Phase 1. Request ID (`X-Request-Id` header) propagated through logs for correlation. Add OpenTelemetry when extracting to multiple services.

**Alerting:** GCP Cloud Monitoring for SLO violations. PostHog for business metric anomalies. Sentry for error spikes. PagerDuty or email for critical alerts.

### 6.3 Error Handling & Resilience

**LLM Provider Failure:**
- Retry: 1 retry with 2s backoff for 5xx or timeout from LLM provider.
- Circuit breaker: Not in Phase 1 (single provider). Phase 2: if provider error rate > 20% over 1 min, switch to fallback provider via gateway config.
- Graceful degradation: If generation fails after retry, return clear error to user with retry button. The tool remains fully functional for editing, timeline management, and character work — only AI generation is degraded.

**Database Failure:**
- Neon has automatic failover. SQLx connection pool retries on transient errors.
- If Neon is unreachable: API returns 503 with "Service temporarily unavailable." No client-side retry — user refreshes manually.

**Timeout budgets:**
- Cloud Run request timeout: 300s (accommodates long LLM generations).
- LLM provider call timeout: 60s per request.
- Database query timeout: 5s.
- Upstream (Cloudflare → Cloud Run) timeout: 300s.

### 6.4 Security

- **Transit:** TLS 1.3 enforced by Cloudflare (edge) and Cloud Run (compute). No plaintext.
- **At rest:** Neon encrypts data at rest (AES-256). R2 encrypts at rest. No additional application-level encryption in Phase 1.
- **Secrets:** `pulumi config set --secret` for solopreneur scale. Secrets: Google OAuth client secret, LLM API keys, JWT signing key. Upgrade to GCP Secret Manager when team grows.
- **Input validation:** All API inputs validated with `validator` crate (Rust). Scene plot summaries and character fields sanitized for max length (prevent context window abuse). File uploads validated by MIME type and size (max 10MB).
- **Rate limiting:** Upstash Redis + `@upstash/ratelimit` pattern. Per-user limits: 60 API requests/min, 10 AI generations/min. Prevents cost abuse.
- **OWASP Top 10:**
  - Injection: Parameterized queries via SQLx (compile-time checked). No string concatenation in SQL.
  - XSS: SolidJS auto-escapes output. CSP headers via Cloudflare.
  - CSRF: `SameSite=Lax` cookies + `Origin` header validation.
  - Broken auth: JWT validation in middleware, refresh token rotation, httpOnly cookies.

### 6.5 Testing Architecture

**Testing strategy:** Unit-heavy pyramid. Domain logic (context assembly, timeline ordering, permission checks) is pure Rust with no infrastructure dependencies — unit tests are fast and deterministic.

| Layer | What | How | Coverage Target |
|-------|------|-----|----------------|
| Unit | Domain logic, context assembly, timeline ordering | `cargo test` — mock ports via trait objects | 80%+ of domain modules |
| Integration | Database adapters, LLM gateway (with mock provider) | `cargo test` with test containers (PostgreSQL) | All adapter boundaries |
| E2E | Critical flows: project creation, scene generation, editing | Playwright against staging | Core loop (Flow 1 + Flow 2) |
| AI Eval | Generation quality: Korean prose quality, context fidelity | Golden test set (30 scenes across 3 genres), LLM-as-judge | Run on prompt/model changes |

**Contract testing:** Not needed — single API consumed by single frontend. TypeScript types generated from OpenAPI spec ensure frontend/backend alignment.

### 6.6 Performance & Scalability

**Expected load profile:**
- Launch: 100 DAU, ~20 concurrent, ~500 AI generations/day.
- Growth: 1,000 DAU, ~200 concurrent, ~5,000 AI generations/day.
- Peak: Evening hours (Korea, UTC+9), 7-11 PM. 3x average load.

**Bottlenecks and mitigation:**
1. **AI generation latency** (15-30s per scene): SSE streaming makes this feel fast. No mitigation needed — the UX handles it.
2. **Context assembly database queries** (fetching config + characters + summaries + connections for a scene): Single complex query with JOINs, not N+1. Index on `scene.project_id`, `scene.track_id`, `scene_character.scene_id`. Target < 50ms.
3. **Auto-structuring** (10-30s LLM call): Loading state with staged progress. No optimization — this is a one-time cost per project.

**Scaling triggers:** Cloud Run auto-scales on request concurrency (> 50 per instance) or CPU (> 60%). Neon auto-scales compute. No manual scaling actions needed until well past growth target.

### 6.7 Accessibility Architecture

**Compliance target:** WCAG 2.1 AA. The primary user base includes non-technical hobbyist writers — accessibility is a usability concern, not just compliance.

- **Semantic HTML & ARIA:** Timeline scenes are interactive elements with `role="button"`, `aria-label` (scene title + status). Character map nodes have `aria-label` with name and relationship summary. Editor uses standard `contenteditable` or textarea with proper labeling.
- **Keyboard navigation:** Full keyboard support for timeline (arrow keys between scenes, Enter to select, Delete to remove). Tab cycles between panels. Focus trapping in modal dialogs. Skip link to main content.
- **Alternative views:** List view toggle for timeline (accessible fallback for screen readers and users who find the visual timeline overwhelming). Character list view as alternative to force-directed graph.
- **Automated testing:** axe-core integrated in Playwright E2E tests. CI blocks on new accessibility violations.
- **Design system:** Color tokens with 4.5:1 contrast ratios (verified in Ink & Amber dark theme). Focus indicators: 2px outline. `prefers-reduced-motion`: animations replaced with instant transitions.

### 6.8 Data Governance

**Data classification:**
| Category | Data | Sensitivity | Access |
|----------|------|------------|--------|
| Account | Email, display name, profile image URL | PII (Confidential) | Auth module only |
| Content | Story text, character descriptions, plot summaries | User-generated (Internal) | Owner only |
| AI Logs | Prompts, completions, token counts, costs | Operational (Internal) | Analytics module |
| Session | Refresh tokens, rate limit counters | Ephemeral (Internal) | Auth module only |

**AI data governance:**
- User story content is sent to LLM providers as prompts. Users must consent to this at signup.
- No user content is used for model training — enforced via provider API terms (not training-eligible endpoints).
- Generation logs store prompt/completion pairs for quality monitoring and cost tracking. PII (user email) is not included in prompts.
- Prompts include only project-scoped data (config, scene details, character data) — never cross-user data.

**Retention & deletion:**
- Account deletion: hard-delete `user_account`, cascade-delete all projects and related data. Purge from Redis. R2 objects deleted. Compliant with right-to-erasure.
- Generation logs: retained 90 days for cost analysis, then purged.
- Soft-deleted projects (`deleted_at`): hard-deleted after 30 days.

---

## 7. Integration Points

| External System | What It Provides | Protocol | Failure Mode | Fallback | SLA Dependency |
|----------------|-----------------|----------|-------------|----------|---------------|
| **Cloudflare Workers AI** | Scene generation, auto-structuring, direction edits, summarization (primary, free tier) | HTTPS + SSE | Timeout, 429, 5xx | Fallback to Gemini Flash. Show error + retry button. | High — core feature depends on it |
| **Google Gemini Flash** | Same as above (fallback when CF free tier exceeded) | HTTPS + SSE | Timeout, 429, 5xx | Retry once. Show error + retry button. | High — fallback provider |
| **Google OAuth** | User authentication | HTTPS (OAuth2 code flow) | Timeout, service outage | Show "Sign-in temporarily unavailable." No fallback provider in Phase 1. | Medium — blocks new sign-ins, not active sessions |
| **Neon PostgreSQL** | All persistent data | TCP (PostgreSQL protocol via pooler) | Connection timeout, failover | SQLx retry on transient errors. 503 to user if unreachable. | Critical — all reads/writes depend on it |
| **Cloudflare R2** | File storage | HTTPS (S3-compatible API) | Timeout, service error | File import fails with clear error. Profile images show placeholder. | Low — only affects file import and images |
| **Upstash Redis** | Session, rate limiting | HTTP (from Workers), TCP (from Cloud Run) | Timeout | Degrade gracefully: skip rate limiting, fall back to stateless JWT validation. | Low — ephemeral data |
| **Stripe** [Phase 2] | Subscription billing | HTTPS (webhooks) | Webhook delivery failure | Stripe retries for 72h. Subscription status checked on API call if webhook missed. | Medium — blocks paid feature access |

---

## 8. Migration & Rollout

Not applicable — greenfield project, no existing system to replace.

**Beta rollout plan:**
1. M5 (Beta Launch): Invite-only, 20-50 Korean writers.
2. Collect qualitative feedback on auto-structuring quality, AI draft quality, timeline usability.
3. Monitor success metrics (core loop completion, text retention, multi-scene engagement).
4. M6 (Iteration): Address critical feedback before wider launch.

---

## 9. Risks & Open Questions

### 9.1 Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| AI prose quality in Korean is below "worth editing" threshold | Critical | Medium | Pre-launch benchmark with 5-10 target users across 3 genres. Provider-agnostic gateway enables rapid A/B testing. Genre-specific prompt engineering. |
| Context window limits cause quality degradation at 15+ scenes | High | Medium | Summary-based compression from day one. Monitor generation quality by scene position. Invest in compression quality before Phase 2. |
| Multi-track timeline is too complex for non-technical users | High | Medium | Progressive disclosure: default single track, parallel tracks only when auto-structuring detects them or user adds manually. Inline hints on first encounter. List view fallback. |
| Cloud Run cold starts degrade first-request latency | Low | Medium | Rust cold starts ~200ms (acceptable). Set min-instances=1 if traffic justifies the ~$20/month cost. |
| LLM provider rate limiting during peak usage | Medium | Low | Per-user daily generation limits. CF Workers AI free tier exceeded → automatic fallback to Gemini Flash. Monitor 429 responses. |
| SSE connection drops during long AI generation | Medium | Medium | Client-side reconnection with generation ID to resume. Server stores partial generation, client requests continuation. |

### 9.2 Open Questions

1. **~~Which LLM provider is primary for Korean prose?~~** Resolved: Cloudflare Workers AI (free tier, open models) as primary. Google Gemini Flash as paid fallback. Benchmark Korean prose quality with golden test set to select best CF Workers AI model.
2. **Should auto-structuring use a different (more capable) model than scene generation?** Auto-structuring is one-time per project and requires complex reasoning. Scene generation is frequent and needs fluent prose. Model cascading in Phase 2 may split these. Information needed: cost/quality comparison.
3. **How to handle concurrent edits across browser tabs?** Current: last-write-wins. Risk: user has two tabs, edits different scenes, auto-save overwrites. Mitigation options: tab detection, optimistic locking with version field. Decide based on user feedback.
4. **Should prompts be version-controlled in code or externalized?** For Phase 1 (solopreneur), prompts in code (version-controlled with the app). Move to external prompt registry when prompts change frequently or A/B testing is needed (Phase 2+).

---

## 10. Architecture Decision Records (ADRs)

### ADR-1: Rust / Axum for Backend

- **Status:** Accepted
- **Reversibility:** One-way door
- **Context:** Need a backend that handles SSE streaming for AI generation, connects to PostgreSQL, and runs cost-effectively on Cloud Run for a solopreneur.
- **Decision:** Rust with Axum.
- **Alternatives Considered:**

| Criterion (weighted) | Rust/Axum | Node.js/Hono | Python/FastAPI |
|---------------------|-----------|-------------|----------------|
| Runtime cost (25%) | +++ (10-30MB mem) | ++ (50-100MB) | + (100-200MB) |
| Type safety (25%) | +++ (compile-time) | ++ (TypeScript) | + (runtime Pydantic) |
| SSE/streaming (20%) | +++ (axum::sse, zero-copy) | ++ (native) | ++ (Starlette SSE) |
| Cold start (15%) | +++ (~200ms) | ++ (~500ms) | + (~2s) |
| Ecosystem/DX (15%) | + (smaller, steeper curve) | +++ (npm) | ++ (pip) |

- **Consequences:** Steeper learning curve. Slower initial development velocity. But: lower runtime cost (critical for solopreneur), compile-time guarantees eliminate entire error classes, and Axum's tower-based middleware is excellent for auth + streaming.
- **Quality Attributes Affected:** Performance (+), cost (+), safety (+), development speed (-).

### ADR-2: TanStack Start + SolidJS for Frontend

- **Status:** Accepted
- **Reversibility:** One-way door
- **Context:** The UI is a desktop-first creative tool with a multi-track timeline, force-directed character graph, and a prose editor — all highly interactive, state-heavy components.
- **Decision:** TanStack Start with SolidJS, deployed to Cloudflare Workers.
- **Alternatives Considered:**

| Criterion (weighted) | TanStack Start + SolidJS | Next.js + React |
|---------------------|------------------------|-----------------|
| Reactivity model (30%) | +++ (fine-grained signals, surgical DOM updates) | ++ (virtual DOM diffing) |
| Bundle size (20%) | +++ (smaller, no vDOM runtime) | ++ (React runtime overhead) |
| Timeline perf (25%) | +++ (no reconciliation on scene drag) | + (re-render on every state change without heavy memoization) |
| Ecosystem (25%) | + (smaller, fewer UI libraries) | +++ (Radix, shadcn/ui, Tiptap, etc.) |

- **Consequences:** Smaller ecosystem means building more custom components (timeline, character graph, editor). But the timeline — the core differentiator — benefits significantly from fine-grained reactivity. Dragging scenes, zooming, and real-time state updates are naturally efficient without `useMemo`/`useCallback` gymnastics.
- **Quality Attributes Affected:** Performance (+), bundle size (+), development speed (-), ecosystem availability (-).

### ADR-3: Modular Monolith

- **Status:** Accepted
- **Reversibility:** Two-way door (can extract to services later)
- **Context:** Single developer building the full stack. Need domain separation without microservice operational overhead.
- **Decision:** Single deployable Axum service with internally isolated domain modules (auth, project, timeline, character, generation, editor, analytics). Modules communicate via in-process function calls through port interfaces.
- **Alternatives:** Microservices (rejected — operational overhead for one developer, distributed monolith risk). Flat monolith without module boundaries (rejected — as the codebase grows, coupling becomes painful).
- **Consequences:** Simple deployment (one container). Fast inter-module calls (no network). Must enforce module boundaries with discipline (no cross-module direct DB access). Extraction path clear: any module can become a service by implementing its port as an HTTP client instead of in-process call.
- **Quality Attributes Affected:** Operational simplicity (+), development speed (+), deployment simplicity (+), independent scaling (-).

### ADR-4: Neon Serverless PostgreSQL

- **Status:** Accepted
- **Reversibility:** Two-way door (PostgreSQL-compatible, can migrate to any PG host)
- **Context:** Need a PostgreSQL database with low idle cost (solopreneur), branching for dev/staging, and location near Cloud Run (us-east).
- **Decision:** Neon (us-east-1, AWS Virginia). Connect from Cloud Run via pooler endpoint (PgBouncer). SQLx for compile-time query checking.
- **Alternatives:** Supabase Seoul (rejected — user chose Global infra; Supabase Seoul would add latency to Virginia Cloud Run). GCP Cloud SQL (rejected — no scale-to-zero, always-on cost of ~$10-30/month idle).
- **Consequences:** Cross-cloud latency (Neon on AWS, Cloud Run on GCP) adds ~1-3ms per query — negligible. Scale-to-zero means $0 cost when idle. Branching gives instant staging environments. Neon's serverless driver works from Cloudflare Workers if needed.
- **Quality Attributes Affected:** Cost (+), DX via branching (+), latency (negligible -).

### ADR-5: GCP Cloud Run for API Compute

- **Status:** Accepted
- **Reversibility:** Two-way door (containerized, runs anywhere)
- **Context:** Need container hosting with auto-scaling, long request timeout (300s for AI streaming), and scale-to-zero.
- **Decision:** GCP Cloud Run (us-east4, Virginia).
- **Alternatives:** Cloudflare Workers (rejected — 128MB memory limit, 30s CPU time, no TCP to Neon pooler). AWS Lambda (rejected — not in GCP ecosystem, cold starts worse for Rust). GCP GKE (rejected — overkill for single service, operational overhead).
- **Consequences:** Platform cohesion with GCP services (Cloud Logging, Cloud Monitoring, Pub/Sub in Phase 2). Scale-to-zero saves cost. 300s timeout accommodates long AI generations.
- **Quality Attributes Affected:** Cost (+), operational simplicity (+), flexibility (+).

### ADR-6: Google OAuth2 + Self-Issued JWT

- **Status:** Accepted
- **Reversibility:** Two-way door (can add providers later)
- **Context:** Need user authentication. Target audience is global (user chose Global infra). Must be low-friction for writers.
- **Decision:** Google OAuth2 as sole authentication provider. API issues its own JWTs (access token 15min, refresh token 7d in httpOnly cookie).
- **Alternatives:** Kakao + Naver OAuth (rejected — user chose Global). Auth0/Clerk managed auth (rejected — adds dependency and cost for a simple OAuth flow). Magic link (rejected — higher friction than Google one-click).
- **Consequences:** Users need a Google account (near-universal). No email/password to manage. Simple implementation. Can add Kakao/Naver later if pivoting to Korea-first.
- **Quality Attributes Affected:** Simplicity (+), user friction (-for non-Google users), cost (+).

### ADR-7: Provider-Agnostic LLM Gateway as Rust Trait [Phase 1]

- **Status:** Accepted
- **Reversibility:** Two-way door
- **Context:** Must support multiple LLM providers with the ability to switch without code changes. Phase 1 uses CF Workers AI (primary) with Gemini Flash (fallback). Dev and prod use the same providers via REST API. Phase 2 adds model tiering.
- **Decision:** Define a Rust trait `LlmProvider` with methods for `generate_stream(prompt) -> Stream<Token>`, `generate(prompt) -> String`, and `summarize(text) -> String`. Implement per provider. Active provider selected via environment config. No external gateway service — compiled into the API binary.
- **Alternatives:** External LLM gateway/proxy (rejected — adds latency and operational overhead for Phase 1's single-provider usage). Direct API calls without abstraction (rejected — provider switching would require code changes).
- **Consequences:** Zero additional infrastructure. Provider switching is a config change. Each provider adapter handles its own request formatting, authentication, and response parsing. Cost tracking happens at the trait boundary (log tokens + model + cost per call). Phase 2 extends to model cascading by adding a routing layer above the trait.

```rust
// Simplified trait sketch (not implementation)
#[async_trait]
pub trait LlmProvider: Send + Sync {
    async fn generate_stream(&self, req: GenerateRequest)
        -> Result<Pin<Box<dyn Stream<Item = Result<Token>>>>, LlmError>;
    async fn generate(&self, req: GenerateRequest)
        -> Result<GenerateResponse, LlmError>;
    async fn summarize(&self, req: SummarizeRequest)
        -> Result<String, LlmError>;
}
```

- **Quality Attributes Affected:** Flexibility (+), testability (+), cost tracking (+), initial complexity (+).

---

## 11. AI/LLM Architecture

### LLM Integration Pattern

**Tier 2: LLM Gateway** — implemented as a Rust trait (ADR-7), not a separate service. The gateway provides:
- Unified interface across providers.
- Provider-specific request formatting (each provider has different API shapes).
- SSE stream consumption and re-emission.
- Token counting and cost tracking at the boundary.
- Retry logic (1 retry with 2s backoff on 5xx/timeout).

**Phase 1:** CF Workers AI as primary (free tier, 10K neurons/day). When free tier is exceeded, automatic fallback to Google Gemini Flash ($0.10/1M tokens). Configured via `LLM_PRIMARY=cloudflare` + `LLM_FALLBACK=gemini` env vars. Dev and prod use the same REST API endpoints — no local LLM needed.
**Phase 2:** Model cascading — lightweight model for summarization, mid-tier for scene generation, frontier for auto-structuring. Routing logic added above the trait.

### Context Assembly (Core AI Architecture)

Context assembly is the technical heart of Narrex — it transforms visual editing into prompt engineering without the user knowing.

**Per-scene generation prompt structure:**

```
[System]
You are a Korean web novel writer. Write a scene draft in Korean.

[Global Config]
Genre: {project.genre}
Theme: {project.theme}
Era/Location: {project.era_location}
POV: {project.pov}
Tone: {project.tone}

[Characters in This Scene]
{for each character assigned to scene:}
  Name: {character.name}
  Personality: {character.personality}
  Appearance: {character.appearance}
  Secrets: {character.secrets}
  Motivation: {character.motivation}
  Relationships: {relationships involving this character}

[Narrative Context — Preceding Scenes]
{for each preceding scene with a summary, ordered by start_position:}
  Scene {n}: {scene_summary.summary_text}

[Simultaneous Events — Other Tracks]
{for scenes on other tracks with overlapping timeline ranges:}
  Meanwhile: {scene.title} — {scene.plot_summary}

[Current Scene]
Title: {scene.title}
Location: {scene.location}
Mood: {scene.mood_tags}
Plot Summary: {scene.plot_summary}

[Next Scene Preview]
Next: {next_scene.title} — {next_scene.plot_summary}

[Instructions]
Write 1,500-3,000 Korean characters of prose for the current scene.
Maintain consistency with preceding events.
Reflect character personalities and relationships.
Match the configured genre, tone, and POV.
```

**Context window management:**
- Phase 1: Per-scene summaries (~100-200 tokens each) keep preceding context compact. A 20-scene project uses ~2,000-4,000 tokens for narrative context — well within any frontier model's window.
- Phase 2+: For 40+ episode novels, implement priority-based context: recent 5 scenes as full summaries, older scenes as compressed one-liners, foreshadowing-tagged events always preserved.

### Scene Summarization Pipeline

After each draft is finalized (generated or edited), the system generates and caches a summary:

1. Draft content → summarization prompt ("Summarize this scene in 2-3 sentences, preserving key plot events, character actions, and any foreshadowing.").
2. LLM generates summary (~50-100 tokens).
3. Summary stored in `scene_summary` table (keyed by `scene_id`, includes `draft_version` to track staleness).
4. Summary regenerated when the scene's draft changes.

This is the compression mechanism that makes "your structure is your prompt" scalable across dozens of scenes.

### Streaming Architecture

```
Writer clicks "Generate" → Web App POST /api/v1/scenes/{id}/generate
                         ← SSE: Content-Type: text/event-stream
                         ← data: {"token": "그는"}
                         ← data: {"token": " 눈을"}
                         ← data: {"token": " 떴다."}
                         ← ...
                         ← data: {"done": true, "stats": {...}}
```

- **Protocol:** SSE (Server-Sent Events). Standard for LLM streaming. Stateless, works with Cloud Run.
- **Backend:** Axum's `Sse` response type wraps an `async Stream`. The stream consumes tokens from the LLM provider and re-emits them to the client.
- **Frontend:** Custom `fetch` + `ReadableStream` consumer in SolidJS. Tokens appended to editor content as they arrive. No Vercel AI SDK (SolidJS, not React).
- **Timeout:** Cloud Run request timeout 300s. Client shows estimated remaining time.
- **Cancellation:** Client can abort the fetch. Server detects dropped connection and stops consuming from LLM provider (saves cost).

### Cost Optimization

| Strategy | Phase | Impact |
|----------|-------|--------|
| Prompt optimization (trim redundant context) | 1 | 15-30% cost reduction |
| Scene summary caching (don't re-summarize unchanged scenes) | 1 | Avoids ~30% of summarization calls |
| Generation dedup (Redis key prevents double-click) | 1 | Prevents wasted generations |
| Model cascading (cheap model for summaries, mid for scenes) | 2 | 70% cost reduction |
| Prompt caching (stable context prefix cached at provider) | 2 | 30-50% reduction on repeated prefix |

### AI Observability

Every LLM call logged to `generation_log`:
- `type`: `auto_structure`, `scene_generation`, `direction_edit`, `summarization`
- `model`, `provider`: which model was used
- `token_count_input`, `token_count_output`: for cost calculation
- `cost_usd`: computed from provider pricing at call time
- `duration_ms`: total generation time
- `status`: `success`, `error`, `cancelled`

Dashboard (PostHog): cost per user per day, generation count by type, average tokens per generation, error rate by provider.

### Guardrails

**Input validation:**
- Plot summary max length: 5,000 characters (prevents prompt injection via extremely long input).
- Character field max length: 2,000 characters each.
- Scene count per project: 200 max (prevents context assembly from becoming unbounded).

**Output validation:**
- Generated prose is not validated for content safety in Phase 1 (creative fiction — the user directs the content). Phase 2+: optional content filters configurable per project.
- Format validation: response must be non-empty text. If the model returns structured data or refuses, the generation is flagged as failed.

**No PII in prompts:** Prompts contain only story content (character names, plot details, config). User email/ID is never included in LLM calls.

---

## 12. Phase Implementation Summary

### Phase 1 — Core Loop MVP

**Components:**
- Web App: Dashboard, Project Creation, Workspace (Config Bar, Timeline Panel, Character Map Panel, Scene Detail Panel, Editor Panel)
- API: auth, project, timeline, character, generation, editor modules
- LLM Gateway: CF Workers AI (primary) + Gemini Flash (fallback)
- Context Assembler: config + characters + summaries + scene details
- Database: full ERD (see docs/erd.mermaid)

**Infrastructure:**
- GCP Cloud Run (API), Cloudflare Workers (Web), Neon (DB), R2 (files), Upstash Redis (sessions/rate-limit)
- Google OAuth
- Two LLM providers: CF Workers AI (free) + Gemini Flash (paid fallback)

**Key ADRs:** ADR-1 through ADR-7 (all apply)

**Deferred:** Episode organization, world map, temporal relationships, genre templates, multiple draft variations, tone sliders, AI Surprise, foreshadowing connections, AI gap detection, revision tools, inline autocomplete, export, Stripe billing, onboarding tutorial, AI chat panel.

### Phase 2 — Episode Layer & Polish

**New components:**
- Episode organization module (event-to-episode mapping, dividers, word count, hook types)
- AI Chat Panel (context-aware brainstorming)
- Export module (DOCX, EPUB, plain text)
- Genre template system
- Multiple draft variations (2-3 per scene) + tone/style sliders
- Foreshadowing connection lines
- Inline autocomplete
- Onboarding tutorial

**New integrations:**
- Stripe (subscription billing — Free, Basic, Pro, Pay-as-you-go)
- Model cascading in LLM Gateway (lightweight → mid-tier → frontier, may add OpenAI/Anthropic)
- Prompt caching (provider-level)

**Infrastructure changes:**
- GCP Pub/Sub for background processing (batch summarization, revision checks)
- Cloud Scheduler for periodic jobs (orphan R2 cleanup, generation log purge)

### Phase 3+ — Depth & Delight

**New components:**
- World map (visual map with location nodes, timeline integration)
- Temporal relationship tracking (character relationships change over story time)
- Revision tools (character consistency, foreshadowing verification, contradiction detection, style review)
- AI Surprise mode
- AI gap detection (suggests scenes to fill narrative holes)
- AI character/relationship suggestions

**New integrations:**
- pgvector on Neon (semantic search over manuscript for revision tools)
- Potentially dedicated vector DB if manuscript corpus exceeds pgvector performance ceiling

**Infrastructure changes:**
- Consider min-instances=1 on Cloud Run if traffic justifies (eliminate cold starts)
- Consider GCP Memorystore if Redis throughput needs exceed Upstash
