# UX Design: Timeline Zoom Control Placement

**Type:** Diagnosis + Redesign (Mode B)
**Date:** 2026-03-09
**Scope:** Timeline panel ruler area -- collapse button + zoom controls layout

---

## 1. Context

### User Goal (JTBD)
**When I** am arranging scenes on the NLE timeline, **I want to** quickly adjust the zoom level to see the full story structure or focus on a specific section, **so that I can** efficiently navigate and edit my story's temporal layout.

### User Context
- **Device**: Desktop (768px+ enforced)
- **Environment**: Creative writing studio, NLE-style timeline panel at the bottom of the workspace
- **Mental state**: Spatial navigation mode -- the user is thinking about story structure, scene order, and temporal relationships
- **Platform**: Web (TanStack Start / SolidJS), "Ink & Amber" dark-first design system

### Current State
The timeline panel has a ruler row (28px tall) at the top. In the left corner of the ruler, within the 112px track-label column, two groups of controls are crammed together with `justify-between`:

```
+------- 112px track label column -------+--- Ruler ticks ------------------>
| [v]  [zoom-] 100% [zoom+] [fit]       | 0   1   2   3   4   5   6   ...
+----------------------------------------+------------------------------------
```

- `[v]` = Collapse button (chevron down, collapses the entire timeline panel)
- `[zoom-]` = Zoom out
- `100%` = Percentage display (9px font, 3ch width)
- `[zoom+]` = Zoom in
- `[fit]` = Fit-to-view (maximize icon)

All icons are 12px with 0.5 padding (approximately 20px tap area per button). The total cluster tries to fit 5 interactive elements + a text label into 112px horizontal space.

---

## 2. Diagnosis

### Root Problems

#### Problem A: Cramped Controls (Fitts's Law Violation)
The 112px column must fit a collapse button on the left and 4 zoom controls on the right. At `gap-0.5` (2px), the zoom cluster is approximately: 20+2+20+2+20+2+20 = 86px wide. Adding the collapse button (~20px) plus `justify-between` padding, we are at roughly 108px in a 112px container with `px-1` (4px each side). This leaves effectively zero breathing room.

**Consequence**: Buttons are small (12px icon, ~20px tap area) and tightly packed. This falls well below the 32px recommended web click target (ergonomics.md). Users must aim precisely, which slows interaction.

#### Problem B: Unrelated Controls Grouped Together (Cognitive Load -- Extraneous)
The collapse button (panel management) and zoom controls (viewport manipulation) serve fundamentally different purposes:
- **Collapse**: Changes the workspace layout structure
- **Zoom**: Changes the timeline viewport scale

Placing them in the same 112px box creates a false grouping. The user's mental model separates "layout management" from "viewport control," but the physical layout forces them together due to spatial constraint, not semantic relationship.

**Principle**: Gestalt Proximity -- elements that are close together are perceived as related. These controls are not related.

#### Problem C: Zoom Controls Are Distant from the Content They Affect (Fitts's Law)
The zoom controls sit in the extreme top-left corner of the timeline, inside the track-label column. But the content being zoomed (the ruler ticks and scene clips) spans the entire width to the right. The user must look left to find the controls, then shift attention right to see the effect. This is suboptimal but not critical.

#### Problem D: No Space for Future Controls
The existing spec mentions potential future controls: snap-to-grid, playback transport, etc. The current layout has zero remaining space in the track-label column. Any addition would require a redesign.

### Issue Summary

| # | Issue | Severity | Principle |
|---|-------|----------|-----------|
| 1 | 5 controls + label in 112px violates minimum target size | **Major** | Fitts's Law (click targets below 32px recommended minimum) |
| 2 | Collapse and zoom controls falsely grouped by proximity | **Major** | Cognitive Load (extraneous), Gestalt Proximity |
| 3 | Zoom controls distant from the content they affect | **Minor** | Fitts's Law (distance to target) |
| 4 | No room for future controls (snap, playback) | **Minor** | Scalability |

---

## 3. Industry Conventions Analysis

### Where Professional NLE/DAW Tools Place Timeline Zoom Controls

| Tool | Zoom Location | Zoom Mechanism | Transport/Tools Location |
|------|--------------|----------------|--------------------------|
| **Adobe Premiere Pro** | Bottom of timeline panel, horizontal zoom slider at the bottom-right | Slider + scroll bar handles + Ctrl/Cmd+scroll | Toolbar strip above timeline, left-aligned |
| **DaVinci Resolve** | Bottom-right of timeline area, zoom slider | Slider + keyboard shortcuts | Toolbar strip above timeline, left-aligned |
| **Logic Pro** | Top-right of timeline area, horizontal zoom slider | Slider + Ctrl+scroll + pinch | Transport bar is a separate top panel |
| **Ableton Live** | Bottom-right corner of arrangement view | +/- buttons + scroll zoom | No dedicated zoom UI -- mostly gesture-driven |
| **Final Cut Pro** | Bottom-right of timeline, zoom slider | Slider + Cmd+/- + pinch | Toolbar at top of timeline |
| **FL Studio** | Top-right of playlist window, zoom controls in toolbar | Scroll zoom + toolbar buttons | Toolbar strip at top of window |

### Pattern Summary

**Zoom controls are almost universally placed in one of two locations:**
1. **Top-right of the timeline area** (Logic Pro, FL Studio, many DAWs)
2. **Bottom-right of the timeline area** (Premiere Pro, DaVinci Resolve, Final Cut Pro)

The right side is strongly preferred because:
- The right edge is where the timeline "grows" -- users naturally look right to see more content
- Right-aligned controls follow the reading direction (content flows left-to-right, controls at the terminus)
- It creates spatial separation from track management controls (which live on the left)

**Collapse/panel-toggle controls** in professional tools are always:
- In a different location from zoom controls (toolbar buttons, panel headers, separate strip)
- Associated with the panel frame, not the timeline content

**Key finding: No professional NLE or DAW places zoom controls in the track-label column.** The track-label column is reserved for track names, mute/solo buttons, and track-level controls.

---

## 4. Recommendation

### Separate the Controls into Two Distinct Zones

**The user's proposal to move zoom controls to the top-right is well-aligned with industry conventions and fixes all diagnosed issues.** Here is the refined specification:

### 4.1 Left Zone: Collapse Button Only

The track-label column in the ruler row contains only the collapse button.

```
+------- 112px track label column --------+
| [v] Collapse                             |
+-----------------------------------------+
```

**Specification:**
- **Position**: Left-aligned within the 112px column, vertically centered in the 28px ruler height
- **Icon**: `IconChevronDown` (current), 14px (increased from 12px for better target)
- **Tap area**: 28x28px (meets 24px minimum, within 28px ruler height constraint)
- **Style**: Current style preserved (`text-fg-muted hover:text-fg hover:bg-surface-raised`)
- **aria-label**: `"Collapse timeline"` with `aria-expanded={true}`

**Rationale**: The collapse button is semantically a panel-frame control (it changes the workspace layout), so it belongs in the panel's structural edge area. Keeping it in the track-label column is consistent with the `ux-panel-collapse.md` spec, where the collapse button lives inside the panel at the edge nearest the center content.

### 4.2 Right Zone: Zoom Controls in Ruler Area

Zoom controls move to the right end of the ruler row, positioned as a floating cluster over the ruler area (or right-aligned within it).

```
+--- 112px ---+--- Ruler ticks -----------------------------------------+
| [v]         | 0   1   2   3   4   5     [zoom-] 100% [zoom+] [fit]   |
+-------------+----------------------------------------------------------+
```

**Specification:**

- **Position**: Right-aligned within the ruler row, `right: 8px`, vertically centered. The controls float over the rightmost ruler ticks.
- **Layout**: `display: flex; align-items: center; gap: 4px;` (increased from `gap-0.5` / 2px to `gap-1` / 4px for better separation)
- **Background**: Semi-transparent surface to prevent ruler tick clutter underneath: `bg-surface/80 backdrop-blur-sm rounded-md px-1.5 py-0.5`
- **Contents (left to right)**:
  1. **Zoom out** button: `IconZoomOut`, 14px icon, 28x28px tap area
  2. **Percentage display**: `text-[10px]` (increased from 9px), `tabular-nums`, `min-w-[4ch]`, `text-center` -- shows `100%`, `50%`, `200%`, etc.
  3. **Zoom in** button: `IconZoomIn`, 14px icon, 28x28px tap area
  4. **Divider**: 1px `bg-border-subtle`, `h-3.5` (visual separator between zoom level and utility action)
  5. **Fit-to-view** button: `IconMaximize`, 14px icon, 28x28px tap area

- **Icon size**: 14px (increased from 12px -- more legible, better target)
- **Button style**: Same as current (`text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer rounded`)
- **aria-labels**: `"Zoom out"`, `"Zoom in"`, `"{t('timeline.fit')}"` (unchanged)

**Total cluster width**: approximately 28+4+32+4+28+4+1+4+28 = ~133px. This comfortably fits in the ruler area even on a narrow viewport (the ruler is `flex-1`, minimum content width is 480px for the desktop-only constraint).

### 4.3 Interaction: Zoom Scroll Behavior

**Preserved**: `Ctrl/Cmd + scroll wheel` zooms in/out. This is the primary power-user zoom method and works anywhere over the timeline body. The button controls are the visible, discoverable alternative.

**Rationale (Gesture Design Rules)**: "Every gesture action must also be available via a visible control." The visible zoom buttons satisfy this requirement for the Ctrl+scroll gesture.

### 4.4 Future Extensibility

Moving zoom controls to the right side of the ruler opens up two expansion areas:

```
+--- 112px ---+--- Ruler --------------------------------------------------+
| [v]         | 0  1  2  3  4  [snap] [play/pause]  [zoom-] 100% [+] [fit]|
+-------------+-------------------------------------------------------------+
```

**Left side of the control cluster**: Transport controls (play/pause for future playback preview), snap-to-grid toggle. These are also "viewport/editing mode" controls, semantically consistent with the zoom cluster.

**Right remains zoom**: The zoom cluster stays at the far right as the stable terminus of the ruler.

This follows the NLE convention of "transport controls center-left, zoom controls right" seen in Premiere Pro and DaVinci Resolve.

---

## 5. ASCII Wireframe: Before and After

### Before (Current)

```
+------------ 112px ----------------------+--- Ruler ticks ---------->
| [v] [zoom-] 100% [zoom+] [fit]         | 0   1   2   3   4   ...
| (cramped, 12px icons, gap-0.5)          |
+-----------------------------------------+---------------------------
| Track 1 label          [v]              | [Scene A][Scene B]  [+]
+-----------------------------------------+---------------------------
| Track 2 label          [v]              | [Scene C]    [+]
+-----------------------------------------+---------------------------
```

### After (Proposed)

```
+------ 112px -------+--- Ruler ticks ----------------------------------------+
|   [v]              | 0   1   2   3   4    [-] 100% [+] | [fit]             |
|                    |                     ~~~~~~~~~~~~~~~~rounded bg~~~~~~~~~~|
+--------------------+-------------------------------------------------------|
| Track 1 label  [v] | [Scene A][Scene B]  [+]                               |
+--------------------+---------------------------------------------------------+
| Track 2 label  [v] | [Scene C]    [+]                                       |
+--------------------+---------------------------------------------------------+
```

The collapse button now has the full 112px column to itself (luxurious breathing room). The zoom controls sit at the ruler's right edge with a subtle backdrop, clearly associated with the timeline viewport rather than panel management.

---

## 6. Detailed Layout Specification

### Ruler Row Structure (Revised)

```
<div class="flex flex-shrink-0" style={{ height: '28px' }}>
  {/* Track-label column: collapse button only */}
  <div
    class="flex-shrink-0 flex items-center px-2 border-r border-border-subtle"
    style={{ width: '112px' }}
  >
    <button aria-label="Collapse timeline" aria-expanded={true} ...>
      <IconChevronDown size={14} />
    </button>
  </div>

  {/* Ruler area with ticks + right-aligned zoom controls */}
  <div class="relative flex-1">
    {/* Ruler ticks (existing) */}
    <For each={rulerTicks()}>
      {(tick) => ( ... )}
    </For>

    {/* Zoom controls: right-aligned overlay */}
    <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-surface/80 backdrop-blur-sm rounded-md px-1.5 py-0.5 z-10">
      <button aria-label="Zoom out" ...>
        <IconZoomOut size={14} />
      </button>
      <span class="text-[10px] text-fg-muted tabular-nums min-w-[4ch] text-center select-none">
        {Math.round((scale() / DEFAULT_SCALE) * 100)}%
      </span>
      <button aria-label="Zoom in" ...>
        <IconZoomIn size={14} />
      </button>
      <div class="w-px h-3.5 bg-border-subtle" />
      <button aria-label="Fit to view" ...>
        <IconMaximize size={14} />
      </button>
    </div>
  </div>
</div>
```

### Visual Hierarchy

1. **Primary**: Scene clips on the timeline (the user's actual content)
2. **Secondary**: Ruler ticks (spatial reference)
3. **Tertiary**: Zoom controls (tools, visually receded with `text-fg-muted` and semi-transparent background)
4. **Quaternary**: Collapse button (panel management, least frequently used)

**Rationale (Von Restorff Effect)**: The zoom controls should not visually compete with the scene clips. The semi-transparent background and muted text color keep them visible but subordinate to the content.

---

## 7. Accessibility Notes

### Target Sizes
- All buttons increased from ~20px to 28x28px tap area (exceeds 24px web minimum per ergonomics.md)
- Icons increased from 12px to 14px (better legibility at arm's length)
- `gap-1` (4px) between buttons provides adequate separation to prevent mis-taps

### Contrast
- `text-fg-muted` on `bg-surface/80`: inherits existing token contrast which passes 3:1 for UI components
- Hover state `text-fg` on `hover:bg-surface-raised`: passes 4.5:1

### Focus Management
- Tab order: Collapse button (in track-label column) -> ... -> Zoom out -> Zoom in -> Fit to view (natural left-to-right order within the ruler row)
- Focus ring: Uses existing `:focus-visible` styles (2px outline with `--focus-ring` color)

### Screen Reader
- Zoom buttons retain explicit `aria-label` attributes
- Percentage display is decorative (not interactive), so no special ARIA needed. If desired, add `aria-live="polite"` to the percentage `<span>` so screen readers announce zoom level changes
- Collapse button: `aria-expanded={true}` + `aria-label="Collapse timeline"`

### Keyboard
- `Ctrl/Cmd + scroll`: Primary zoom method (unchanged)
- `Tab` through buttons: Functional via standard button focus
- Future consideration: `Ctrl/Cmd + +/-` keyboard shortcuts for zoom in/out (not in scope for this change but would complement the visible buttons per gesture design rules)

---

## 8. Design Rationale

### Key Decision 1: Move Zoom to Top-Right of Ruler Area
**Principles**: Jakob's Law (NLE convention), Fitts's Law (decompressing the cramped track-label column), Cognitive Load (separating unrelated controls).

Professional NLEs universally separate zoom from panel management. Placing zoom at the ruler's right edge follows the user's reading direction and associates the controls with the content they affect.

### Key Decision 2: Keep Collapse Button in Track-Label Column
**Principle**: Consistency with `ux-panel-collapse.md` spec.

The panel collapse design spec places collapse buttons "inside the panel at the edge nearest the center content." For the bottom panel, the track-label column's ruler row is the natural home. This also matches the existing pattern where each track has a collapse chevron in its label area -- the panel-level collapse button mirrors this at the ruler level.

### Key Decision 3: Semi-Transparent Background on Zoom Cluster
**Principle**: Cognitive Load (visual layering without occlusion).

The zoom controls float over the rightmost ruler ticks. Without a background, they would visually collide with tick marks and numbers. The `bg-surface/80 backdrop-blur-sm` creates a subtle visual layer that separates the controls from the ruler without completely hiding the ticks. This is the standard pattern in NLEs (e.g., DaVinci Resolve's timeline zoom overlay).

### Key Decision 4: Increase Icon Size from 12px to 14px
**Principle**: Fitts's Law (larger targets are easier to hit) + Accessibility (legibility).

The current 12px icons inside 20px tap areas are below the recommended 24px minimum click target for web. Increasing to 14px icons within 28px tap areas brings the design into compliance while staying proportional to the 28px ruler height.

### Key Decision 5: Add Visual Divider Between Zoom Level and Fit Button
**Principle**: Gestalt Proximity + Similarity.

The zoom-out, percentage, and zoom-in controls form a coherent "zoom level" group. The fit-to-view button is a distinct utility action (it resets to default, not a relative adjustment). The 1px divider visually separates these into two sub-groups within the cluster, reducing the Hick's Law cost of scanning the cluster.

### What Was Removed
- The false grouping of collapse + zoom in the 112px column
- The excessively tight spacing (`gap-0.5`) between controls

### What Was Changed
- Icon sizes: 12px -> 14px
- Inter-button gap: 2px -> 4px
- Percentage text: 9px -> 10px, `3ch` -> `4ch` minimum width
- Zoom cluster position: left (track-label column) -> right (ruler area, absolute-positioned)

### What Was Preserved
- All existing functionality (zoom in, zoom out, fit-to-view, collapse, Ctrl+scroll)
- The existing `onCollapse` prop pattern from `ux-panel-collapse.md`
- The existing keyboard shortcuts

---

## 9. Open Questions

1. **Should the zoom percentage be interactive (click to type a specific value)?** Some NLEs allow clicking the percentage to type an exact zoom level. This is a power-user feature that could be added later. For now, the display-only percentage is sufficient.

2. **Should Ctrl+Plus/Minus keyboard shortcuts be added for zoom?** This would complement the visible buttons and the Ctrl+scroll gesture. Low implementation cost, high discoverability for keyboard-heavy users. Recommend adding in the same implementation pass.

3. **Snap-to-grid toggle placement**: When snap-to-grid is implemented, it should go to the left of the zoom cluster (within the same ruler right-aligned area), separated by another divider. This maintains the "editing tools | zoom" split seen in professional NLEs.
