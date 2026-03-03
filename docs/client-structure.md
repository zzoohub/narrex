# Folder Structure

## Global Rules

- Each folder exposes its public API via `index.ts` barrel only.
- No cross-import within the same layer.

## App-layer & Routing (Framework-specific)

App-layer is the top-level FSD layer — providers, global styles, initialization. Route files are thin wrappers that import views.

| Framework | App-layer | Routing |
|-----------|-----------|---------|
| Next.js / Expo Router | `src/app/` (co-located) | `src/app/` |
| TanStack Start | `src/app/` | `src/routes/` (separate) |

<details>
<summary>Framework routing examples</summary>

**Next.js** (`src/app/`):
```
src/app/
├── layout.tsx
├── page.tsx         # import { HomePage } from '@/views/home'
├── some-page/
│   └── page.tsx     # Thin: import from @/views/, render it
├── globals.css
└── providers/
```

**TanStack Start**:
```
src/
├── app/
│   ├── providers.tsx
│   └── styles.css
├── routes/
│   ├── __root.tsx   # Root layout — imports from app/providers
│   ├── index.tsx    # Home — import from views/
│   └── some-page/
│       └── index.tsx
├── router.tsx
└── routeTree.gen.ts
```

**Expo Router** (`src/app/`):
```
src/app/
├── _layout.tsx
├── index.tsx
├── some-page/
│   └── index.tsx    # Thin: import from @/views/, render it
└── providers/
```

</details>

---

## Next.js & Expo

Standard 2D apps following Feature-Sliced Design. Both use `src/app/` as the router with co-located app-layer.

```
src/
├── app/             # Providers, global styles, routing (see above)
├── views/           # Full page layouts (compose widgets)
├── widgets/         # Standalone sections (Header, Sidebar, StatsCards)
├── features/        # User interactions (auth, send-comment, add-to-cart)
│   └── auth/
│       ├── ui/
│       ├── model/
│       ├── api/
│       └── actions/ # Server functions
├── entities/        # Business objects (user, product, order)
│   └── user/
│       ├── ui/
│       ├── model/
│       └── api/
└── shared/
    ├── ui/          # Design system
    ├── api/
    ├── lib/
    ├── hooks/
    ├── stores/      # Global state (auth, theme)
    ├── types/
    └── constants/
```

`views/` avoids naming conflict with `pages/` or `routes/` regardless of framework.

---

## Web 3D / WebXR

3D/XR-only applications. No or minimal 2D web pages.

**Stack**: Three.js (WebGPU-first) · React Three Fiber · Drei · TSL shaders · @react-three/xr · Koota ECS · Rapier WASM · Zustand · Rust WASM · glTF

### Base Structure

```
src/
├── app/
├── routes/
│
├── scene/                      # R3F components
│   ├── canvas.tsx              # WebGPU detect → WebGL fallback
│   ├── objects/
│   ├── environments/           # Lighting, skybox, post-processing
│   ├── cameras/
│   ├── materials/              # WebGPU/WebGL branching per material
│   ├── hooks/
│   └── helpers/
│
├── hud/                        # In-scene UI (mesh + HTML adaptive)
│   ├── controls/
│   ├── overlays/
│   └── panels/
│
├── xr/                         # WebXR (omit if not needed)
│   ├── session.tsx
│   ├── controllers/
│   ├── interactions/
│   └── spaces/
│
└── shared/
    ├── ui/                     # DOM overlay outside Canvas
    ├── api/
    ├── lib/
    ├── hooks/
    ├── stores/                 # Zustand — theme, modal, prefs
    ├── types/
    ├── constants/
    └── assets/                 # glTF, textures, audio
```

### Dependency Direction

```
  app/ + routes/
    ↓
  domains/          composes scene + engine
    ↓
  scene/  ─reads→  engine/
    ↓
  hud/
    ↓
  shared/

Cross-links:            Bridges:

  xr/         → scene/    scene/hooks/ecs/  → engine/ecs/   (React reads ECS, not reverse)
  networking/ → engine/   engine/adapters/  → engine/ecs/   (physics syncs into ECS)
  workers/    → engine/   domains/stores/   → scene/hooks/  (Zustand reads engine via bridge)
```

### State Ownership

| Store | Location | Example |
|-------|----------|---------|
| Zustand | `shared/stores/` | UI/meta — theme, modal, prefs |
| Zustand | `domains/[name]/stores/` | Domain-scoped — editor mode, tool selection |
| Koota | `engine/ecs/` | Simulation — position, velocity, AI |

---

## Web 2D + 3D / WebXR

Extends the 3D structure above. The key difference: 2D pages go in `site/`, 3D content is wrapped in `experience/`.

**Core rule: `site/` and `experience/` NEVER import each other.** Cross-layer data flows through `shared/stores/`.

### What Changes from 3D-only

| 3D-only | 2D + 3D | Notes |
|---------|---------|-------|
| `scene/`, `hud/`, `xr/` at top level | Nested under `experience/` | + `experience/canvas/` for renderer setup |
| — | `site/` added | FSD structure (views, widgets, features, entities, shared) |
| `shared/` | Three levels of shared | `shared/` (global), `site/shared/` (2D), `experience/shared/` (3D) |

### Base Structure

```
src/
├── app/
├── routes/                       # Routes to site/ (2D) or domains/ (3D)
│
├── site/                         # 2D layer (FSD)
│   ├── views/
│   ├── widgets/
│   ├── features/
│   ├── entities/
│   └── shared/
│       ├── ui/
│       ├── api/
│       ├── hooks/
│       └── lib/
│
├── experience/                   # 3D layer
│   ├── canvas/                   # WebGPU detect → WebGL fallback
│   ├── scene/
│   │   ├── objects/
│   │   ├── environments/         # Lighting, skybox, post-processing
│   │   ├── cameras/
│   │   ├── materials/            # WebGPU/WebGL branching per material
│   │   ├── hooks/
│   │   └── helpers/
│   ├── hud/                      # In-scene UI (mesh + HTML adaptive)
│   │   ├── controls/
│   │   ├── overlays/
│   │   └── panels/
│   ├── xr/
│   │   ├── session.tsx
│   │   ├── controllers/
│   │   ├── interactions/
│   │   └── spaces/
│   └── shared/
│       ├── hooks/
│       ├── lib/
│       └── assets/               # glTF, KTX2 textures, audio
│
└── shared/                       # Global (referenced by all layers)
    ├── api/
    ├── lib/
    ├── hooks/
    ├── stores/                   # Cross-layer state — never imports site/, experience/, engine/
    ├── types/
    └── constants/
```

### Dependency Direction

```
  app/ + routes/
    ↓
  domains/          composes experience + engine
    ↓
  experience/  ─reads→  engine/
    ↓
  shared/

  routes/ → site/ → shared/         (independent 2D branch)
  site/ ✕ experience/               (NEVER import each other)

Within experience/:

  canvas/ → scene/ → hud/ → experience/shared/
```

### Store Scoping

| Location | Scope | Example |
|----------|-------|---------|
| `shared/stores/` | Cross-layer (site + experience) | auth, user, language, theme |
| `domains/[name]/stores/` | Domain-scoped | editor mode, tool selection |
| `site/shared/` | 2D-only | form drafts, table sort/filter |
| `experience/shared/` | 3D-only | camera mode, render quality |
| `engine/ecs/` | Simulation (Koota) | position, velocity, forces |

---

## Extensions (Shared)

Add only when triggered. These apply to both **Web 3D** and **Web 2D + 3D** structures.

In 2D + 3D, prefix scene paths with `experience/` (e.g., `scene/hooks/ecs/` → `experience/scene/hooks/ecs/`).

```
+ engine/                       # Never imports React
│   ├── ecs/                    # Koota ECS
│   │   ├── components/         # Data definitions (Position, Velocity, Health)
│   │   ├── systems/            # Stateless logic that runs each frame
│   │   ├── queries/            # Entity filters (e.g., all entities with Position + Velocity)
│   │   ├── prefabs/            # Entity templates (Player, Bullet, NPC)
│   │   └── world.ts            # ECS world instance + system registration
│   ├── ports/
│   ├── adapters/
│   │   └── rapier/             # Physics → ECS sync
│   ├── physics/                # Imperative Rapier WASM
│   └── shaders/                # TSL / GLSL
│
+ scene/hooks/ecs/              # React bridge to engine/ecs/
+ scene/hooks/physics/          # React bridge to engine/physics/
│
+ domains/
│   └── [domain-name]/
│       ├── index.tsx
│       ├── use-cases/
│       ├── systems/            # Domain-specific ECS systems
│       ├── stores/
│       ├── hud/
│       └── config.ts
│
+ networking/                   # Multiplayer or real-time sync
+ content/                      # External data injected into 3D scene
│
+ workers/
│   └── compute-worker.ts
│
+ crates/                       # Rust source (project root)
│   └── compute/src/
+ wasm-out/                     # Build artifacts only (gitignored)
```

### When to Add

| Layer | Add when | Omit when |
|-------|----------|-----------|
| `site/` | 2D web pages exist | Pure 3D/XR app |
| `experience/` | 3D content exists | Pure 2D app |
| `xr/` | WebXR needed | No XR |
| `hud/` | In-scene control UI needed | No HUD |
| `engine/` | ECS, physics, or custom shaders | Simple 3D rendering only |
| `domains/` | 2+ independent areas with custom logic/state | Single scene |
| `networking/` | Multiplayer or real-time sync | Single user |
| `workers/` | CPU-bound computation offload | Main thread sufficient |
| `crates/` | Rust → WASM computation | JS/TS sufficient |
