# CLAUDE.md
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
<!-- Describe what this project does, who it's for, and core value proposition -->

## Principles & Constraints
### MUST (STRICTLY ENFORCED — NO EXCEPTIONS)
1. **TDD**: NEVER write implementation code before tests. Follow this exact sequence:
   1. Write ALL tests first as a complete spec
   2. Run tests — confirm they FAIL (red)
   3. Implement fully (no need for minimal/incremental steps)
   4. Run tests — confirm ALL pass (green)
   If you catch yourself writing implementation first, STOP and write the test first.
   - Axum: `nextest`
   - FastAPI: `pytest` + `httpx` + `anyio`
   - Next.js: `vitest` + `@testing-library/react`
   - TanStack/SolidJS: `vitest` + `@solidjs/testing-library`
2. **Post-check**: Run both sub-agents in parallel when all logic changes.
   Skip for cosmetic-only changes (styling, typos, renaming, formatting, docs).
   - **z-security-reviewer** + **z-verifier** (e2e + browser)
   > Fix → re-run → all pass, then proceed. When in doubt, run.
3. **Docs sync**: Any Changes to requirements, scope, architecture, data model, UX/UI, or structure → update `docs/`. API changes → also update `openapi/openapi.yaml`.

### MUST NOT
- (project-specific anti-patterns here)

## Architecture
<!-- Describe high-level architecture (e.g., "Axum API + Next.js web client + background workers") -->

### Monorepo Structure
```
├── apps/
│   ├── api/              # Backend API → Cloud Run
│   ├── worker/           # Background jobs → Cloud Run Jobs / CF Worker
│   ├── web/              # Web client → CF Pages / Vercel
│   └── mobile/           # Expo React Native
├── db/
│   ├── migrations/
│   ├── rollbacks/
│   └── seeds/
├── openapi/
│   └── openapi.yaml      # API contract (source of truth)
├── e2e/                  # End-to-end tests
├── docs/                 # Product planning (what and how to build)
├── biz/                  # Business operations (how to sell & grow)
└── justfile              # dev, test, deploy commands
```

## Environment

| Service | Dev                         | Prod |
|---------|-----------------------------|------|
| Web     | `localhost:3000`            | TBD  |
| Mobile  | Expo Dev Client (`19000`)   | TBD  |
| API     | `localhost:8080`            | TBD  |
| Worker  | `localhost:8081~`           | TBD  |
| DB      | Docker Compose (`5432`)     | TBD  |
| Redis   | Docker Compose (`6379`)     | TBD  |
| LLM     | CF Workers AI (REST API)    | CF Workers AI (free) → Gemini Flash (fallback) |

## Build & Dev Commands
All commands in `justfile`. Run `just --list` to see all recipes.

## API
### API Workflow (MUST FOLLOW)
- Schema changes: **z-database-design** → **z-rest-api-design** (plan)
- Default: **z-axum-hexagonal** + **z-postgresql** (queries)
<!-- If using FastAPI, replace z-axum-hexagonal with appropriate sub-agent -->

### API Conventions
<!-- Define API conventions (e.g., error format, auth strategy, pagination style) -->

## Worker
<!-- If worker is needed -->

## Web
### Web Workflow (MUST FOLLOW)
- Design system: **z-design-system**
- UI: **frontend-design**
- Web source code: **z-solidjs**  
- Motion: **z-motion**

### FSD Import Rules
- `app(routing) → views → widgets → features → entities → shared` (never import upward)

### Web Conventions
- **Type safety**: Enforce the strictest TypeScript compiler options.
- **I18n**: All user-facing text must support en and ko.
- **Responsive**: Support all screen sizes.
- **Dark mode**: Support light and dark themes.
<!-- Add project-specific UI conventions -->
