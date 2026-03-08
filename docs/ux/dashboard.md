# Dashboard

**Route:** `/`
**Primary action:** Create a new project
**Entry points:** Direct navigation, post-login redirect

---

## Layout

```
+---------------------------------------------------------------+
| Narrex                                    [Account] [?]       |
+---------------------------------------------------------------+
|                                                               |
|  Your Projects                          [+ New Project]       |
|                                                               |
|  +------------------+  +------------------+  +------------+   |
|  | Project Card     |  | Project Card     |  | + New      |   |
|  | Title            |  | Title            |  | Project    |   |
|  | X scenes, Y done |  | X scenes, Y done |  |            |   |
|  | Last edited: ... |  | Last edited: ... |  |            |   |
|  +------------------+  +------------------+  +------------+   |
|                                                               |
+---------------------------------------------------------------+
```

**Project Card information:**
- Project title
- Progress indicator: "X/Y scenes drafted" with mini progress bar (Goal Gradient)
- Last edited timestamp
- Genre tag (from config)

## States

| State | Design |
|-------|--------|
| Empty (first visit) | Centered illustration + "No projects yet. Start your first story." + [Create Your First Project] button. No other elements compete for attention. (Von Restorff: single CTA) |
| Loaded | Grid of project cards sorted by last edited. [+ New Project] button top-right and as final ghost card in grid. |
| Loading | Skeleton cards matching card layout, shimmer animation |
| Error | "Couldn't load your projects. Check your connection and try again." + [Retry] |

---

## Project Deletion

**Flow:** Right-click card (or 3-dot `...` button) -> Context menu -> `프로젝트 삭제` -> Confirmation dialog -> Snackbar with Undo (8s)

**Key decisions:**
- **Dashboard only** — not in workspace (too risky during focused writing)
- **3-dot button**: appears on hover (`opacity 0→1, 150ms`), always visible on `focus-visible`
- **Context menu items**: `열기` (Open) | separator | `프로젝트 삭제` (Delete Project, red/danger icon+text)
- **Dialog title** includes project name: `"'{title}' 프로젝트를 삭제할까요?"`
- **No "Are you sure?"** — specific consequence: `"프로젝트의 모든 장면, 등장인물, 초고가 삭제됩니다."`
- **Confirm button**: `프로젝트 삭제` (specific verb+object, not "OK"). Shows loading spinner, disables both buttons.
- **Undo snackbar**: 8s window (extended for high-stakes). `role="status" aria-live="polite"`. Timer bar at bottom.
- **Soft delete**: server retains 30 days. No "Recently Deleted" UI in Phase 1.
- **Card animation**: exit `opacity:0 + scale(0.95)` 200ms; re-enter (undo) `scale-in` 250ms.

**New component needed:** `Snackbar` (`shared/ui/snackbar.tsx`)
- Bottom-center, `max-w-[420px]`, auto-dismiss, timer bar, action slot, queue (one at a time)
- `bg-surface-raised border border-border-default shadow-xl rounded-lg px-4 py-3`
- z-index: 9997

**Edge cases:** last project -> empty state; API failure -> error toast, card remains; multiple rapid deletions -> snackbar queue.
