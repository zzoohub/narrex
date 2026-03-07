# CLAUDE.md
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
<!-- Describe what this project does, who it's for, and core value proposition -->

## Architecture
<!-- Describe high-level architecture (e.g., "Axum API + Next.js web client + background workers") -->

### Monorepo Structure
```
├── services/
│   ├── api/              # Backend API
│   ├── crates/           # Rust crates
│   └── worker/           # Queue, cron, pub/sub handlers
├── web/
├── db/
│   ├── migrations/
│   └── seeds/
├── infra/                # Pulumi IaC
├── openapi/
│   └── openapi.yaml      # API contract (source of truth)
├── docs/                 # Product planning (what and how to build)
├── biz/                  # Business operations (how to sell & grow)
└── scripts/
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

## Principles & Constraints
### MUST
1. After implementation, run post-check sub-agents (skip for docs-only or copy-only changes):
   - Run in parallel: **z-security-reviewer** (if auth/data/API changed) and **z-tester** (write & run tests)
   - Then sequentially: **z-verifier** (after z-tester passes)
   > Sub-agents report only. Fix → re-run → pass, then next step.
2. Any change to requirements, product scope, architecture, data model, UX/UI design, or project structure must be reflected in `docs/`.

### MUST NOT
- (project-specific anti-patterns here)

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
