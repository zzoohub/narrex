# Workspace Layout

The workspace is a single-page application with togglable panels. No deep navigation hierarchy. Users switch between panels, not pages.

**Mental model:** Video editor. Timeline at the bottom (= video timeline). Editor in the center (= preview monitor). Character Map on the left (= media library). Scene Detail on the right (= inspector/properties). Config Bar at the top (= project settings).

---

## Panel Layout (Desktop, >=1280px)

```
+---------------------------------------------------------------+
| Config Bar (collapsible)                            [^] [...] |
+----------+------------------------------------+---------------+
| Left     | Center                             | Right         |
| Panel    | (Editor / Welcome)                 | Panel         |
|          |                                    | (Scene Detail)|
| Character|                                    |               |
| Map      |                                    |               |
|          |                                    |               |
+----------+--------+---------------------------+---------------+
| Timeline (full width, horizontal scroll, multi-track)         |
| Track 1: [scene]--[scene]--[scene]--[scene]--[+]             |
| Track 2:         [scene]--[scene]--[+]                        |
| [+ Add Track]                                                 |
+---------------------------------------------------------------+
```

**Reachability:** Every core action is at most 2 clicks from the workspace:
- Generate draft: select scene (1) -> click "Generate" (2)
- Edit character: click character node on map (1) -> edit card (in-place)
- Add timeline scene: click "+" on timeline (1)

## Panel Behavior

| Panel | Default State | Toggle | Resize |
|-------|--------------|--------|--------|
| Config Bar | Collapsed (shows genre + tone summary) | Click to expand | No |
| Left Panel (Character Map) | Open, 280px wide | Toggle icon in toolbar | Drag edge, min 240px, max 400px |
| Center (Editor) | Shows welcome/overview when no scene selected | Always visible | Fills remaining space |
| Right Panel (Scene Detail) | Hidden until scene selected | Auto-opens on scene select, close button | Drag edge, min 300px, max 500px |
| Timeline | Open, 240px tall | Toggle icon in toolbar | Drag top edge, min 160px, max 50vh |

## Responsive Behavior

| Viewport | Layout Change |
|----------|--------------|
| >= 1280px | Full panel layout as shown above |
| 1024-1279px | Left panel defaults to collapsed (icon-only), expandable as overlay |
| 768-1023px | Left and Right panels become overlay sheets. Timeline reduces to 2 visible tracks. |
| < 768px | Not supported. Show message: "Narrex is designed for desktop. Please use a device with a wider screen." |

---

## Header — Single Bar Merge

**Problem:** Two horizontal bars at top (header 44px + config bar 44px = 88px). Violates Jakob's Law (creative tools use single top bar) and wastes vertical space. Collapsed config summary (genre, tone tags) is passive info that doesn't help current task.

**Decision:** Merge into single 44px bar. Config opens as dropdown overlay.

```
| [<] Narrex · Project Title   [Config v] [moon]  Saved |  44px total
```

- **Config trigger**: icon + label button in merged header bar
- **Dropdown**: `position: absolute; z-40; bg-surface; border rounded-lg shadow-lg`. Overlay (not push-down) — workspace content never displaced
- **Dismiss**: click-outside, Escape, or re-click trigger
- **a11y**: `aria-haspopup="true"`, `aria-expanded`, focus to first input on open, return focus on close
- **Animation**: open 200ms ease-out slide-down+fade-in; close 150ms ease-in. `prefers-reduced-motion`: instant.

**Removed**: collapsed config summary bar, second `border-b` divider, persistent push-down on expand.

---

## Panel Collapse/Expand

**Problem:** Panel toggle buttons in top bar are disconnected from panels (Fitts's Law). Collapsed panels have no re-open affordance (recognition over recall violation).

**Decisions:**

1. **Remove** top-bar toggle buttons (`IconPanelLeft`, `IconPanelBottom`) and their divider
2. **Add in-panel collapse buttons** in each panel's header bar, at the edge nearest center content
   - Left panel: `IconChevronLeft` at right end of header. `aria-label="Collapse character panel"`
   - Bottom panel: `IconChevronDown` at right end of header. `aria-label="Collapse timeline"`
3. **Add edge tabs** for re-opening collapsed panels
   - Left: 24x56px, `rounded-r-md`, absolute `left-0` vertically centered. `IconChevronRight`
   - Bottom: 56x24px, `rounded-t-md`, absolute `bottom-0` centered. `IconChevronUp`
   - Style: `.edge-tab` — `bg-surface border border-border-default`, hover: `bg-surface-raised border-accent/50`
4. **Animate** collapse/expand: 200ms ease-out on width/height, `overflow: hidden` during transition
5. **Preserve panel size** on reopen (Zeigarnik Effect)
6. **Right panel excluded** — context-driven (auto-opens on scene select), different interaction model

**Focus management:** collapse -> focus edge tab; expand -> focus collapse button.
**Keyboard:** `Cmd+\` (left), `Cmd+Shift+T` (bottom) — unchanged.
