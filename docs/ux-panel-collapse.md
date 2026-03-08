# UX Design: Workspace Panel Collapse/Expand

## Context

### User Goal (JTBD)
**When I** am writing in the workspace, **I want to** maximize my editor area by collapsing panels I don't currently need, **so that I can** focus on writing without visual distraction, and easily restore panels when I need context (characters, timeline, scene details).

### User Context
- **Device**: Desktop (768px+ enforced -- mobile shows fallback)
- **Environment**: Creative writing studio, long sessions, frequent panel toggling
- **Mental state**: Deep focus (writing) alternating with reference-checking (characters, timeline)
- **Platform**: Web (TanStack Start / SolidJS), "Ink & Amber" dark-first design system

### Proto-persona
**Yuna, 28, fiction writer** -- works in long sessions, wants a distraction-free writing space but needs quick access to character details and timeline. Switches between "writing mode" (editor only) and "planning mode" (all panels open) multiple times per session.

---

## Current State Analysis

### Layout Structure
```
+--------------------------------------------+
| Top bar (h-11)                             |
+--------------------------------------------+
| Config bar                                 |
+--------+--+---------------------+--+-------+
| Left   |R | Center              |R | Right |
| Panel  |e | (Editor)            |e | Panel |
| 280px  |s |                     |s | 340px |
|        |z |                     |z |       |
|        |  +---------------------+  |       |
|        |  |R| Bottom panel      |  |       |
|        |  | | (Timeline) 240px  |  |       |
+--------+--+---------------------+--+-------+
```
R = Resize handle

### Current Problems

1. **Toggle buttons in top bar are disconnected from panels** -- buttons are far from the content they control. This violates Fitts's Law (distance between control and target).
2. **Collapsed panels leave no visible re-open affordance** -- when a panel is collapsed via `<Show when={leftOpen()}>`, it disappears completely with no way to restore it except the top-bar toggle buttons. Users must remember which buttons correspond to which panels (violates Cognitive Load -- recognition over recall).
3. **Top-bar toggle buttons consume header space** -- they compete with project navigation and save status for attention (Von Restorff Effect dilution).
4. **No animation on collapse/expand** -- panels snap in/out causing disorienting layout shifts (Doherty Threshold -- transitions should smooth state changes).
5. **Right panel has no collapse button at all** -- it only opens when a scene is selected and closes via the X button on SceneDetail. Inconsistent model.

---

## Information Architecture

### Panel Roles
```
Workspace (desktop-only)
|-- Top bar (persistent: navigation, branding, theme, save status)
|-- Config bar (persistent: project settings)
|-- Left panel: Character Map (collapsible)
|-- Center: Editor Panel (always visible, flex-1)
|-- Bottom panel: Timeline (collapsible)
|-- Right panel: Scene Detail (auto-opens on scene select, closeable)
```

### Collapse Model
- **Left panel** and **Bottom panel** are user-toggled (they contain persistent reference data).
- **Right panel** is context-driven (opens automatically when a scene is selected; closeable via its own X button). This panel is NOT part of the collapse redesign -- it follows a different interaction model (contextual reveal).

---

## Design Specification

### 1. Remove Top-Bar Toggle Buttons

Remove the `IconPanelLeft` and `IconPanelBottom` toggle buttons from the top bar header. These are being replaced by in-panel collapse buttons and edge-tab re-open affordances.

**Rationale**: Fitts's Law -- placing the toggle control inside or adjacent to the panel it controls reduces the distance between the user's focus and the control. Also reduces Cognitive Load by eliminating an indirect mapping ("which icon controls which panel?").

The divider and theme toggle remain. The save status remains.

### 2. In-Panel Collapse Buttons

Each collapsible panel gets a collapse button in its own header bar, positioned at the edge nearest the center content area.

#### Left Panel (Character Map)

- **Button position**: Right end of the Character Map header bar (h-10 header that already exists)
- **Icon**: `IconChevronLeft` (pointing left, indicating "collapse toward the left edge")
- **Size**: 28x28px visual, 36x36px tap area (exceeds 32px web minimum per ergonomics spec)
- **Style**: `text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer rounded-md`
- **aria-label**: `"Collapse character panel"` / `"Hide character panel"`
- **Action**: `setLeftOpen(false)`

```
+--- Character Map header (h-10) --------+
| CHARACTERS    [+ Add]         [<]      |
+----------------------------------------+
```

#### Bottom Panel (Timeline)

- **Button position**: Right end of the Timeline header bar (h-10 header that already exists)
- **Icon**: `IconChevronDown` (pointing down, indicating "collapse toward the bottom edge")
- **Size**: Same as left panel collapse button
- **Style**: Same as left panel collapse button
- **aria-label**: `"Collapse timeline"`
- **Action**: `setBottomOpen(false)`

```
+--- Timeline header (h-10) -----------------------+
| TIMELINE     [zoom controls]           [v]       |
+--------------------------------------------------+
```

**Rationale**: Jakob's Law -- this matches the collapse pattern used in VS Code, Figma, and other panel-based tools. Users expect the collapse button inside the panel header. Direction of the chevron arrow communicates the collapse direction (Cognitive Load -- external representation reduces internal computation).

### 3. Edge Tabs for Re-Opening Collapsed Panels

When a panel is collapsed, a small tab button appears at the edge where the panel used to be, allowing the user to re-open it.

#### Left Edge Tab (when left panel is collapsed)

- **Position**: Fixed to the left edge of the workspace area, vertically centered relative to the main content area
- **Size**: 24px wide x 56px tall (visual), with minimum 36px tap width
- **Shape**: Rounded on the right side only (border-radius: 0 6px 6px 0)
- **Content**: `IconChevronRight` (pointing right, indicating "expand from the left edge")
- **Background**: `bg-surface border border-l-0 border-border-default`
- **Hover**: `hover:bg-surface-raised hover:border-accent/50`
- **aria-label**: `"Open character panel"` / `"Show character panel"`
- **Action**: `setLeftOpen(true)`

```
When left panel is collapsed:

+--------------------------------------------+
| Top bar                                    |
+--------------------------------------------+
| Config bar                                 |
+>+------------------------------+--+-------+
| | Center (Editor)              |  | Right |
| | (now takes full remaining    |  |       |
| | width -- no gap)             |  |       |
+>+--+---------------------------+  |       |
     | Bottom panel (Timeline)   |  |       |
     +---------------------------+--+-------+

[>] = Left edge tab (24x56px, vertically centered)
```

#### Bottom Edge Tab (when bottom panel is collapsed)

- **Position**: Fixed to the bottom edge of the center content area (above the viewport bottom), horizontally centered relative to the editor area
- **Size**: 56px wide x 24px tall (visual), with minimum 36px tap height
- **Shape**: Rounded on the top side only (border-radius: 6px 6px 0 0)
- **Content**: `IconChevronUp` (pointing up, indicating "expand from the bottom edge")
- **Background**: Same as left edge tab
- **Hover**: Same as left edge tab
- **aria-label**: `"Open timeline"` / `"Show timeline"`
- **Action**: `setBottomOpen(true)`

```
When bottom panel is collapsed:

+--------+--+---------------------+--+-------+
| Left   |R | Center (Editor)     |  | Right |
| Panel  |e | (now takes full     |  |       |
|        |s | remaining height)   |  |       |
|        |z |                     |  |       |
|        |  |        [^]          |  |       |
+--------+--+---------------------+--+-------+

[^] = Bottom edge tab (56x24px, horizontally centered)
```

**Rationale**: This pattern satisfies multiple principles:
- **Fitts's Law**: The tab is at the exact edge where the panel used to be, minimizing travel distance.
- **Cognitive Load (recognition over recall)**: The user sees a visual reminder that a panel exists and can be opened, rather than having to remember to look at the top bar.
- **Jakob's Law**: This is the standard pattern in VS Code, JetBrains IDEs, Chrome DevTools, and Figma for collapsed panels.
- **Von Restorff Effect**: The tab stands out from the flat edge, making it discoverable without being distracting.

### 4. True 0px Collapse (No Gap)

When collapsed, the panel must occupy exactly 0px. The resize handle adjacent to that panel must also be removed.

**Current implementation concern**: The current code uses `<Show when={leftOpen()}>` which already removes the panel from DOM. This is correct. However, the resize handle (`div.resize-h`) is inside the same `<Show>` block, so it also disappears. Confirmed: no stale gap exists.

**For bottom panel**: Same pattern -- `<Show when={bottomOpen()}>` wraps both the `resize-v` handle and the bottom panel div. Confirmed: no stale gap.

Implementation note: When a panel collapses, the center editor area (`flex-1`) automatically expands to fill the freed space via flexbox. No explicit width/height recalculation needed.

### 5. Transition Animation

Panel collapse/expand should animate to prevent disorienting layout jumps.

#### Approach: CSS transition on width/height

Instead of `<Show>` (which removes from DOM), use conditional sizing with CSS transitions:

- **Left panel**: Transition `width` from `{leftWidth()}px` to `0px` over 200ms with `ease-out` easing. Set `overflow: hidden` during transition.
- **Bottom panel**: Transition `height` from `{bottomHeight()}px` to `0px` over 200ms with `ease-out` easing. Set `overflow: hidden` during transition.
- **Resize handles**: Transition `width`/`height` to 0px in sync with the panel.

This means replacing `<Show when={leftOpen()}>` with always-rendered panels that have `width: 0` or `height: 0` when collapsed, plus `overflow: hidden` and `transition: width 200ms ease-out` / `transition: height 200ms ease-out`.

**Duration**: 200ms (per interaction-patterns.md: "Expand/collapse: 200-300ms").
**Easing**: `ease-out` (per ergonomics.md: "ease-out for elements entering view").
**Reduced motion**: Under `prefers-reduced-motion: reduce`, transitions are already globally set to 0.01ms by the existing CSS rule. No additional work needed.

**Rationale**: Doherty Threshold -- smooth transitions under 300ms maintain the user's sense of spatial continuity. The animation shows where the panel went and where it comes from, reducing cognitive disorientation.

### 6. Keyboard Shortcuts (Preserved)

The existing keyboard shortcuts remain unchanged:
- **Cmd+\\** (`meta + backslash`): Toggle left panel
- **Cmd+Shift+T**: Toggle bottom panel

These shortcuts complement the visual controls. Users who learn them gain efficiency; users who don't are not blocked (visible alternatives exist per gesture design rules).

---

## Screen States

### State: All Panels Open (Default)
```
+-------------------------------------------------------------------+
| [<] Narrex . Project Title              [sun/moon] [Saved]        |
+-------------------------------------------------------------------+
| Genre: [Fantasy v] | Tone: [Dark v] | POV: [Third Person v]      |
+----------+--+---------------------------------+--+----------------+
| CHARS    |  |  Editor Panel                   |  | SCENE DETAIL  |
| [+ Add]  |  |                                 |  |               |
| [<]      |  |  (prose content)                |  | [X]           |
|          |  |                                 |  |               |
| [graph]  |  |                                 |  | Title: ___    |
|          |  |                                 |  | Chars: [...]  |
|          |  |                                 |  | Location: ___ |
|          |R |                                 |R |               |
+----------+--+------+--+-----------------------+--+----------------+
               | TIMELINE [zoom]          [v]   |
               | [ruler and tracks...]          |
               +--------------------------------+
```

### State: Left Panel Collapsed
```
+-------------------------------------------------------------------+
| [<] Narrex . Project Title              [sun/moon] [Saved]        |
+-------------------------------------------------------------------+
| Genre: [Fantasy v] | Tone: [Dark v] | POV: [Third Person v]      |
+>+-----------------------------------------+--+-------------------+
| |  Editor Panel                           |  | SCENE DETAIL      |
| |                                         |  |                   |
| |  (prose content -- wider now)           |  | [X]               |
| |                                         |  |                   |
| |                                         |  | Title: ___        |
| |                                         |R |                   |
+>+------+--+-------------------------------+--+-------------------+
         | TIMELINE [zoom]            [v]   |
         | [ruler and tracks...]            |
         +---------------------------------+

[>] = Left edge tab
```

### State: Bottom Panel Collapsed
```
+-------------------------------------------------------------------+
| [<] Narrex . Project Title              [sun/moon] [Saved]        |
+-------------------------------------------------------------------+
| Genre: [Fantasy v] | Tone: [Dark v] | POV: [Third Person v]      |
+----------+--+-------------------------------------+--+-----------+
| CHARS    |  |  Editor Panel                       |  | SCENE DET |
| [+ Add]  |  |                                     |  |           |
| [<]      |  |  (prose content -- taller now)      |  | [X]       |
|          |  |                                     |  |           |
| [graph]  |R |                [^]                  |R |           |
+----------+--+-------------------------------------+--+-----------+

[^] = Bottom edge tab (centered horizontally in editor area)
```

### State: Both Panels Collapsed ("Focus Mode")
```
+-------------------------------------------------------------------+
| [<] Narrex . Project Title              [sun/moon] [Saved]        |
+-------------------------------------------------------------------+
| Genre: [Fantasy v] | Tone: [Dark v] | POV: [Third Person v]      |
+>+---------------------------------------------+--+---------------+
| |  Editor Panel                               |  | SCENE DETAIL  |
| |                                             |  |               |
| |  (maximum prose area)                       |  | [X]           |
| |                                             |  |               |
| |                      [^]                    |R |               |
+>+---------------------------------------------+--+---------------+

[>] = Left edge tab
[^] = Bottom edge tab
```

### State: Both Collapsed, No Scene Selected
```
+-------------------------------------------------------------------+
| [<] Narrex . Project Title              [sun/moon] [Saved]        |
+-------------------------------------------------------------------+
| Genre: [Fantasy v] | Tone: [Dark v] | POV: [Third Person v]      |
+>+---------------------------------------------------------+
| |  Editor Panel (full width)                              |
| |                                                         |
| |  "Select a scene from the timeline to start writing"    |
| |                                                         |
| |                      [^]                                |
+>+---------------------------------------------------------+

Maximum focus: full-width, full-height editor.
```

---

## Interaction Patterns

### Collapse Animation
1. User clicks `[<]` in left panel header.
2. Left panel width transitions from `280px` to `0px` over 200ms ease-out.
3. Resize handle width transitions from `5px` to `0px` in sync.
4. Border on the left panel disappears (opacity or border-width transition).
5. Editor panel grows via flex-1 to fill freed space.
6. Left edge tab fades in (opacity 0 to 1, 150ms, delayed 100ms after collapse starts -- so it appears as the panel finishes collapsing).

### Expand Animation
1. User clicks `[>]` edge tab at left edge.
2. Left panel width transitions from `0px` to `{leftWidth()}px` (remembered value) over 200ms ease-out.
3. Left edge tab fades out immediately (opacity 1 to 0, 100ms).
4. Resize handle reappears at full width.
5. Left panel content fades in (opacity transition, 150ms).

### Bottom Panel: Same Pattern (Vertical)
- Collapse: height `{bottomHeight()}px` to `0px`, 200ms ease-out.
- Expand: height `0px` to `{bottomHeight()}px`, 200ms ease-out.
- Bottom edge tab: centered horizontally within the center column.

### Feedback
- **Visual**: Smooth animated transition provides spatial continuity.
- **No toast/snackbar needed**: Panel toggle is lightweight, reversible, and immediately visible. Adding feedback would be noise (anti-pattern: confirmation for non-destructive reversible action).

---

## Component Specification

### EdgeTab Component (New Shared Widget)

A reusable edge tab for collapsed panels.

```
Props:
- edge: 'left' | 'bottom'
- onClick: () => void
- aria-label: string

Rendering:
- left: 24px wide, 56px tall, rounded-r-md, positioned absolute left-0
- bottom: 56px wide, 24px tall, rounded-t-md, positioned absolute bottom-0, centered

Visual:
- bg-surface
- border border-border-default (omit edge that touches the viewport edge)
- hover:bg-surface-raised hover:border-accent/50
- transition-colors duration-150
- Icon: ChevronRight (left edge) or ChevronUp (bottom edge), size 14, text-fg-muted
- hover icon: text-fg
```

### Updated Panel Headers

#### CharacterMap Header (Modified)
```
<div class="flex items-center justify-between px-4 h-10 ...">
  <span class="...">CHARACTERS</span>
  <div class="flex items-center gap-1">
    <Button variant="ghost" size="sm" icon={<IconPlus />} onClick={addChar}>
      Add
    </Button>
    <button
      type="button"
      onClick={onCollapse}
      class="p-1 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
      aria-label="Collapse character panel"
    >
      <IconChevronLeft size={14} />
    </button>
  </div>
</div>
```

#### TimelinePanel Header (Modified)
```
<div class="flex items-center justify-between px-4 h-10 ...">
  <span class="...">TIMELINE</span>
  <div class="flex items-center gap-1">
    [zoom controls...]
    <button
      type="button"
      onClick={onCollapse}
      class="p-1 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
      aria-label="Collapse timeline"
    >
      <IconChevronDown size={14} />
    </button>
  </div>
</div>
```

### Props Changes

#### CharacterMap
Add prop: `onCollapse: () => void`

#### TimelinePanel
Add prop: `onCollapse: () => void`

### WorkspaceLayout Changes

1. Remove `IconPanelLeft` and `IconPanelBottom` toggle buttons from the top bar.
2. Remove the divider (`div.w-px`) between those buttons and the theme toggle (since those buttons no longer exist).
3. Pass `onCollapse` callback to `CharacterMap` and `TimelinePanel`.
4. Replace `<Show when={leftOpen()}>` with always-rendered panel using conditional width.
5. Replace `<Show when={bottomOpen()}>` with always-rendered panel using conditional height.
6. Add left edge tab (shown when `!leftOpen()`).
7. Add bottom edge tab (shown when `!bottomOpen()`).

---

## CSS Additions

```css
/* ── Panel collapse transition ─────────────────────────────────── */
.panel-collapsible {
  overflow: hidden;
  transition: width 200ms ease-out, height 200ms ease-out,
              opacity 200ms ease-out, border-width 200ms ease-out;
}

.panel-collapsible[data-collapsed="true"] {
  opacity: 0;
  pointer-events: none;
}

/* ── Edge tab ──────────────────────────────────────────────────── */
.edge-tab {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  border: 1px solid var(--border-default);
  color: var(--fg-muted);
  cursor: pointer;
  z-index: 20;
  transition: background 0.15s, border-color 0.15s, color 0.15s, opacity 0.15s;
}

.edge-tab:hover {
  background: var(--surface-raised);
  border-color: var(--accent);
  color: var(--fg);
}

.edge-tab--left {
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 56px;
  border-left: none;
  border-radius: 0 6px 6px 0;
}

.edge-tab--bottom {
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 56px;
  height: 24px;
  border-bottom: none;
  border-radius: 6px 6px 0 0;
}
```

---

## Accessibility Notes

### Contrast
- Edge tab uses `bg-surface` on `bg-canvas` -- inherits existing contrast ratios which pass 3:1 for UI components.
- Hover state uses `border-color: accent` -- amber accent on dark surface passes 3:1.

### Focus Management
- Edge tabs are `<button>` elements, keyboard-focusable via Tab.
- Focus order: left edge tab appears in DOM before the center content (natural left-to-right order). Bottom edge tab appears after editor content.
- After collapsing a panel, focus should move to the edge tab (so keyboard users can immediately re-open it if collapse was accidental). Implementation: `edgeTabRef.focus()` after collapse transition completes.
- After expanding a panel, focus should move to the panel's first interactive element (the collapse button in the header). This maintains spatial context.

### Keyboard Navigation
- `Tab`: cycles through edge tabs, panel content, and editor in document order.
- `Enter` / `Space`: activates edge tab (standard button behavior).
- `Cmd+\`: toggle left panel (existing shortcut, unchanged).
- `Cmd+Shift+T`: toggle bottom panel (existing shortcut, unchanged).

### Screen Reader
- Edge tabs have explicit `aria-label` indicating the panel name and action: `"Open character panel"`, `"Open timeline"`.
- Collapse buttons have `aria-label`: `"Collapse character panel"`, `"Collapse timeline"`.
- Panel regions should be wrapped in `<aside>` or `<section>` with `aria-label` to identify them.
- Collapse/expand state should be communicated: `aria-expanded` on the collapse button and edge tab.

### Reduced Motion
- Already handled by the global `prefers-reduced-motion: reduce` rule in `styles.css` which sets all transition/animation durations to 0.01ms.

### Dynamic Type / Scalable Text
- Edge tabs use icons only (no text), so they are unaffected by font scaling.
- The `aria-label` provides the accessible name regardless of visual presentation.

---

## Design Rationale

### Key Decision 1: In-Panel Collapse Buttons (Not External Toggles)
**Principle**: Fitts's Law + Cognitive Load (recognition over recall).
Placing the collapse control inside the panel header means the user's cursor is already near the control when they are interacting with that panel. It also makes the mapping between control and target self-evident.

### Key Decision 2: Edge Tabs (Not Persistent Sidebar Icons)
**Principle**: Cognitive Load (minimize) + Von Restorff Effect (subtle affordance).
We considered a persistent icon strip (like VS Code's activity bar) but rejected it because: (a) it would consume 48px of width permanently, and (b) in Narrex there are only 2 collapsible panels, not 5+, so a full activity bar would be overkill. The edge tab pattern is lighter: it occupies 24px only when the panel is collapsed, and 0px when the panel is open.

### Key Decision 3: Animated Transitions (Not Instant Toggle)
**Principle**: Doherty Threshold + Spatial continuity.
Instant show/hide (`<Show>`) causes a layout jump that breaks the user's spatial model. A 200ms width/height transition preserves the sense of "the panel slid away" and "slid back," maintaining spatial continuity.

### Key Decision 4: Preserving Panel Size on Reopen
**Principle**: Zeigarnik Effect (incomplete state preservation).
When a panel collapses, its width/height signal value is preserved. Reopening restores the exact size the user had set. This respects user preferences and avoids the frustration of re-resizing every time.

### Key Decision 5: Right Panel Excluded from Redesign
**Principle**: Consistency of interaction model.
The right panel (SceneDetail) follows a different model: it is context-driven (auto-opens on scene selection) rather than user-toggled. It already has a close button (X) in its header. Forcing it into the same collapse/edge-tab pattern would be inconsistent with its purpose. It remains unchanged.

### What Was Removed
- Top-bar `IconPanelLeft` toggle button -- replaced by in-panel collapse + edge tab.
- Top-bar `IconPanelBottom` toggle button -- replaced by in-panel collapse + edge tab.
- Divider between panel toggles and theme toggle -- no longer needed.

---

## Implementation Guidance

### Step-by-step

1. **Add `onCollapse` prop to CharacterMap and TimelinePanel widgets**
   - CharacterMap: add collapse button (IconChevronLeft) to the GraphView header and CharacterCard header.
   - TimelinePanel: add collapse button (IconChevronDown) to the right side of the zoom controls row.

2. **Modify WorkspaceLayout**
   - Remove the two panel toggle buttons and their divider from the top bar.
   - Replace `<Show when={leftOpen()}>` with always-rendered panel using dynamic width (`leftOpen() ? leftWidth() : 0`).
   - Add `transition: width 200ms ease-out, opacity 200ms ease-out` to the left panel wrapper.
   - Same for bottom panel with height.
   - Add `<Show when={!leftOpen()}>` for left edge tab.
   - Add `<Show when={!bottomOpen()}>` for bottom edge tab.
   - Pass `onCollapse={() => setLeftOpen(false)}` to CharacterMap.
   - Pass `onCollapse={() => setBottomOpen(false)}` to TimelinePanel.

3. **Add CSS for edge tabs** (in `styles.css`).

4. **Focus management**: After collapse animation ends (200ms), move focus to the edge tab. After expand, move focus to the panel's collapse button.

### Resize Handle Handling
The resize handles (`resize-h`, `resize-v`) should also transition their width/height to 0 when the adjacent panel collapses. Wrap the resize handle in the same transitioning container, or give it its own transition.

### Testing Checklist
- [ ] Left panel collapses to 0px with no residual gap
- [ ] Bottom panel collapses to 0px with no residual gap
- [ ] Left edge tab appears after left panel collapses
- [ ] Bottom edge tab appears after bottom panel collapses
- [ ] Clicking edge tab re-opens panel at previous size
- [ ] Cmd+\ toggles left panel (with animation)
- [ ] Cmd+Shift+T toggles bottom panel (with animation)
- [ ] Focus moves to edge tab after collapse
- [ ] Focus moves to panel after expand
- [ ] Transitions respect prefers-reduced-motion
- [ ] Screen reader announces panel state changes
- [ ] Both panels collapsed simultaneously works correctly
- [ ] Right panel (SceneDetail) behavior unchanged
- [ ] Resize handles work correctly after expand
