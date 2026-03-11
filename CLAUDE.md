# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Narrex is a web-based visual novel editor with AI scene generation for Korean web novel writers. Authors structure stories visually on an NLE-style timeline and generate scene-level prose with AI assistance. Currently in Phase 1: idea → visual structure → AI-assisted scene drafting → author editing.

## Principles & Constraints

### MUST (STRICTLY ENFORCED — NO EXCEPTIONS)
1. **TDD**: NEVER write implementation code before tests. Follow this exact sequence:
   1. Write ALL tests first as a complete spec
   2. Run tests — confirm they FAIL (red)
   3. Implement fully (no need for minimal/incremental steps)
   4. Run tests — confirm ALL pass (green)
   If you catch yourself writing implementation first, STOP and write the test first.
   - Axum: `nextest`
   - TanStack/SolidJS: `vitest` + `@solidjs/testing-library`
2. **Post-check**: Run both sub-agents in parallel when all logic changes.
   Skip for cosmetic-only changes (styling, typos, renaming, formatting, docs).
   - **z-security-reviewer** + **z-verifier** (e2e + browser)
   > Fix → re-run → all pass, then proceed. When in doubt, run.
3. **Docs sync**: Any changes to requirements, scope, architecture, data model, UX/UI, or structure → update `docs/`. API changes → also update `openapi/openapi.yaml`.

### MUST NOT
- Import upward in FSD layers (shared ← entities ← features ← widgets ← views ← app)
- Hardcode user-facing strings — use `useI18n()` with both `ko` and `en` entries
- Skip RFC 9457 ProblemDetail format for API error responses
- Pass JSX directly as component props — use arrow functions instead: `icon={() => <Icon />}` not `icon={<Icon />}`. SolidJS SSR compiler wraps JSX props in getters (lazy, inside parent), but client compiler evaluates eagerly (before parent), causing hydration key mismatch → "template2 is not a function" in dev mode.

## Build & Dev Commands

All commands via `just`. Run `just --list` to see all recipes.

## Architecture

**Axum API** (Rust, hexagonal) + **TanStack Start/SolidJS web client** + **Neon PostgreSQL** + **LLM gateway** (CF Workers AI → Gemini Flash fallback).

### API — Hexagonal Architecture (`apps/api/src/`)

```
domain/{module}/                # Business logic: models.rs, service.rs, ports.rs, error.rs
inbound/http/{module}/          # HTTP adapters: handlers.rs, request.rs, response.rs
inbound/http/server.rs          # AppState, build_router() — all route registration
inbound/http/middleware/auth.rs # AuthUser JWT extractor
inbound/http/error.rs           # RFC 9457 ProblemDetail serialization
outbound/postgres/{table}.rs    # SQLx repository implementations
outbound/jwt.rs                 # JwtTokenService (access 15min, refresh 30d)
outbound/storage.rs             # R2Storage (Cloudflare R2)
```

**Modules**: auth, project, timeline, character, ai, sample

**Patterns**:
- Services are `Arc<dyn Port>` in `AppState`, injected in `main.rs`
- Domain enums use `strum` (Display/FromStr), serialized as strings in JSON
- Auth: Google OAuth2 → JWT (HS256). `AuthUser` extractor validates Bearer token.
- SSE streaming for AI generation and editing endpoints
- Port traits: `#[async_trait]`, `Clone + Send + Sync + 'static`

### LLM Crate (`apps/api/crates/llm/`)

Separate workspace member. `LlmProvider` trait → `CfWorkersAiProvider` (primary, free) + `GeminiFlashProvider` (fallback). `LlmGateway` handles transparent failover. Supports both one-shot and streaming generation.

### Web — FSD + TanStack Start (`apps/web/src/`)

```
routes/                 # TanStack Router files (thin wrappers, auto-generates routeTree.gen.ts)
app/providers.tsx       # I18nProvider + ThemeProvider
views/                  # Page-level components
widgets/                # Composite multi-component layouts
features/               # Feature-specific logic (workspace, structuring, generation)
entities/               # Domain entities (project, character, scene, track)
shared/                 # Types, stores (signals), API client, i18n, UI components
```

**Key conventions**:
- Path alias: `@/*` → `./src/*`
- Route params: `project.$id.tsx` (TanStack Router format)
- i18n in `shared/lib/i18n.tsx` (JSX file — provides context)
- Design system "Ink & Amber": dark-first, CSS vars (`canvas`, `surface`, `accent`, `fg`)
- Timeline: NLE clips model — scenes have `startPosition + duration`, CSS class `.tl-clip`
- State: Solid signals (theme, auth) + SolidQuery (server state)
- TypeScript strictest mode (exactOptionalPropertyTypes, etc.)

### Database

- Migrations: `db/migrations/` (SQLx format)
- Schema: user_account, project, track, scene, character, relationship, connection, draft, scene_summary, generation_log, context
- Enums: scene_status, connection_type (branch/merge only), pov_type, generation_type
- Soft deletes via `deleted_at`; `updated_at` triggers; GIN index on `mood_tags`
- Scenes: `start_position DOUBLE PRECISION` + `duration DOUBLE PRECISION DEFAULT 1.0`

## API Workflow (MUST FOLLOW)
- Schema changes: **z-database-design** → **z-rest-api-design** (plan)
- Implementation: **z-axum-hexagonal** + **z-postgresql** (queries)

## Web Workflow (MUST FOLLOW)
- Design system: **z-design-system**
- UI: **frontend-design**
- Web source code: **z-solidjs**
- Motion: **z-motion**

## Environment

| Service | Dev | Prod |
|---------|-----|------|
| Web | `localhost:3000` | CF Workers |
| API | `localhost:8080` | GCP Cloud Run (us-east4) |
| DB | Docker Compose (`:5432`) | Neon PostgreSQL (us-east-1) |
| Redis | Docker Compose (`:6379`) | Upstash Redis |
| Storage | — | Cloudflare R2 |
| LLM | CF Workers AI | CF Workers AI → Gemini Flash (fallback) |

Package managers: `bun` (web), `cargo` (api). Cargo workspace root: `apps/api/Cargo.toml`.
