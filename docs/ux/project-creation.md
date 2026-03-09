# Project Creation

**Route:** `/new`
**Primary action:** Submit story idea for auto-structuring
**Entry points:** Dashboard [+ New Project]

---

## Layout

```
+---------------------------------------------------------------+
| <- Back to Projects                                           |
+---------------------------------------------------------------+
|                                                               |
|                  Start a New Story                            |
|                                                               |
|  Describe your story idea. Paste your notes, outline,        |
|  character descriptions — anything you have.                  |
|                                                               |
|  +-------------------------------------------------------+   |
|  | [Multi-line text area]                                 |   |
|  |                                                        |   |
|  | Placeholder: "A regression fantasy where a failed      |   |
|  |  knight returns to his childhood to change fate..."    |   |
|  |                                                        |   |
|  +-------------------------------------------------------+   |
|                                                               |
|  Or import a file:                                            |
|  +- - - - - - - - - - - - - - - - - - - - - - - - - - - +   |
|  |  Drop a file here (.md, .txt)                         |   |
|  |  or [Browse Files]                                     |   |
|  +- - - - - - - - - - - - - - - - - - - - - - - - - - - +   |
|                                                               |
|                              [Structure My Story]             |
|                                                               |
+---------------------------------------------------------------+
```

**Interaction details:**
- Text area: auto-growing, no character limit, supports paste of large text blocks.
- File drop zone: secondary visual weight (dashed border, muted). Accepts .md, .txt. Shows file name after drop with [x] to remove.
- [Structure My Story] button: primary CTA. Disabled until text area has content or file is uploaded. (Von Restorff: single primary action)
- Genre template gallery: [Phase 2] Would appear as a third option between text and file import.

## Clarifying Questions Sub-state

When input is too vague, replaces the form with a conversational flow:

```
+---------------------------------------------------------------+
|                                                               |
|  I need a bit more detail to structure your story.            |
|                                                               |
|  What genre is this? (e.g., regression fantasy, romance,      |
|  martial arts, thriller)                                      |
|  +-------------------------------------------------------+   |
|  | [text input]                                           |   |
|  +-------------------------------------------------------+   |
|                                                               |
|  Who is the main character?                                   |
|  +-------------------------------------------------------+   |
|  | [text input]                                           |   |
|  +-------------------------------------------------------+   |
|                                                               |
|  What is the central conflict or event?                       |
|  +-------------------------------------------------------+   |
|  | [text input]                                           |   |
|  +-------------------------------------------------------+   |
|                                                               |
|                              [Structure My Story]             |
|                                                               |
+---------------------------------------------------------------+
```

## States

| State | Design |
|-------|--------|
| Empty (initial) | Text area with placeholder, file drop zone, disabled CTA |
| Text entered | CTA becomes active (filled primary button) |
| File uploaded | File name shown with remove option, CTA active |
| Clarifying | Question form replaces input area |
| Processing | Live generation preview — streaming cards + progress sidebar (see below) |
| Error (processing failed) | "We couldn't structure this input. Try adding more detail about your characters and plot." + [Try Again] returns to input state with content preserved |

---

## Processing State — Live Generation Preview

Replaces the old static orb+steps screen with a live streaming preview. The page widens to `max-w-5xl` and shows a two-column layout: a left streaming log (70%) with real-time LLM output rendered as structured cards (character cards, timeline clips, world details), and a right progress sidebar (30%) with a segmented progress bar, step indicators, and elapsed time. The `token` SSE events (previously unused) drive the streaming display.

### Problem

The current processing state shows an animated orb with a sparkle icon and 3 step indicators (characters, timeline, world) that advance based on keyword-matching in SSE `progress` messages. The `token` SSE events (raw LLM output) are completely unused.

**User complaint:** "Feels like it takes too long." The 10-30 second wait provides no meaningful content -- just an animation and vague step labels. The user's mental model is: "I gave you my story idea, what are you doing with it?" The current screen answers with a static checklist, not with evidence of work happening.

**Root cause diagnosis:**

| Symptom | Principle | Violation |
|---------|-----------|-----------|
| Wait feels too long | Doherty Threshold | >10s wait with no meaningful content. Skeleton/progress alone is insufficient for this duration. |
| User loses engagement | Goal Gradient | Progress is coarse (3 big steps) with no granularity. Motivation stalls between step completions. |
| User remembers wait negatively | Peak-End Rule | The peak (most intense moment) is boredom. The ending (abrupt redirect) is disorienting. |
| Unused data (`token` events) | Cognitive Load (germane) | Germane cognitive load (learning/understanding) is being suppressed. The user WANTS to see what's being created -- this is the exciting part. |

### Design Goals

1. **Show real-time evidence of work** -- stream the LLM's output so the user sees characters, timeline events, and world elements appearing live
2. **Granular progress** -- segmented progress bar with fine-grained advancement (not just 3 coarse steps)
3. **Cinematic feel** -- maintain the "Ink & Amber" dark writing studio aesthetic, make the reveal feel dramatic
4. **Smooth completion transition** -- don't abruptly redirect; land the experience gracefully
5. **Both ko and en** -- all new copy bilingual

### Key Design Decision: Structured Cards vs. Raw Text

**Decision: Structured cards with streaming text, NOT raw token dump.**

Rationale:
- Raw LLM output (JSON-like, mixed delimiters, sometimes malformed mid-stream) violates **Jakob's Law** -- users don't expect to read machine output
- Structured cards (character cards, timeline entries, world details) match the workspace UI the user is about to see, creating **visual continuity** (shared element transition principle)
- Cards provide natural chunking (**Miller's Law**) -- each card is a digestible unit vs. a wall of streaming text
- The `progress` events already demarcate phases (characters, timeline, world); within each phase, the `token` stream content is parsed and rendered as cards

**Trade-off noted:** Parsing `token` events into structured cards requires a lightweight client-side parser. If the LLM output format varies, card rendering may produce partial or incorrect cards. **Mitigation:** show a "raw text" fallback line below each card area that displays the last N characters of unparsed tokens, so even if card parsing fails, the user sees activity. Flag for testing.

### Layout

The processing state transitions from `max-w-2xl` (input state) to `max-w-5xl` (processing state) with a 300ms ease-out width expansion.

```
+---------------------------------------------------------------+
| <- Back to Projects                                           |
+---------------------------------------------------------------+
|                                                               |
|  +-------------------------------------------+  +---------+  |
|  |  LIVE PREVIEW (streaming area)            |  | PROGRESS|  |
|  |  ~70% width                               |  | ~30%    |  |
|  |                                           |  |         |  |
|  |  Phase heading: "Characters"              |  | [=====] |  |
|  |                                           |  | 65%     |  |
|  |  +-- Character Card --+  +-- Card --+    |  |         |  |
|  |  | Name: Camilla      |  | Name: Duke|   |  | Steps:  |  |
|  |  | Role: Villainess   |  | Role: ML  |   |  | [x] 1   |  |
|  |  | Traits: cunning... |  | Traits:...|   |  | [>] 2   |  |
|  |  +--------------------+  +-----------+    |  | [ ] 3   |  |
|  |                                           |  |         |  |
|  |  Phase heading: "Timeline"                |  | 0:12    |  |
|  |                                           |  |         |  |
|  |  +-- Scene Entry --+                      |  |         |  |
|  |  | Scene 1: Awakening as Camilla          |  |         |  |
|  |  | Characters: Camilla, Maid              |  |         |  |
|  |  +-- Scene Entry --+  (streaming...)      |  |         |  |
|  |  | Scene 2: First encounter wit|          |  |         |  |
|  |                                           |  |         |  |
|  +-------------------------------------------+  +---------+  |
|                                                               |
+---------------------------------------------------------------+
```

### Live Preview Area (Left, ~70%)

**Container:** `flex-1 min-w-0 overflow-y-auto max-h-[calc(100vh-160px)]` with smooth auto-scroll to bottom as new content arrives. User can scroll up to review; auto-scroll pauses when user scrolls up and resumes when user scrolls back to bottom.

**Phase sections:** Each phase (characters, timeline, world) is introduced by a heading when the first token for that phase arrives:

| Phase | Heading (ko) | Heading (en) |
|-------|-------------|-------------|
| Characters | 등장인물 | Characters |
| Timeline | 타임라인 | Timeline |
| World | 세계관 | Story World |

Heading style: `text-sm font-semibold text-accent uppercase tracking-wider mb-3 mt-6`. First heading has no `mt-6`. The heading fades in with 200ms animation.

**Character cards:** Rendered as compact cards within a flex-wrap container (`gap-3`).

```
+----------------------------------+
| [initial circle]  Character Name |
| Role label (if parsed)           |
|                                  |
| Personality trait text streaming |
| here as tokens arrive...         |
+----------------------------------+
```

Card style: `bg-surface border border-border-default rounded-lg p-4 w-[220px]`. Initial circle: `w-8 h-8 rounded-full bg-accent/20 text-accent text-sm font-semibold` showing first letter of name. Text streams in with no typewriter delay -- tokens render as fast as they arrive (real LLM speed is the natural "typewriter" effect).

**Timeline entries:** Rendered as a compact vertical list (not full NLE clips -- those come in the workspace).

```
+------------------------------------------+
| [1]  Scene Title                         |
|      Characters: Name1, Name2           |
|      Plot: streaming summary text...     |
+------------------------------------------+
```

Entry style: `border-l-2 border-accent/30 pl-4 py-2 mb-2`. Number badge: `w-5 h-5 rounded-full bg-accent/10 text-accent text-xs inline-flex items-center justify-center`. Scene entries appear one by one as parsing detects scene boundaries.

**World entries:** Rendered as label-value pairs.

```
+------------------------------------------+
| Era / Setting                            |
| Medieval fantasy kingdom, cursed...      |
|                                          |
| Key Locations                            |
| - Royal Palace: streaming text...        |
+------------------------------------------+
```

Entry style: `space-y-3`. Label: `text-xs text-fg-muted uppercase tracking-wider`. Value: `text-sm text-fg leading-relaxed`.

**Streaming cursor:** A pulsing amber cursor (`|`) appears at the end of the currently streaming text. Style: `inline-block w-0.5 h-4 bg-accent animate-pulse`. Disappears when streaming for that section ends.

**Activity fallback line:** At the very bottom of the streaming area, below all cards, a single muted line shows the raw last ~80 characters of token output, truncated. This ensures the user always sees "something happening" even if card parsing hasn't produced a new card yet. Style: `text-xs text-fg-muted/50 font-mono truncate mt-4 border-t border-border-default/30 pt-2`. Label: none (the raw text speaks for itself).

### Progress Sidebar (Right, ~30%)

**Container:** `w-[200px] flex-shrink-0 pl-6 border-l border-border-default/50`

**Progress bar:** Segmented into 3 equal sections (characters | timeline | world). Uses a single horizontal bar with internal segment dividers.

```
[====|====|====]  65%
  C     T     W
```

- Total width: `w-full` (fills sidebar width)
- Height: `h-2 rounded-full bg-surface-raised overflow-hidden`
- Fill: `bg-accent transition-all duration-500 ease-out`
- Segment dividers: 1px lines at 33% and 66% using `after` pseudo-elements, `bg-canvas/50`
- Percentage label: `text-2xl font-display font-semibold text-fg tabular-nums mt-3 mb-6`

**Percentage calculation:**
- Each phase = 33.3%
- Within a phase, percentage advances based on token count ratio: `(tokensReceived / estimatedTokensForPhase) * 33.3`
- Estimated tokens per phase: use a heuristic (e.g., 500 tokens for characters, 800 for timeline, 300 for world). These are approximate -- the bar should never go backward. If actual tokens exceed estimate, cap at phase boundary until the `progress` event signals phase completion.
- When a `progress` event confirms a phase is complete, snap to the next phase boundary (33%, 66%, or 100%).
- Start at 5% (artificial advancement -- Goal Gradient: start above zero).

**Step indicators:** Below the progress bar, 3 step rows:

```
[check] Finding characters       <- completed (text-fg)
[dot>]  Building timeline        <- active (text-fg, font-medium)
[ 3 ]   Setting up world         <- pending (text-fg-muted)
```

Step row style: `flex items-center gap-3 py-2`
- Completed: `bg-success text-white` circle with `IconCheck` (14px)
- Active: `bg-accent text-accent-fg` circle with pulsing dot
- Pending: `bg-surface-raised text-fg-muted` circle with step number

Step labels (ko/en):

| Step | ko | en |
|------|----|----|
| 1 | 등장인물과 관계를 찾는 중 | Finding characters |
| 2 | 타임라인을 구성하는 중 | Building timeline |
| 3 | 세계관을 설정하는 중 | Setting up world |

**Elapsed time:** Below steps. `text-xs text-fg-muted tabular-nums`. Format: `0:12` (mm:ss). Starts at `0:00` when processing begins. No estimated remaining time (too unreliable with LLM inference variance).

**Cancel button:** At the bottom of the sidebar. Ghost style, small. Label: ko `취소` / en `Cancel`. Cancels the SSE stream (`abort()`), returns to input state with content preserved. No confirmation dialog needed (non-destructive -- input is preserved).

### Completion Transition

When the `completed` event arrives:

1. **Progress bar fills to 100%** with a 500ms ease-out animation. Percentage shows "100%".
2. **All steps show completed** (check icons).
3. **Brief pause** (800ms) so the user registers completion.
4. **Live preview area cross-fades** (200ms) to a completion card:

```
+-------------------------------------------+
|                                           |
|  Your story is ready                      |
|  이야기가 준비되었습니다                    |
|                                           |
|  4 characters found                       |
|  12 scenes across 2 tracks                |
|  Medieval fantasy setting                 |
|                                           |
|  [Open Workspace ->]                      |
|                                           |
+-------------------------------------------+
```

- **Completion card** replaces the streaming content (cross-fade, not hard cut)
- **Summary stats**: pulled from the `completed` event data. Character count, scene count, track count, setting summary.
- **Primary CTA**: `Open Workspace` / `작업 공간 열기`. Filled primary button, centered. Auto-navigates after 2s if user doesn't click (with a subtle countdown indicator on the button: ring animation like a radial timer). User clicking immediately cancels the auto-redirect.
- **Peak-End Rule**: the ending is a moment of accomplishment ("Your story is ready") rather than an abrupt redirect. The user sees what was created before entering the workspace.

**Copy (ko/en):**

| Key | ko | en |
|-----|----|----|
| completion.title | 이야기가 준비되었습니다 | Your story is ready |
| completion.characters | {n}명의 등장인물 | {n} characters found |
| completion.scenes | {n}개의 장면, {t}개의 트랙 | {n} scenes across {t} tracks |
| completion.cta | 작업 공간 열기 | Open Workspace |

### Error During Processing

If an `error` event arrives during processing:

1. Progress bar turns red (`bg-error` instead of `bg-accent`).
2. Streaming area stops. Last content remains visible (don't clear it -- the user might want to read what was generated so far).
3. Error message appears below the streaming area:

```
이야기를 구성하는 중 문제가 발생했습니다.
입력 내용을 수정한 뒤 다시 시도해 보세요.
[다시 시도]
```

- `[다시 시도]` / `[Try Again]`: returns to input state with content preserved.
- If the error is a network error (not an LLM content error), suggest checking connection: `연결 상태를 확인한 뒤 다시 시도해 보세요.` / `Check your connection and try again.`

### i18n Keys

```
creation.processing.title -> REMOVE (replaced by phase headings)

creation.processing.phase.characters: ko "등장인물", en "Characters"
creation.processing.phase.timeline: ko "타임라인", en "Timeline"
creation.processing.phase.world: ko "세계관", en "Story World"

creation.processing.step.characters: ko "등장인물과 관계를 찾는 중", en "Finding characters"
creation.processing.step.timeline: ko "타임라인을 구성하는 중", en "Building timeline"
creation.processing.step.world: ko "세계관을 설정하는 중", en "Setting up world"

creation.processing.cancel: ko "취소", en "Cancel"
creation.processing.elapsed: (no translation -- format is "0:12")

creation.completion.title: ko "이야기가 준비되었습니다", en "Your story is ready"
creation.completion.characters: ko "{n}명의 등장인물", en "{n} characters found"
creation.completion.scenes: ko "{n}개의 장면, {t}개의 트랙", en "{n} scenes across {t} tracks"
creation.completion.cta: ko "작업 공간 열기", en "Open Workspace"

creation.error.during: ko "이야기를 구성하는 중 문제가 발생했습니다.", en "Something went wrong while structuring your story."
creation.error.retry: ko "다시 시도", en "Try Again"
creation.error.network: ko "연결 상태를 확인한 뒤 다시 시도해 보세요.", en "Check your connection and try again."
```

### Processing States

| State | What Happens |
|-------|-------------|
| Processing: initial | Container expands to `max-w-5xl`. Streaming area empty. Progress bar at 5%. Step 1 active. Elapsed timer starts. |
| Processing: characters streaming | Character cards appear in streaming area. Cursor pulses at end of active text. Progress bar advances within 0-33%. Step 1 active. |
| Processing: characters complete | Step 1 shows checkmark. Progress bar snaps to 33%. Phase heading "Timeline" appears. Step 2 becomes active. |
| Processing: timeline streaming | Scene entries appear. Progress bar advances within 33-66%. Step 2 active. |
| Processing: timeline complete | Step 2 shows checkmark. Progress bar snaps to 66%. Phase heading "World" appears. Step 3 becomes active. |
| Processing: world streaming | World entries appear. Progress bar advances within 66-99%. Step 3 active. |
| Completion | Progress bar fills to 100%. All steps completed. 800ms pause. Cross-fade to completion card. Auto-redirect countdown (2s). |
| Error during processing | Progress bar turns red. Streaming stops (content preserved). Error message + retry button appears below streaming area. |
| Cancelled | User clicks Cancel. Abort SSE stream. Return to input state. Content preserved. No confirmation needed. |
| Offline | If connection drops, show inline banner: "연결이 끊겼습니다. 연결되면 다시 시도해 보세요." / "Connection lost. Try again when you're back online." + [Retry]. Content preserved. |

### Accessibility

| Requirement | Implementation |
|-------------|---------------|
| Screen reader: progress updates | Progress bar has `role="progressbar"` with `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-label="Story structuring progress"` |
| Screen reader: streaming content | Streaming area has `aria-live="polite"` with `aria-atomic="false"`. New cards are announced as they appear. Throttle announcements to every ~3s to avoid overwhelming. |
| Screen reader: phase transitions | Phase headings are `<h2>` elements. Step completion announced via `aria-live="assertive"` region: "Characters complete. Building timeline." |
| Screen reader: completion | Completion card announced: "Story structuring complete. 4 characters found, 12 scenes across 2 tracks." Focus moves to CTA button. |
| Keyboard | Cancel button focusable. Tab order: streaming area (scrollable, not focusable) -> progress sidebar -> cancel button. On completion: focus moves to "Open Workspace" CTA. |
| Reduced motion | `prefers-reduced-motion`: disable pulsing cursor, disable streaming area auto-scroll animation (instant scroll), disable progress bar fill animation (instant fill), disable completion cross-fade (instant swap). Container width change: instant (no 300ms transition). |
| Contrast | Progress bar fill (`bg-accent`) against track (`bg-surface-raised`): meets 3:1 UI component contrast. Step text: `text-fg` (passes 4.5:1). Muted text: `text-fg-muted` must pass 4.5:1 against `bg-canvas`. |
| Color not sole indicator | Steps use icon (check/dot/number) + text label + color. Progress bar has percentage text. Error uses red + text message + icon. |

### Token Parsing Strategy

The client needs to convert raw `token` events (plain text chunks) into structured cards. This is a client-side concern, not a UX decision, but the UX depends on it working. High-level approach:

1. **Accumulate tokens** into a buffer string per phase.
2. **Phase detection**: when a `progress` event signals a new phase (e.g., message contains "character" or "등장인물"), switch the rendering context. All subsequent tokens render under the new phase heading.
3. **Card extraction**: within each phase, use lightweight regex/string matching to detect card boundaries:
   - Characters: look for name patterns, role labels, personality descriptions. Each character becomes a card.
   - Timeline: look for scene number/title patterns. Each scene becomes a list entry.
   - World: render as flowing text with label-value pairs.
4. **Graceful degradation**: if parsing fails to extract structured cards, fall back to rendering the raw text as a monospace block within the phase section. The user still sees activity. The activity fallback line always shows regardless.

**This parsing logic is the highest-risk area of this design.** It depends on the LLM output format being reasonably consistent. Recommend: (a) server-side structured output (JSON mode) if the LLM supports it, which would make client parsing trivial; (b) if not, invest in testing the parser against 10+ real LLM outputs before shipping.

### Design Rationale

| Decision | Principle | Reasoning |
|----------|-----------|-----------|
| Show streaming content instead of static checklist | Doherty Threshold, Goal Gradient | >10s wait demands content, not just progress indicators. Showing work-in-progress makes the wait productive and engaging. |
| Structured cards, not raw text | Jakob's Law, Miller's Law, Aesthetic-Usability | Raw LLM output is illegible to non-technical users. Cards match the workspace UI (visual continuity). Chunked into digestible units. |
| Segmented progress bar with percentage | Goal Gradient | Granular progress (not just 3 coarse steps) increases motivation. Percentage gives concrete sense of how far along. |
| Start progress at 5% | Goal Gradient (artificial advancement) | Starting at 0% feels like nothing has happened. 5% signals "we've begun." |
| Completion card before redirect | Peak-End Rule | The ending should be a moment of accomplishment, not an abrupt redirect. User sees what was created. |
| Auto-redirect with countdown (2s) | Doherty Threshold | Don't make user click if they're ready to proceed. But give them agency to click early or read the summary. |
| Cancel button (no confirmation) | Cognitive Load | Cancellation is non-destructive (input preserved). A confirmation dialog would add unnecessary friction. |
| Elapsed time, not estimated remaining | Honesty | LLM inference time varies too much. A wrong ETA is worse than no ETA. Elapsed time at least tells user "it's been running for 12 seconds." |
| Wider layout (`max-w-5xl`) during processing | Fitts's Law, Cognitive Load | The streaming content + progress sidebar needs horizontal space. The input state's `max-w-2xl` is too narrow for a two-column layout. |
| Activity fallback line | Feedback gap | Even if card parsing fails, user must see evidence of activity. The fallback line is a safety net. |

### What Was Removed

| Element | Reason for Removal |
|---------|-------------------|
| Animated orb with sparkle icon | Decorative. Provides no information. Replaced by live content which is inherently more engaging. |
| Static processing title ("Structuring your story...") | Replaced by phase headings that appear dynamically. The title added no information the user didn't already know. |
| Step labels as the primary content | Steps are now a secondary element in the sidebar. The primary content is the live preview -- which is the actual value being created. |

### Open Questions (Flag for Testing)

1. **Auto-scroll behavior**: Should auto-scroll be opt-in or opt-out? Current spec: auto-scroll is on, pauses when user scrolls up. Test: do users want to read cards as they appear (prefer auto-scroll) or review at their own pace (prefer manual)?
2. **Card rendering fidelity**: How consistent is the LLM output format? If it varies significantly between runs, the card parser will produce inconsistent results. Test with 10+ real generations.
3. **Completion auto-redirect timing**: 2 seconds may be too fast for users who want to read the summary, or too slow for users who want to get to work. Test: track whether users click the CTA before or after the auto-redirect fires.
4. **Percentage accuracy**: The token-count heuristic for percentage may produce jumpy or stalled progress bars if LLM output length varies. Consider: should the bar use a time-based easing (smooth animation regardless of token rate) with snap-to-boundary on phase completion? Flag for testing.
