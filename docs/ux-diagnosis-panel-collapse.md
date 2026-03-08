# UX Diagnosis: Workspace Double Header Bar

**Type:** Diagnosis (Mode B)
**Date:** 2026-03-09
**Scope:** Top header bar + Config bar in workspace view

---

## 1. Context

### User's ONE Goal (from UX Design Doc)
**JTBD:** "When I have a story idea, I want to turn it into a structured, multi-episode novel draft."

The user's primary activity in the workspace is **writing and structuring** -- selecting scenes, generating drafts, editing prose, managing characters. The top bars exist to provide navigation and story-level settings. They are support functions, not the core task.

### What is Being Diagnosed

Two separate horizontal bars at the top of the workspace:

```
+---------------------------------------------------------------+
| [<] Narrex . Project Title              [sun/moon] Saved      |  <- Bar 1: Header (44px)
+---------------------------------------------------------------+
| [v] STORY CONFIG  [Fantasy] [Tense] [Dark]  Medieval  1st     |  <- Bar 2: Config (44px collapsed)
+---------------------------------------------------------------+
| Workspace panels below (editor, timeline, character map...)    |
```

Combined: 88px of fixed vertical space consumed before workspace content begins.

---

## 2. Diagnosis

### Root Problem: Extraneous Cognitive Load + Wasted Vertical Space

**Principle violated: Cognitive Load Theory (Extraneous Load)**
The two bars present two separate visual layers for content that could coexist in one. The user must process two distinct horizontal bands -- each with its own `bg-surface` background, `border-b` divider, and internal layout logic -- before reaching the actual workspace. This is extraneous complexity: the design's structure, not the task's complexity, is creating the overhead.

**Principle violated: Fitts's Law (Distance)**
The config bar pushes the workspace panels 88px down from the top. For a writing tool where vertical space is the most precious resource (the editor needs height for prose; the timeline needs height for tracks), every pixel matters. 44px of that 88px is recoverable.

### Issue Breakdown

| # | Issue | Severity | Principle |
|---|-------|----------|-----------|
| 1 | Two bars consume 88px of vertical space in a vertical-space-critical layout | **Major** | Cognitive Load (extraneous), Fitts's Law |
| 2 | Config bar collapsed state is low-value: genre chip + tone tags are informational, not actionable | **Minor** | Progressive Disclosure (overcorrection -- disclosing info nobody asked for) |
| 3 | Two separate `border-b` dividers create visual noise at the top of the workspace | **Minor** | Aesthetic-Usability Effect |
| 4 | The header bar and config bar have identical styling (`h-11`, `bg-surface`, `border-b border-border-default`), reinforcing the perception of redundancy | **Minor** | Jakob's Law (professional tools use a single top bar) |

### Why This "Feels Wrong"

The user's instinct is correct. Looking at reference applications that share Narrex's mental model ("video editor" as stated in the UX design doc):

- **Premiere Pro**: Single top menu bar. Project settings are in a dialog, not a persistent bar.
- **DaVinci Resolve**: Single top toolbar. Project settings are in a modal.
- **Figma**: Single top bar (file name, tools, sharing). Document settings are in a right-panel inspector.
- **VS Code**: Single title bar. Settings are a separate page/panel.

None of these tools dedicate a second persistent bar to project-level settings. Story config is a "set once, adjust rarely" concern -- it does not merit always-visible screen real estate.

**Jakob's Law**: Users of creative tools expect a single top bar. A second bar breaks this convention.

---

## 3. Recommendation: Merge into a Single Bar

### Strategy

Absorb the config bar's functionality into the header bar. The collapsed config summary (genre chip, tone tags) is removed from the top entirely. The expanded config form is accessed via a trigger in the merged bar.

### Rationale

1. **Config is "set and forget"**: Genre, POV, era, and tone are established during project creation and adjusted infrequently. They do not need a persistent collapsed summary.
2. **The collapsed summary provides no actionable information**: Seeing "Fantasy, Tense, Dark" does not help the user complete their current task (selecting a scene, writing prose). It is context, not a tool.
3. **The expand/collapse pattern was already progressive disclosure**: We keep that pattern but move the trigger into the single header bar.

### Merged Bar Layout

```
+---------------------------------------------------------------+
| [<]  Narrex . Project Title   [Config v] [sun/moon]   Saved   |   44px total
+---------------------------------------------------------------+
| Workspace panels (editor, timeline, character map...)          |
```

**Single bar, 44px (`h-11`).** Saves 44px of vertical space (a 50% reduction in top-bar height).

#### Left Section
- Back chevron (link to dashboard)
- "Narrex" logo text
- Separator dot
- Project title (truncated with `max-w-xs`)

#### Center/Right Section
- **Config trigger button**: A subtle button labeled with a settings/sliders icon + "Config" text (or just the icon). Clicking opens the expanded config panel as a **dropdown panel** below the header bar.
- Theme toggle (sun/moon icon)
- Save status text ("Saved" / "Saving...")

#### Config Dropdown Panel (on click)

When the user clicks the config trigger, the expanded config form drops down below the header bar as an overlay panel. This is functionally identical to the current expanded config bar, but:

1. It overlays the workspace instead of pushing it down.
2. It is dismissed by clicking outside, pressing Escape, or clicking the trigger again.
3. It does not consume persistent vertical space when not in use.

```
+---------------------------------------------------------------+
| [<]  Narrex . Project Title   [Config ^] [sun/moon]   Saved   |   44px
+---------------------------------------------------------------+
| +-----------------------------------------------------------+ |
| | Story Settings                                             | |
| |                                                            | |
| |  Genre            Theme              Era / Location        | |
| |  [Regression      [Revenge, second   [Medieval fantasy     | |
| |   Fantasy    ]     chance, growth]    kingdom        ]     | |
| |                                                            | |
| |  Point of View    Mood / Tone                              | |
| |  [1st Person  v]  [Tense] [Dark] [Hopeful] [+ Add]        | |
| |                                                            | |
| +-----------------------------------------------------------+ |
|                                                                |
| Workspace panels (visible behind the dropdown, dimmed)         |
```

### What Gets Removed and Why

| Removed Element | Reason |
|----------------|--------|
| Collapsed config summary (genre chip, tone tags, era, POV) | Informational-only, does not help the current task. Config is "set and forget." Removing passes the removal test: no user is blocked by the absence of a passive genre label. |
| Second `border-b` divider | Visual noise eliminated. |
| Second 44px bar | 44px of vertical space reclaimed for the workspace. |
| Persistent push-down of workspace on config expand | Replaced with overlay. Workspace content is never displaced. |

### What Stays

| Kept Element | Reason |
|-------------|--------|
| All config form fields (genre, theme, era, POV, tone tags) | Full editing capability preserved, just relocated behind a click. |
| Auto-save on config changes | Unchanged. |
| "Config changed" indicator on scenes | Unchanged. |
| Header items (back, logo, title, theme toggle, save status) | All remain in the single bar. |

---

## 4. Alternative Considered: Keep Two Bars, Reduce Config Bar Height

An alternative is to shrink the collapsed config bar to ~28px (a thin label-only strip). This would reduce total height to 72px instead of 88px.

**Why this was rejected:**
- It still violates Jakob's Law (two bars in a single-bar convention).
- It still consumes persistent space for passive information.
- A 28px bar with tiny text and chips creates Fitts's Law problems (small targets).
- It is a half-measure that addresses the symptom (too much space) but not the cause (redundant structural layer).

---

## 5. Implementation Notes

### Changes Required

**`apps/web/src/views/workspace/index.tsx`:**
- Remove the `<ConfigBar />` component rendering as a separate section.
- Add a config trigger button to the existing `<header>` bar.
- Render `<ConfigBar />` as a dropdown/popover anchored to the trigger button.

**`apps/web/src/widgets/config-bar/index.tsx`:**
- Remove the collapsed bar UI (the `<button>` that toggles expand/collapse with summary chips).
- Render only the expanded form content.
- The open/close state is now controlled by the parent (workspace), not internally.
- Add click-outside-to-dismiss and Escape-to-dismiss behavior.
- The dropdown panel should have `position: absolute`, `z-index` above workspace panels, and a `bg-surface` background with `border border-border-default rounded-lg shadow-lg` for the overlay appearance.

**`apps/web/src/shared/lib/i18n.tsx`:**
- Ensure `config.title` ("Story Settings") key exists for the dropdown panel header.

### Accessibility Considerations

- Config trigger button: `aria-haspopup="true"`, `aria-expanded={isOpen}`.
- Dropdown panel: `role="dialog"`, `aria-label="Story settings"`.
- Focus management: on open, focus moves to first input in the panel. On close, focus returns to the trigger button.
- Keyboard: Escape closes the dropdown.

### Interaction Timing

- Dropdown open: 200ms ease-out slide-down + fade-in (per `interaction-patterns.md` expand/collapse duration).
- Dropdown close: 150ms ease-in slide-up + fade-out.
- `prefers-reduced-motion`: instant show/hide, no animation.

---

## 6. Design Rationale Summary

| Decision | Principle |
|----------|-----------|
| Merge two bars into one | **Jakob's Law** -- creative tools use a single top bar. **Cognitive Load** -- reduce extraneous structural layers. |
| Remove collapsed config summary | **Removal test** -- removing it does not block any user task. Passive information that adds no value to the active writing workflow. |
| Config as dropdown overlay instead of push-down | **Fitts's Law** -- do not displace workspace content. The workspace panels remain stable when config is opened. |
| Keep full config form accessible in one click | **Progressive Disclosure** -- details on demand, not details by default. |
| Overlay dismisses on click-outside and Escape | **Jakob's Law** -- standard dropdown/popover behavior. |

---

## 7. Checklist

- [x] User's ONE goal clearly identified
- [x] Root cause diagnosed with principle citations
- [x] Issues prioritized by severity
- [x] Concrete recommendation provided with layout description
- [x] Removal test applied to each removed element
- [x] Alternative considered and rejected with reasoning
- [x] Accessibility addressed (focus management, ARIA, keyboard)
- [x] Implementation path outlined
- [x] No anti-patterns introduced by the recommendation
