# Narrex — Architecture Design Doc

**Date**: 2026-03-07
**PRD**: docs/prd.md | docs/prd-phase-1.md

---

## 1. Problem & Context

### 1.1 What This Solves

Aspiring Korean web novel writers have stories in their heads but can't turn them into manuscripts. The bottleneck is scene-level development — structuring dozens of events and producing prose — not sentence-level writing. Current tools operate at the wrong granularity: sentence autocomplete or full auto-generation. Narrex introduces scene-level AI generation within a visual timeline, where the structure the author builds *is* the AI prompt. Phase 1 validates the core loop: idea in → visual structure out → scene-by-scene AI drafting → author editing.

### 1.2 System Context

![System Context](diagrams/system-context-dark.svg)

A desktop-first web application. The writer interacts with a SolidJS frontend that communicates with a Rust API server. The API authenticates via Google OAuth, generates prose via two LLM providers (CF Workers AI primary, Gemini Flash fallback), persists data in Neon PostgreSQL, and caches context in Upstash Redis.

### 1.3 Assumptions

- CF Workers AI free tier sustains Phase 1 traffic (<1000 generations/day).
- Scene-level Korean prose from current models (Llama 3.1 70B, Gemini Flash) is good enough to revise, not discard.
- Per-scene summaries (~200-300 tokens) preserve sufficient narrative fidelity for context assembly over 10-20 scenes.
- Desktop-first is acceptable — target users write on laptops in 1-3 hour sessions.
- Solo developer for Phase 1 — architecture must be operable by one person.

---

## 2. Goals & Non-Goals

### Goals

- Validate the idea → structure → generate → edit core loop with real users.
- Support multi-track timeline with scenes, branch/merge, and parallel storylines.
- Deliver scene-level AI drafts with full narrative context assembly (config, characters, preceding summaries, simultaneous events).
- Stream AI output via SSE to reduce perceived latency (<2s to first token).
- Keep infrastructure cost near-zero at launch (<$20/month at 100 DAU).

### Non-Goals

- Episode organization layer (Phase 2).
- Multiple draft variations or tone/style sliders (Phase 2).
- World map, temporal relationship tracking (Phase 3).
- Mobile app, real-time collaboration, social features (out of scope per PRD).
- Revision/consistency tools, export to DOCX/EPUB (Phase 2-3).
- Kakao/Naver OAuth (evaluate after user research; Google-only for Phase 1).

---

## 3. Architecture

### 3.1 Architecture Style

**Modular Monolith + Request-Response** with SSE streaming for AI generation.

Solo developer building a single product with tightly coupled domains — projects, scenes, characters, and generation all share data extensively. A monolith avoids deployment overhead and inter-service communication. Modules are separated by domain with clean interfaces (Rust traits as ports), extractable to services later if team structure demands it.

SSE streaming is used only for AI generation endpoints where tokens arrive progressively. Everything else is standard request-response.

### 3.2 Stack & Rationale

| Layer | Choice | Why | Considered & Rejected |
|---|---|---|---|
| Backend | Rust / Axum | Sub-ms responses, 10-30MB memory, compiler prevents entire error classes, lowest cloud cost. LLM integration is HTTP calls via `reqwest` + `serde` — no Python needed. | FastAPI — no Python-only libraries required; Hono — Workers execution time limits too tight for LLM streaming. |
| LLM Crate | `crates/llm` (workspace crate) | LLM provider abstraction as a separate crate — compile-time boundary enforcement, independently testable, reusable outside the API. | In-module trait — no physical boundary; coupling leaks over time. |
| Frontend | TanStack Start + SolidJS | Fine-grained reactivity ideal for timeline (many DOM nodes updating independently during drag-and-drop). Smaller bundles than React. Already implemented in `web/`. | Next.js — SolidJS's surgical DOM updates suit the timeline better than React's virtual DOM diffing. |
| Database | Neon PostgreSQL (us-east-1) | Scale-to-zero (free at launch), branch-based dev workflow, pgvector for future embeddings, serverless driver. Co-located with Cloud Run in Virginia. | Supabase Seoul — global audience chosen; Docker Compose Postgres — no branching, no scale-to-zero in prod. |
| Cache | Upstash Redis | HTTP API works from Cloud Run and edge. Scale-to-zero pricing. Handles rate limiting + context cache. | Self-managed Redis — operational overhead for a solo dev. |
| API Hosting | GCP Cloud Run (us-east4) | Container-based, auto-scale to zero, generous free tier, 300s timeout for LLM streaming. | CF Workers — execution time limits; Fly.io — less GCP ecosystem integration. |
| Web Hosting | Cloudflare Workers | TanStack Start deploys natively via Nitro. Edge-first, free plan. Already using CF for CDN/DNS. | Vercel — adds another vendor for no benefit. |
| CDN / DNS | Cloudflare | Free tier: global CDN, DDoS protection, WAF. Frontend already deployed here. | — |

### 3.3 Container Diagram

![Container Diagram](diagrams/container-dark.svg)

### 3.4 Crate & Module Structure

```
├── crates/
│   └── llm/                  # Workspace crate — LLM provider abstraction
│       ├── src/
│       │   ├── lib.rs
│       │   ├── provider.rs   # LlmProvider trait + request/response types
│       │   ├── cf_workers.rs # CF Workers AI implementation
│       │   ├── gemini.rs     # Gemini Flash implementation
│       │   └── gateway.rs    # Failover routing (primary → fallback)
│       └── Cargo.toml
├── api/                      # Axum server — depends on crates/llm
│   └── src/
│       ├── modules/
│       │   ├── auth/         # Google OAuth, JWT, sessions
│       │   ├── project/      # Project CRUD, story config
│       │   ├── timeline/     # Tracks, scenes, branch/merge
│       │   ├── character/    # Characters, relationships
│       │   └── ai/           # Prompt assembly, context compression,
│       │                     # structuring, generation, editing
│       └── ...
└── Cargo.toml               # Workspace root
```

| Layer | Component | Owns | Dependencies |
|---|---|---|---|
| **crate** | `llm` | `LlmProvider` trait, CF Workers AI + Gemini Flash impls, failover gateway, SSE stream types | None (standalone) |
| **module** | `auth` | User accounts, sessions, JWT, Google OAuth | — |
| **module** | `project` | Project CRUD, story config (genre, tone, era, POV, mood) | auth |
| **module** | `timeline` | Tracks, scenes (CRUD, NLE positioning, status), branch/merge connections | project |
| **module** | `character` | Characters (CRUD, profiles), relationships (type, label, direction) | project |
| **module** | `ai` | Prompt assembly, context compression, auto-structuring, scene generation, direction-based edits | project, timeline, character, `llm` crate |

`llm` crate handles **how** to talk to LLM providers. `ai` module handles **what** to ask — prompt construction, context assembly, and orchestration of use cases (`structure_project()`, `generate_scene()`, `edit_passage()`).

Code structure is **hexagonal (ports & adapters)**. Domain logic has no infrastructure dependencies. The `llm` crate boundary is enforced by the compiler — it cannot import API internals.

---

## 4. Data

### 4.1 Storage Strategy

| Store | Holds | Why | Consistency |
|---|---|---|---|
| **Neon PostgreSQL** | Users, projects, tracks, scenes (metadata + prose content), characters, relationships, scene summaries, generation logs | Relational data with complex joins (scene → characters → relationships). `start_position` + `duration` NLE model requires range queries. pgvector available for future semantic search. | Strong (single writer, single DB) |
| **Upstash Redis** | Rate limiting counters, cached assembled prompt context, hot scene summaries | Fast reads for hot data. TTL-based expiration. HTTP API works from Cloud Run. | Eventual (cache; Postgres is source of truth) |

No object storage in Phase 1 — character profile images stored as URLs (placeholder or user-provided link).

### 4.2 Key Data Flows

**Flow 1: Idea → Auto-Structured Project**

```
User input (text or file)
  → API: ai module (structure_project)
  → llm crate: generate_stream via LlmGateway
  → Parse structured JSON from LLM response
  → Write to Postgres: project + config + tracks + scenes + characters + relationships
  → Return structured result to client
```

**Flow 2: Scene AI Draft Generation**

```
User selects scene → clicks Generate
  → API: ai module (generate_scene)
  → Read from Postgres:
      - Global config (genre, tone, era, POV)
      - Scene details (title, summary, characters, location, mood)
      - Character cards + relationships for involved characters
      - Compressed summaries of preceding scenes (from scene_summaries table)
      - Simultaneous events (scenes with overlapping start_position + duration on other tracks)
      - Next scene's title + summary
  → Assemble prompt (~4-8K tokens)
  → llm crate: generate_stream via LlmGateway
  → Stream tokens to client via SSE
  → On completion: insert versioned draft row (draft table), update scene.status, generate + store scene summary
```

**Flow 3: Direction-Based Edit**

```
User selects text → enters direction ("more tension")
  → API: ai module (edit_passage)
  → Same context assembly as Flow 2 + selected text + surrounding text
  → llm crate: generate_stream via LlmGateway
  → Stream replacement to client
  → On completion: insert new draft version (draft table), update scene.status
```

### 4.3 Caching

| What | Where | TTL | Invalidation |
|---|---|---|---|
| Scene summaries | Postgres (durable) + Redis (hot) | Redis: 1 hour | Regenerated when scene content changes |
| Assembled prompt context | Redis | 15 minutes | Invalidated on config, character, or preceding scene changes |
| Rate limit counters | Redis | Rolling window | Automatic expiry |

Scene summaries are the critical cache — they prevent re-reading and re-summarizing all prior scenes on every generation request.

---

## 5. Infrastructure & Cost

### 5.1 Compute & Deployment

- **API**: Docker container → GCP Cloud Run (us-east4). Auto-scales 0-10 instances. Min instances: 0. Request timeout: 300s for generation endpoints, 60s for everything else.
- **Web**: TanStack Start → Cloudflare Workers (global edge) via Nitro adapter. Deployed via `wrangler`.
- **CI/CD**: GitHub Actions. On push to main: build Rust binary in Docker, deploy to Cloud Run; build web, deploy to CF Workers.
- **Dev**: `just api-dev` (cargo watch), `just web-dev` (vite dev). Neon branch for dev database.

### 5.2 Cost Estimate

| Component | Launch (~100 DAU) | Growth (~1K DAU) |
|---|---|---|
| Cloud Run | ~$0 (free: 2M req/mo) | ~$15-30 |
| Neon PostgreSQL | ~$0 (free: 0.5GB, 190 compute hrs) | ~$19 (Scale plan) |
| Upstash Redis | ~$0 (free: 10K cmd/day) | ~$10 |
| CF Workers AI | ~$0 (free tier) | ~$0 |
| Gemini Flash (fallback) | ~$2-5 | ~$20-50 |
| Cloudflare (Workers + CDN) | ~$0 (free plan) | ~$5 (Workers Paid) |
| Sentry | ~$0 (free: 5K errors/mo) | ~$0 |
| **Total** | **~$2-5/mo** | **~$70-115/mo** |

AI generation is the biggest variable cost. CF Workers AI free tier is the primary mitigation. Gemini Flash at $0.10/1M input tokens + $0.40/1M output tokens keeps fallback costs low (~$0.002 per scene generation at ~4K tokens).

---

## 6. Auth & Security

- **Authentication**: Google OAuth2 → self-issued JWT. Access token: 15 min, in-memory. Refresh token: 30 days, httpOnly secure cookie.
- **Authorization**: Simple ownership model — users access only their own projects. No RBAC needed in Phase 1 (single user type, no sharing).
- **Security measures**:
  - Cloudflare WAF + rate limiting at edge.
  - CORS restricted to web app domain.
  - Input validation via Rust types — `serde` deserialization rejects malformed data at the boundary.
  - SQL injection prevented by SQLx parameterized queries (compile-time checked).
  - Secrets via Cloud Run environment variables (secret binding).
  - LLM outputs sanitized before storage (strip injected markup).
  - Prompt injection defense: system prompt separated from user content via clear delimiters; user text placed in designated context sections, never in instruction section.

---

## 7. Observability

- **Logging**: Structured JSON to stdout → GCP Cloud Logging (auto-collected from Cloud Run). Fields: `request_id`, `user_id`, `scene_id`, `model`, `tokens_in`, `tokens_out` on generation requests.
- **Error tracking**: Sentry for API (Rust `sentry` crate) and web (SolidJS). Captures panics, unhandled errors, LLM generation failures.
- **Health check**: `GET /health` → verifies DB connection + Redis ping. External monitor (BetterStack free tier) pings every 60s.
- **AI metrics**: Per-generation log stored in Postgres: model used, input/output tokens, latency (time-to-first-token + total), estimated cost. Queryable for cost analysis and quality correlation.

---

## 8. External Services

| Service | Purpose | If It's Down |
|---|---|---|
| Neon PostgreSQL | Primary data store | System offline — no fallback for primary DB |
| Upstash Redis | Cache, rate limiting | Degrade gracefully: skip cache (read from Postgres), disable rate limiting |
| CF Workers AI | Primary LLM | Automatic failover to Gemini Flash |
| Google Gemini Flash | Fallback LLM | Generation unavailable — show error with retry |
| Google OAuth | Authentication | New logins blocked; existing sessions (JWT) continue working |
| Cloudflare | CDN, DNS, web hosting | Web app unreachable — external dependency, no mitigation |
| Sentry | Error tracking | Errors go untracked — no user-facing impact |

---

## 9. AI/LLM Architecture

### 9.1 Integration Pattern: `llm` Crate (Tier 2)

LLM provider abstraction lives in a separate workspace crate (`crates/llm`). The API depends on it but the crate has zero knowledge of business logic — it only knows how to talk to LLM providers and stream responses.

```rust
// crates/llm/src/provider.rs
#[async_trait]
pub trait LlmProvider: Send + Sync {
    async fn generate(&self, req: GenerateRequest) -> Result<GenerateResponse>;
    async fn generate_stream(
        &self,
        req: GenerateRequest,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<String>> + Send>>>;
}
```

Two implementations in the crate:
- `CfWorkersAiProvider` — primary. REST API, free tier.
- `GeminiFlashProvider` — fallback. REST API, $0.10/$0.40 per 1M tokens.

`LlmGateway` in the crate handles failover routing: try CF Workers AI first, fall back to Gemini Flash on failure (timeout >30s, 5xx, rate limit 429). Logs every failover. Returns a unified response shape regardless of provider.

The API's `ai` module consumes the crate — it assembles prompts, passes them to the gateway, and handles the streamed response.

### 9.2 Streaming

SSE for all generation endpoints:
- `POST /api/scenes/{id}/generate` → SSE stream of prose tokens
- `POST /api/scenes/{id}/edit` → SSE stream of replacement tokens
- `POST /api/projects` (with structuring) → SSE stream of structuring progress

Implementation: Axum's `Sse` response type with `async-stream`. The API proxies the LLM provider's SSE stream to the client, transforming provider-specific formats into a unified event shape.

Frontend consumption: Custom `fetch` + `ReadableStream` parser in SolidJS. No Vercel AI SDK dependency (no SolidJS adapter).

Cloud Run timeout: 300s for `/generate` and `/edit` endpoints to accommodate long generations.

### 9.3 Context Assembly Pipeline

For each scene generation, the system assembles a prompt from structured data:

| Context Source | Data | Approx. Tokens |
|---|---|---|
| System instruction | Generation rules, output format, language | ~500 |
| Global config | Genre, theme, era, POV, mood tags | ~100 |
| Scene details | Title, plot summary, location, mood tags | ~200 |
| Involved characters | Cards (personality, appearance, secrets, motivation) | ~300-600 |
| Relationships | Between involved characters | ~50-100 |
| Preceding scene summaries | AI-compressed summaries of earlier scenes | ~1000-3000 |
| Simultaneous events | Scenes with overlapping timeline ranges | ~200-400 |
| Next scene preview | Title + plot summary | ~100 |
| **Total** | | **~2500-5000** |

Fits within CF Workers AI context windows (8K-128K depending on model). Assembly is deterministic given the same data — no randomness in prompt construction.

### 9.4 Context Compression

After each scene draft is completed, the system generates a compressed summary (~200-300 tokens):

```
Compression prompt: "Summarize this scene in 200 words, preserving:
key plot events, character actions and emotional states,
any foreshadowing or setup, location changes."
```

Summaries are stored in a `scene_summary` table in Postgres (durable) and cached in Redis (fast reads). When generating a later scene, all preceding summaries are included instead of full scene text. This keeps context manageable across 20+ scene projects.

At 15 scenes with 250-token summaries ≈ 3750 tokens — well within limits. Quality validation needed at 20+ scenes per PRD risk matrix.

### 9.5 Cost Management

- **CF Workers AI free tier**: Primary for all generation. Eliminates cost for the majority of requests.
- **Gemini Flash ($0.10/$0.40 per 1M tokens)**: Fallback only. ~$0.002 per scene generation at ~4K input + ~2K output tokens.
- **Context compression**: Reduces per-generation input by ~80% compared to full prior scene text.
- **No prompt caching API in Phase 1**: Stable context (config, characters) changes rarely but native provider caching is deferred to Phase 2.
- **Generation logging**: Every request logged with token counts and estimated cost for real-time burn rate tracking.

### 9.6 Guardrails

- **Input validation**: Plot summaries length-limited (5K chars), edit directions (500 chars), character profile fields (2K chars each). Sanitized at API boundary.
- **Output validation**: Reject if <100 chars or >10K chars (likely failure). Check for degenerate repetition.
- **Prompt injection**: System instructions and user content are separated by clear structural delimiters. User text (plot summaries, character descriptions) is placed in designated `<context>` sections, never in the instruction block.
- **No PII concerns**: All content is fictional creative writing authored by the user.

---

## 10. Risks & Open Questions

### Risks

| Risk | Impact | What I'll Do |
|---|---|---|
| CF Workers AI free tier gets rate-limited or deprecated | Cost structure breaks — all generation becomes paid | Gemini Flash fallback is already built. Monitor CF rate limits. Evaluate other free/cheap providers as backup. |
| Korean prose quality from CF models is poor | Core value proposition fails — users discard drafts instead of editing | Pre-launch: benchmark 50 test scenes across 3 genres. If insufficient, make Gemini Flash primary (accept ~$50/mo cost at 1K DAU). |
| Context window limits degrade quality at 15+ scenes | Later scenes lose narrative continuity, contradictions appear | Monitor per-scene quality by position. If summaries lose critical details, invest in hierarchical summarization (chapter-level + scene-level). |
| Neon cold start after idle (5 min auto-suspend on free tier) | First request after idle has ~1-2s extra latency | Acceptable for Phase 1 beta. Upgrade to Scale plan (configurable suspend timeout) when latency matters. |
| Solo dev across Rust + SolidJS is a wide stack | Slower velocity on unfamiliar code paths | Lean on AI-assisted development. Keep architecture simple (monolith). Avoid premature optimization. |

### Open Questions

- **Which CF Workers AI model for Korean prose?** Need to benchmark: `@cf/meta/llama-3.1-70b-instruct` vs `@cf/google/gemma-2-27b-it` vs others for Korean quality. Decision: test before implementation, choose based on output quality.
- **Notion .zip import parsing?** Notion exports contain nested Markdown + metadata. Need a parser that extracts narrative content. Evaluate libraries at implementation time — likely a custom Markdown extractor.
- **Should Phase 1 include Kakao OAuth?** PRD targets Korean users who may not have Google accounts. Google-only is simplest. Adding Kakao is a two-way door (just another OAuth provider). Decide after initial user research.

---

## 11. Key Decisions

### Decision: Rust/Axum over FastAPI
- **Chose**: Rust / Axum
- **Over**: FastAPI (Python), Hono (TypeScript)
- **Because**: No Python-only libraries needed — LLM calls are HTTP via `reqwest`. Rust gives sub-ms latency, 10-30MB memory, and compile-time safety. Lower cloud cost critical for solo economics. Type-safe SSE streaming via Axum's native `Sse` type.
- **Revisit when**: A Python-only library becomes essential (ML model hosting, specific NLP pipeline that can't be called via API).

### Decision: Modular Monolith over Microservices
- **Chose**: Single Cloud Run service with domain-separated modules
- **Over**: Separate services per domain (auth, generation, timeline, etc.)
- **Because**: Solo developer. Domains are tightly coupled — generation reads from every other module. One deployment = one CI pipeline, one container, one log stream. Conway's Law: one developer → one deployable unit.
- **Revisit when**: Team grows beyond 2 developers, or generation needs GPU compute (separate service with different scaling profile).

### Decision: Neon over Supabase
- **Chose**: Neon PostgreSQL (us-east-1, Virginia)
- **Over**: Supabase (Seoul), Docker Compose Postgres
- **Because**: Scale-to-zero pricing (free at launch), branch-based dev workflow, pgvector built-in for future embeddings. Global audience → Seoul region not critical. Co-located with Cloud Run us-east4 (both Virginia, ~1-3ms cross-cloud latency).
- **Revisit when**: Korean users report latency issues, or Neon launches an Asia region.

### Decision: `llm` as Separate Workspace Crate
- **Chose**: `crates/llm` — standalone workspace crate for LLM provider abstraction
- **Over**: In-module trait inside the API
- **Because**: Compiler-enforced boundary — the crate physically cannot import API internals. Independently testable (mock providers without spinning up Axum). Reusable if a CLI tool or worker needs LLM access. Zero runtime cost — it's a library, not a service.
- **Revisit when**: Never needs revisiting — this is strictly better than an in-module trait.

### Decision: CF Workers AI + Gemini Flash (Dual Provider)
- **Chose**: Two provider implementations behind `LlmProvider` trait in `crates/llm`
- **Over**: Single provider (OpenAI/Anthropic), managed gateway (LiteLLM sidecar)
- **Because**: CF Workers AI is free — critical at launch with no revenue. Gemini Flash is the cheapest quality fallback. The trait + gateway live in-process with zero latency overhead. No sidecar to deploy or monitor.
- **Revisit when**: Need 3+ providers or A/B testing across models at scale. Then evaluate a managed gateway.

### Decision: Google OAuth Only (Phase 1)
- **Chose**: Google OAuth2
- **Over**: Kakao + Naver + Google, magic link, Supabase Auth
- **Because**: Simplest implementation. Korean users have Google accounts (Android, YouTube, Gmail). Adding Kakao is a two-way door — just another OAuth provider, addable in weeks.
- **Revisit when**: User acquisition data shows bounce at login, or qualitative feedback requests Kakao.

### Decision: SSE over WebSocket for AI Streaming
- **Chose**: Server-Sent Events
- **Over**: WebSocket, long polling
- **Because**: Unidirectional server → client streaming is all we need for token delivery. SSE is stateless, built on HTTP, trivially handled by Cloud Run. WebSocket adds connection management complexity for no benefit.
- **Revisit when**: Real-time collaboration is added (explicitly out of scope per PRD).
