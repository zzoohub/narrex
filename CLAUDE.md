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
│   └── worker/           # Queue, cron, pub/sub handlers
├── clients/
│   ├── web/
│   └── mobile/           # Expo React Native
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

## Principles & Constraints
### MUST
1. Any change to requirements, product scope, architecture, data model, UX/UI design, or project structure must be reflected in `docs/`.
2. Any change to tracking, analytics, pricing, growth strategy, marketing, legal terms, or ops processes must be reflected in `biz/`.
3. All service code changes must use skills, including after plan mode.
4. After implementation, check if sub-agents are needed and run in parallel:
   - **z-security-reviewer**: Run when changes affect security-sensitive areas (auth, data access, API endpoints).
   - **z-verifier**: Run when changes include testable code (new/modified functions, logic branches). 
   > Skip all for docs/copy-only changes. Skip browser test if `claude-in-chrome` MCP is unavailable.

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
- Web source code: **vercel-composition-patterns** (composition) → **vercel-react-best-practices** (optimization)

### FSD Import Rules
- `app(routing) → views → widgets → features → entities → shared` (never import upward)

### Web Conventions
- **Type safety**: Enforce the strictest TypeScript compiler options.
- **I18n**: All user-facing text must support en, es, pt-BR, id, ja and ko
- **Responsive**: Support all screen sizes.
- **Dark mode**: Support light and dark themes.
<!-- Add project-specific UI conventions -->

## Mobile
### Mobile Workflow
- Design system: **z-design-system**
- Mobile source code: **expo-app-design:building-native-ui** (implementation) → **vercel-react-native-skills** (improve)
<!-- Add or replace sub-agent as needed -->

### Mobile Conventions
- **Type safety**: Enforce the strictest TypeScript compiler options.
- **I18n**: All user-facing text must support en, es, pt-BR, id, ja and ko.
- **Dark mode**: Support light and dark themes.
<!-- Add project-specific mobile conventions -->
