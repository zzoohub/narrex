# Config Bar

**Location:** Top of workspace, full width (dropdown from merged header bar — see [workspace-layout.md](./workspace-layout.md))
**Primary action:** Edit global story settings

---

## Expanded State

```
+---------------------------------------------------------------+
| [^] Story Settings                                            |
|                                                               |
|  Genre            Theme              Era / Location           |
|  [Regression      [Revenge, second   [Medieval fantasy        |
|   Fantasy    ]     chance, growth]    kingdom        ]        |
|                                                               |
|  Point of View    Mood / Tone                                 |
|  [1st Person  v]  [Tense] [Dark] [Hopeful undertone] [+ Add] |
|                                                               |
+---------------------------------------------------------------+
```

## Interaction Details

- Genre, Theme, Era/Location: free text inputs with dropdown suggestions for common Korean web novel genres.
- Point of View: dropdown (1st person / 3rd person limited / 3rd person omniscient).
- Mood/Tone: tag chips. Click to edit, [+ Add] to add new tag, click [x] on tag to remove.
- Changes auto-save. Scenes with drafts generated before the change display a "config changed" indicator (Zeigarnik: incomplete state visible).

**"Config changed" indicator on scenes:**

Scenes whose draft was generated with different config values show a small warning badge. Hovering the badge shows: "Story settings changed since this draft was generated. Re-generate to apply new settings."

---

## UX Review — Exterior (Open/Close)

> Note: Issue #2 below was superseded by the Single Bar Merge in [workspace-layout.md](./workspace-layout.md) — config is now a dropdown from the merged header bar.

| # | Severity | Issue | Recommendation |
|---|----------|-------|----------------|
| 1 | **Critical** | No collapsed summary — user can't see genre/tone/POV without opening | Show inline summary in header: `Genre | Tone | Era | POV` |
| 2 | **Major** | Dropdown overlay vs spec's push-down accordion (context loss, no exit transition) | Superseded — dropdown from single merged bar |
| 3 | **Major** | No chevron affordance on toggle button; label hidden on small screens; active state too subtle | Add chevron icon, always show label, increase active state to `bg-accent/20` |
| 4 | Minor | 3-column grid wastes space, unequal content widths | Use flex-wrap with label-value pairs |
| 5 | Minor | Missing placeholder text on Genre/Theme/Era inputs | Add `placeholder` with examples: "e.g., 회귀 판타지" |
| 6 | Minor | `appearance-none` on select removes arrow with no replacement | Add custom chevron icon |
| 7 | Minor | Tag input: no suggestions, narrow `w-28`, no duplicate feedback, chip remove target <24px | Add suggestion dropdown, widen input, shake+tooltip on duplicate, increase chip `p-1.5` |
| 8 | Minor | No keyboard shortcut for config toggle | Add `Cmd+Shift+S` or `Cmd+,` |
| 9 | **Major** | Missing error/offline states for auto-save — silent data loss risk | Wire into `saveStatus` signal, show red error state, consider per-field error indicators |
| 10 | Minor | "Config changed" badge on scenes not implemented (Zeigarnik Effect) | Store config version timestamp, compare against scene generation timestamp |

**Priority:** #1 -> #9 -> #3 -> (rest)

---

## UX Review — Interior (Field Layout, Inputs, Accessibility)

**Scope:** The INTERIOR content of the expanded config panel -- field layout, input affordances, tone tag UX, visual hierarchy, scannability, accessibility. Excludes the open/close mechanism.

**User goal (JTBD):** "When I open the config panel, I want to quickly verify or adjust my story's global settings (genre, theme, era, POV, tone) so that AI-generated drafts match my creative vision."

**User mental state:** Mid-flow. The writer opened config to tweak a setting before generating a draft, or to verify what the AI will use. They want to get in, adjust, and get out fast. This is a reference/edit panel, not a discovery flow.

### Issue I-1: No placeholder text on text inputs

**Severity:** Major
**Principle violated:** Copy failure, Recognition over Recall

**Problem:** The Genre, Theme, and Era/Location inputs have no placeholder text. When empty, the user sees a blank box with only an uppercase label above it. No indication of expected content, format, or examples.

**Recommendation:**

| Field | Placeholder (ko) | Placeholder (en) |
|-------|------------------|------------------|
| Genre | `예: 회귀 판타지` | `e.g., Regression Fantasy` |
| Theme | `예: 복수, 성장, 구원` | `e.g., Revenge, Growth, Redemption` |
| Era/Location | `예: 중세 판타지 왕국` | `e.g., Medieval Fantasy Kingdom` |

Add i18n keys: `config.genre.placeholder`, `config.theme.placeholder`, `config.era.placeholder`.

### Issue I-2: Native `<select>` with `appearance-none` loses dropdown affordance

**Severity:** Major
**Principle violated:** Jakob's Law, Fitts's Law

**Problem:** The POV field uses a native `<select>` with `appearance-none` applied via the shared `inputClass`. This removes the browser's native dropdown arrow. The field looks identical to the text inputs.

**Recommendation:** Wrap the select in a `relative` div, add an `IconChevronDown` absolutely positioned on the right with `pointer-events-none`, and add `pr-8` padding to the select to avoid text overlap.

### Issue I-3: Tone tag inline input is too narrow and lacks discoverability

**Severity:** Major
**Principle violated:** Fitts's Law, Copy failure, Cognitive Load

**Problem:** The `w-28` (112px) input with `placeholder="추가"` has multiple issues:
1. Width too narrow for Korean text
2. Placeholder unhelpful (repeats button label)
3. No visible confirm/cancel buttons (keyboard-only affordances)
4. Duplicate handling is silent

**Recommendation:**
1. Widen to `min-w-40 max-w-60`
2. Change placeholder to example: `"예: 긴장감"` (ko) / `"e.g., Tense"` (en)
3. Add inline hint or small checkmark/X buttons
4. Add duplicate feedback: shake animation on existing chip + `bg-accent-muted` flash for 300ms

### Issue I-4: Chip remove button target size too small

**Severity:** Minor (accessibility failure)
**Principle violated:** Fitts's Law, WCAG 2.1 AA touch target

**Problem:** Chip remove button is ~16x16px, well below 24px minimum.

**Recommendation:** Increase padding to `p-1.5`, or apply `min-w-6 min-h-6` (24px).

### Issue I-5: Labels use uppercase tracking which hurts readability for Korean

**Severity:** Minor

**Problem:** `tracking-wide` (letter-spacing) makes Hangul characters look visually fragmented.

**Recommendation:** Remove `tracking-wide` globally (labels are already short in both languages).

### Issue I-6: 3-column grid creates awkward row 2 layout

**Severity:** Minor

**Recommendation (Option B, minimal disruption):** Swap Theme and POV positions.

```
Row 1: Genre [text] | Era/Location [text] | POV [select v]
Row 2: Theme [text] | Mood/Tone [chips] (span 2)
```

### Issue I-7: No empty state guidance for the panel

**Severity:** Minor

**Recommendation:** Add helper line at bottom of panel:
- ko: `"이 설정은 AI 초고 생성에 사용됩니다. 변경 사항은 자동 저장됩니다."`
- en: `"These settings guide AI draft generation. Changes save automatically."`

### Issue I-8: No save status feedback within the panel

**Severity:** Major
**Principle violated:** Feedback gap, Doherty Threshold

**Problem:** Save status in workspace header is too far from config inputs. No local feedback during auto-save debounce.

**Recommendation:** Add inline save indicator within the panel (`text-xs text-fg-muted`). Combine with helper text from I-7 into a footer line showing live save status.

### Issue I-9: Config panel inputs use `bg-canvas` instead of `bg-surface`

**Severity:** Minor

**Recommendation:** Use the shared `TextInput` component instead of raw `<input>` elements.

### Issue I-10: Focus management when panel opens/closes

**Severity:** Minor

**Recommendation:** On open: `createEffect` watches `props.open`, calls `ref.focus()` on first input (Genre). On close: return focus to config trigger button.

### Summary

| # | Severity | Issue | Fix Effort |
|---|----------|-------|------------|
| I-1 | **Major** | No placeholder text | Low |
| I-2 | **Major** | Select loses dropdown arrow | Low |
| I-3 | **Major** | Tone tag input: narrow, bad placeholder, no confirm/cancel, silent duplicate | Medium |
| I-4 | Minor | Chip remove target too small | Low |
| I-5 | Minor | `tracking-wide` on Korean labels | Low |
| I-6 | Minor | Grid row 2 layout unbalanced | Medium |
| I-7 | Minor | No guidance about settings purpose | Low |
| I-8 | **Major** | No save feedback in panel | Low |
| I-9 | Minor | `bg-canvas` vs shared `TextInput` | Low |
| I-10 | Minor | No focus management | Low |

**Priority:** I-1 + I-2 + I-8 -> I-3 -> I-4 + I-9 + I-10 -> I-5 + I-6 + I-7
