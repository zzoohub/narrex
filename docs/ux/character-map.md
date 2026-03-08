# Character Map Panel

**Location:** Left sidebar panel
**Primary action:** View and manage story characters and their relationships

---

## Layout

```
+-------------------------------+
| Characters       [+ Add] [x] |
+-------------------------------+
|                               |
|     (Ji-yeon)---rival---(Min) |
|        |                  |   |
|      ally               sibling|
|        |                  |   |
|     (Seo-jun)        (Ha-na) |
|                               |
|  [Force-directed graph with   |
|   draggable nodes and labeled |
|   relationship lines]         |
|                               |
+-------------------------------+
```

## Character Node Visual

- Circle with character initial or profile image thumbnail.
- Name label below.
- Click to select (highlights with ring).
- Drag to reposition in graph.

## Relationship Line Visual

- Solid line: positive relationship (allies, friends, lovers).
- Dashed line: negative relationship (rivals, enemies).
- Arrow: one-directional (e.g., unrequited love, secret enmity).
- Label centered on line.
- Click line to edit relationship.

## Character Card (opens on character node click)

```
+-------------------------------+
| <- Characters                 |
+-------------------------------+
| [Profile Image Placeholder]   |
|        [Upload Image]         |
|                               |
| Name                          |
| [Seo-jun                   ] |
|                               |
| Personality                   |
| [Disciplined but haunted by  ]|
| [guilt from his previous     ]|
| [life. Stoic exterior hiding ]|
| [deep emotional turmoil.     ]|
|                               |
| Appearance                    |
| [Tall, lean build. Scar on  ]|
| [left hand from sword        ]|
| [training accident.          ]|
|                               |
| Secrets                       |
| [Knows the location of a    ]|
| [hidden treasure from future ]|
| [memories.                   ]|
|                               |
| Motivation                    |
| [Protect his family from the ]|
| [disaster he knows is coming.]|
|                               |
| [Delete Character]            |
+-------------------------------+
```

All fields are free text, multi-line, no character limit. Auto-save on change.

## Empty State (no characters)

"No characters yet. Characters are created automatically when you structure your story, or you can add them manually."
[+ Add Character]

## Creating a Relationship

1. Hover a character node -> a small "link" handle appears on the node edge.
2. Drag from the handle to another character node.
3. On release, an inline popover appears:
   ```
   Relationship Label: [           ]
   Type: (o) Positive  ( ) Negative  ( ) One-way
   [Create Relationship]
   ```
4. User fills in and clicks [Create Relationship].
5. Line appears with label.

## Temporal Relationship Tracking [Phase 3+]

A timeline slider appears at the bottom of the Character Map panel, linked to the main timeline. Sliding shows the state of relationships at different story points. Phase 1 relationships are static (single state).

---

## Header Redesign

**Issues (Critical/Major):**
1. CharacterCard header shows "CHARACTERS" instead of character name — user can't identify what they're editing
2. Both views (graph/card) have identical header label — no context distinction
3. Back button missing `aria-label` (WCAG 2.1 AA violation)
4. "등장인물 추가" text label too long for 280px panel

**Decisions:**

| View | Before | After |
|------|--------|-------|
| GraphView header | `"CHARACTERS" [+ 등장인물 추가] [<]` | `등장인물 [+] [<]` — icon-only add button |
| CharacterCard header | `[<-] "CHARACTERS" [<]` | `[<-] 캐릭터이름 [<]` — show name, `truncate` |

- **Panel title style**: `text-xs uppercase text-fg-secondary` -> `text-sm font-semibold text-fg` (sentence case). Apply to all panel headers.
- **Button padding**: `p-1` -> `p-1.5` (min 24px+ click target, Fitts's Law)
- **Back button**: add `aria-label="관계도로 돌아가기"` / `"Back to character map"`
- **Add button**: `aria-label="등장인물 추가"`, tooltip on hover
- **Slide transition** (optional): GraphView<->CharacterCard 200ms slide-in/out from right. `prefers-reduced-motion`: instant.
- **Phase 3+**: title area becomes segmented control tabs (Characters / World Map)

---

## Fullscreen Mode

**Design:** Overlay modal (`z-40`) over workspace, not a separate route. Top bar stays visible (Principle of Front Doors — project context always needed).

**Entry points:**
- Maximize button (`IconMaximize`) in character map header, between add and collapse buttons
- `Cmd+Shift+F` keyboard shortcut (toggle)
- Double-click empty graph area (discovery mechanism)

**Toolbar** (40px, same style as panel header):
```
| 등장인물  [+ 추가]  [-] [+]  [minimize] |
```
No collapse button (not a panel in fullscreen).

**Character Card in fullscreen:** 340px side sheet from right (not modal overlay). Graph resizes to `calc(100% - 340px)`. Reuses existing `CharacterCard` component.

**D3 force adaptation:**
```ts
const scale = Math.sqrt(width * height) / Math.sqrt(400 * 300)
charge: -200 * scale, link: 80 * scale, collide: 30 + 15 * scale
```
Simulation reheat: `alpha(0.3).restart()` on resize. User-pinned nodes (`fx/fy`) preserved.

**Zoom**: `[-]`/`[+]` buttons (fullscreen toolbar only, not in panel view). d3-zoom: range 0.25x-4x, default fit-all. Trackpad/mouse wheel supported.

**Escape (hierarchical):** relationship popover -> character card -> fullscreen exit.

**Transition:** enter 250ms scale-in + fade; exit 200ms fade-out. `prefers-reduced-motion`: instant.

**Responsive:** Card width `min(340px, 40vw)`. Below 400px graph width -> card becomes full-width overlay.

**Not included:** mini-map (insufficient character count to justify), node search/filter (Phase 2+).

**State:** `fullscreenCharMap: boolean` signal in WorkspaceLayout.
