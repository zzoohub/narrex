# Timeline Panel

**Location:** Bottom of workspace, full width
**Primary action:** Select a scene to view/edit/generate

This is the core visual differentiator. Design must balance power (multi-track, branch/merge) with approachability (non-technical users).

---

## Layout

```
+---------------------------------------------------------------+
| Timeline                                    [Zoom -][+] [Fit] |
+---------------------------------------------------------------+
| Track 1: Main Plot                                            |
| O----O----O----O====O----O----O----[+]                        |
|                  \                                             |
| Track 2: Antagonist  \                                        |
|                   O----O----O----[+]                           |
|                                                               |
| [+ Add Track]                                                 |
+---------------------------------------------------------------+
```

## Scene Visual States

Not color-only — uses fill + icon + label:

| State | Visual | Icon | Tooltip |
|-------|--------|------|---------|
| Empty | Hollow rectangular clip, thin border | (none) | "No content yet" |
| AI Draft | Half-filled rectangular clip | Small pen icon | "AI draft — not yet edited" |
| Edited | Solid filled rectangular clip | Checkmark | "Author-edited" |
| Needs Revision | Filled rectangular clip with warning border | Warning triangle | "Settings changed since draft" |

## Scene Interaction

| Action | Trigger | Response |
|--------|---------|----------|
| Select | Click | Scene highlights (ring), Right panel opens with Scene Detail, Center panel shows Editor |
| Quick preview | Hover (desktop) | Tooltip with title + first 2 lines of plot summary |
| Add scene | Click [+] at end of track or between scenes | New empty scene inserted with smooth animation, auto-selected |
| Move scene | Drag | Ghost preview at cursor. Drop target highlighted. Adjacent scenes shift. 300ms transition. |
| Cross-track move | Drag to different track | Same as move, track assignment updates |
| Delete | Select + Delete key, or right-click -> "Delete" | Confirmation if has content; undo snackbar if empty |
| Context menu | Right-click on scene | Menu: Edit Details, Generate Draft, Delete |
| Branch | Drag from scene's bottom branch handle | Creates connection to new scene on target track |
| Merge | Drag connection from scene to existing scene on another track | Merge line drawn |

## Track Interaction

| Action | Trigger | Response |
|--------|---------|----------|
| Add track | Click [+ Add Track] | New track appended at bottom, label input focused |
| Rename track | Double-click track label | Inline text edit |
| Remove track | Right-click label -> "Remove Track" | Confirmation if has scenes |
| Collapse track | Click chevron next to label | Track collapses to single line (saves vertical space) |

## Zoom and Scroll

- Horizontal scroll: scroll wheel (horizontal) or click-and-drag on empty timeline area.
- Zoom: Ctrl/Cmd + scroll wheel, or zoom controls in toolbar.
- [Fit] button: fits all scenes into visible area.
- Pinch-to-zoom on trackpad.

## Vertical Alignment of Simultaneous Events

Scenes whose timeline ranges (start_position + duration) overlap across tracks are vertically aligned. A faint vertical band spans the overlapping region. Hovering an overlapping region highlights all scenes with overlapping ranges.

## Auto-structuring Result

When a project is first created, the timeline appears pre-populated. An inline hint at the top of the timeline says: "This is a starting point — drag, add, or delete scenes to match your vision." This hint dismisses on first interaction and does not return. (Cognitive Load: reduce extraneous load by showing guidance only when relevant.)

## Connection Lines

- Within-track flow: sequential order is implicit from clip positioning (start_position). No explicit connection lines needed.
- Branch/merge connections (across tracks): curved bezier lines.
- Foreshadowing connections [Phase 2]: dashed colored line with arrow, distinct from structural connections.

---

## Zoom Placement

**Problem:** 5 controls + label crammed into 112px track-label column (collapse + 4 zoom). Below min click target, violates Fitts's Law and Gestalt Proximity (unrelated controls grouped).

**Decision:** Separate into two zones.

- **Left (112px column)**: collapse button only. 14px icon (was 12px), 28x28px tap area
- **Right (ruler area)**: zoom cluster as floating overlay

**Zoom cluster spec:**
```
absolute right-2 top-1/2 -translate-y-1/2
bg-surface/80 backdrop-blur-sm rounded-md px-1.5 py-0.5 z-10
```
- Contents: `[ZoomOut] percentage [ZoomIn] | [Fit]`
- Icon size: 14px, tap area 28x28px, `gap-1` (4px)
- Percentage: `text-[10px] tabular-nums min-w-[4ch] text-center select-none`
- 1px divider between zoom level group and fit button (Gestalt grouping)
- `Ctrl/Cmd+scroll`: primary zoom method (unchanged)

---

## Panel Header Controls

**Root cause:** Timeline has no header bar — 28px ruler does everything (panel label, collapse, zoom, track add).

**Decisions:**

1. **Add 32px (`h-8`) timeline header bar** above ruler
   - Left (112px): `"TIMELINE"` label + collapse button (`justify-between`). `text-[11px] font-medium text-fg-secondary uppercase tracking-wider`
   - Right: `[+ 트랙 추가]` ghost button (left-aligned) + zoom toolbar (right-aligned)
   - Style: `bg-surface border-b border-border-subtle`

2. **Move track add button** from below tracks into header. Instant creation with default name `"Track N"`, double-click label to rename (NLE convention).

3. **Enlarge track collapse chevrons**: 12px->14px, `p-0.5`->`p-1.5`, add `hover:bg-surface-raised`, `min-w-7 min-h-7`

4. **Move zoom controls** from ruler into header (recommended). Ruler becomes pure tick marks.

**Final layout:**
```
| TIMELINE  [v] | [+ 트랙 추가]    [-] 100% [+] |[fit]|  32px header
| (ruler)       | 0  1  2  3  4  ...              |     28px ruler
| [>] Track 1   | [Scene A][Scene B] [+]          |     tracks
```

**Vertical cost:** +32px. Compensate by increasing default panel height 240->256px if needed.
**a11y note:** track chevron `text-fg-muted` may fail WCAG 3:1 UI component contrast — consider `text-fg-secondary`.
