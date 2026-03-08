# Narrex — UX Design

**Status:** Draft
**Author:** zzoo
**Last Updated:** 2026-03-09
**PRD:** docs/prd.md | docs/prd-phase-1.md

---

## 1. First Principles

### User's ONE Goal

**JTBD:** "When I have a story idea that I'm excited about, I want to turn it into a structured, multi-episode novel without needing to master the craft of prose writing, so I can finally see my story exist as a real, readable work."

The user's goal is not "use a timeline" or "manage characters" — it is **to hold a finished draft of their story**. Every screen, interaction, and element exists to move the user closer to that draft.

### Minimum Needed

1. A way to input the idea (project creation)
2. A way to see the structured result (workspace: timeline + character map)
3. A way to generate prose (AI draft generation per scene)
4. A way to refine prose (editor with direction-based edits)

### What Can Be Removed

- No onboarding tutorial (Phase 1). UI must be self-explanatory via clear empty states and inline hints.
- No settings page. Config bar handles all story settings; account settings are minimal.
- No landing page inside the app. Dashboard is the entry point.
- No marketing copy in product flows.

---

## 2. User Context

### Primary Proto-Persona

```
Name:           Ji-yeon (aspiring writer)
Role:           University student / early-career professional
Goal:           Turn a story idea into a multi-episode novel draft
Context:        At home on a laptop, evenings/weekends, 1-3 hour sessions
Frustrations:   Blank page paralysis, can't maintain consistency, no prose craft
Tech comfort:   Medium (uses Notion, KakaoTalk, basic web tools — not a developer)
```

### User Environment

- **Device:** Desktop/laptop (primary). Tablet possible but secondary.
- **Mental state:** Creative but anxious about the gap between vision and execution.
- **Time pressure:** Deep work sessions, not quick tasks. Expects to spend 30-60 min per session minimum.
- **Entry point:** Direct navigation (bookmark, URL) or returning to a saved project.

### Journey Map (Current State — Without Narrex)

| Stage | Doing | Thinking | Feeling | Pain |
|-------|-------|----------|---------|------|
| Ideation | Scribbling notes in Notion, KakaoTalk self-messages | "This story could be amazing" | Excited, optimistic | Notes are scattered, no structure |
| Structuring | Trying to outline in docs, maybe a spreadsheet | "How do I organize 40 episodes?" | Overwhelmed | No visual tools, outline feels flat |
| Writing | Attempting prose in Google Docs or Word | "This doesn't sound right" | Frustrated, self-critical | Prose craft gap, blank page paralysis |
| Consistency | Re-reading prior chapters before writing new ones | "Wait, did I say his eyes were brown or black?" | Annoyed, anxious | Manual continuity tracking |
| Abandonment | Stopping after 2-5 chapters | "Maybe I'm not cut out for this" | Defeated | 90%+ of novel attempts die here |

---

## 3. Information Architecture

### Platform

Desktop-first web application. The multi-track timeline and editor require substantial screen real estate. Mobile is out of scope (PRD: explicit non-goal).

### Sitemap

```
[Narrex]
|
+-- Dashboard [Phase 1]
|   +-- Project List
|   +-- New Project
|
+-- Project Workspace [Phase 1]
|   +-- Config Bar (top, collapsible)
|   +-- Timeline Panel (bottom, full-width)
|   +-- Character Map Panel (left sidebar, toggleable)
|   +-- Editor Panel (center/right, context-dependent)
|   +-- Scene Detail Panel (right sidebar or modal)
|   +-- World Map Panel (left sidebar, toggleable) [Phase 3+]
|   +-- AI Chat Panel (right sidebar, toggleable) [Phase 2]
|   +-- Episode Organization Overlay [Phase 2]
|   +-- Revision Panel [Phase 3+]
|
+-- Export [Phase 2]
|
+-- Account Settings
    +-- Profile
    +-- Subscription / Billing [Phase 2]
```

### Navigation Pattern

**Sidebar (collapsible) + Panel-based workspace.** (Jakob's Law: follows creative tool conventions — Figma, Premiere Pro, After Effects.)

---

## 4. User Flows

### Flow 1: New Project Creation [Phase 1]

```
Dashboard
  |
  +-- Click "New Project"
  |
  +-- Project Creation Screen
  |     |
  |     +-- Choose entry method:
  |     |     (a) Free text input (default, prominent)
  |     |     (b) File import (drag-and-drop zone or file picker)
  |     |     (c) Genre template gallery [Phase 2]
  |     |
  |     +-- Enter/paste text OR drop file
  |     |
  |     +-- Click "Structure My Story"
  |           |
  |           +-- [If input too vague] -> Clarifying questions (2-3)
  |           |     |
  |           |     +-- User answers -> Re-submit
  |           |
  |           +-- [If input sufficient] -> AI processing (loading state)
  |                 |
  |                 +-- Workspace opens with auto-generated:
  |                       - Config bar pre-filled
  |                       - Timeline with scenes
  |                       - Character map with relationships
  |                       - Summary toast: "Found X characters, Y events"
```

**Steps to first value:** 3 (create project -> enter idea -> click structure). Meets the <5 step threshold.

### Flow 2: Timeline Editing [Phase 1]

```
Workspace (Timeline panel)
  |
  +-- Add scene: Click [+] between scenes or at track end
  +-- Select scene: Click on scene -> highlights + opens detail/editor
  +-- Move scene: Drag to new start_position (within or across tracks)
  +-- Delete scene: Select + Delete key or context menu
  +-- Branch: Drag from scene's branch handle to another track
  +-- Merge: Drag from multiple scenes to a single downstream scene
  +-- Add track: Click [+ Add Track] below existing tracks
  +-- Remove track: Right-click track label -> "Remove Track"
```

### Flow 3: Character Map Management [Phase 1]

```
Workspace (Left Panel: Character Map)
  |
  +-- View: Force-directed graph with character nodes and relationship lines
  +-- Add character: Click [+ Add Character] -> new node + card opens
  +-- Edit character: Click node -> card expands in left panel
  +-- Create relationship: Drag from node edge to another node -> popover
  +-- Edit relationship: Click on relationship line -> inline popover
  +-- Rearrange: Drag character nodes to adjust layout
```

### Flow 4: AI Draft Generation + Editing [Phase 1]

```
Workspace (Scene selected)
  |
  +-- Review/edit scene detail (right panel)
  +-- Editor (center):
        +-- [No draft] -> "Ready to write this scene" + [Generate Draft]
        +-- [Generate Draft] -> streaming prose (15-30s)
        +-- [Draft exists] -> edit directly or direction-based AI edit
        +-- [Re-generate] -> confirmation -> new draft streams in
  +-- Navigate prev/next scene: arrows in editor header
```

### Flow 5: Episode Organization [Phase 2]

AI suggests episode distribution -> draggable episode dividers on timeline -> per-episode word count + hook type labels.

### Flow 6: Revision [Phase 3+]

Revision Panel -> run checks (character consistency, foreshadowing, setting, style) -> issue cards with suggested fixes -> apply or dismiss.

---

## 5. Page Specifications

Detailed screen specs are in separate files:

| Page / Panel | File |
|-------------|------|
| Dashboard | [ux/dashboard.md](./ux/dashboard.md) |
| Project Creation | [ux/project-creation.md](./ux/project-creation.md) |
| Workspace Layout | [ux/workspace-layout.md](./ux/workspace-layout.md) |
| Config Bar | [ux/config-bar.md](./ux/config-bar.md) |
| Timeline Panel | [ux/timeline-panel.md](./ux/timeline-panel.md) |
| Scene Detail Panel | [ux/scene-detail.md](./ux/scene-detail.md) |
| Editor Panel | [ux/editor-panel.md](./ux/editor-panel.md) |
| Character Map Panel | [ux/character-map.md](./ux/character-map.md) |

### Future Phase Panels (Brief)

- **World Map Panel [Phase 3+]:** Replaces or tabs with Character Map in left panel. Visual map with location nodes linked to timeline scenes.
- **AI Chat Panel [Phase 2]:** Right sidebar toggle. Context-aware chat for story questions, brainstorming, structural advice.
- **Episode Organization [Phase 2]:** Overlay on timeline with draggable episode dividers. Per-episode word count + hook type.
- **Revision Panel [Phase 3+]:** AI-powered checks across full manuscript. Issue cards with suggested fixes.
- **Export [Phase 2]:** Modal dialog. Format selection (DOCX, EPUB, plain text). Episode structure preview.

---

## 6. Interaction Patterns

### 6.1 Drag-and-Drop (Timeline)

| Phase | Visual Feedback | Duration |
|-------|----------------|----------|
| Grab | Scene lifts slightly (scale 1.05), shadow appears | 100ms |
| Drag | Ghost of scene follows cursor. Valid drop zones highlight. Invalid zones dim. | Continuous |
| Over valid target | Target start_position shows insertion indicator. Adjacent scenes shift. | 200ms transition |
| Drop | Scene animates to final start_position. Snackbar: "Scene moved" with [Undo]. | 300ms ease-out |
| Cancel | Press Escape during drag -> scene returns to original start_position. | 200ms |

**Accessibility:** Keyboard alternative: Select scene -> Ctrl+Arrow keys to move. Confirmation via Enter.

### 6.2 Auto-Save

All user edits auto-save. No save button anywhere in the product.

- Debounce: 1 second after last keystroke.
- Status indicator: "All changes saved" / "Saving..." / "Offline — changes will sync when connected".
- Conflict resolution: last-write-wins (single-user product).

### 6.3 Undo/Redo

| Scope | Mechanism | Depth |
|-------|-----------|-------|
| Editor text | Cmd+Z / Cmd+Shift+Z | 50+ actions |
| Timeline operations | Cmd+Z or undo snackbar | 20 actions |
| Scene Detail field edits | Cmd+Z within each field | Standard browser undo |
| Character Map operations | Cmd+Z or undo snackbar | 20 actions |
| AI generation | [Re-generate] regenerates; undo restores pre-generation text | Full draft preserved |

### 6.4 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+Z | Undo |
| Cmd+Shift+Z | Redo |
| Delete / Backspace | Delete selected scene (with confirmation if has content) |
| Enter | Open editor for selected scene |
| Cmd+G | Generate draft for selected scene |
| Escape | Close overlay/panel, deselect scene |
| Arrow keys | Navigate between scenes on timeline |
| Tab | Move focus between panels |
| Cmd+\ | Toggle left panel |
| Cmd+] | Toggle right panel |
| Cmd+Shift+T | Toggle timeline panel |

### 6.5 Context Menus

**Scene:** Edit Details | Generate Draft | Re-generate Draft | Duplicate Scene | Delete Scene
**Track:** Rename Track | Remove Track
**Character node:** Edit Character | Create Relationship | Delete Character
**Relationship line:** Edit Relationship | Delete Relationship

### 6.6 Loading Patterns

| Operation | Expected Wait | Pattern |
|-----------|--------------|---------|
| Page load | <1s | Skeleton screen |
| Auto-structuring | 10-30s | Live streaming preview (see [project-creation.md](./ux/project-creation.md)) |
| AI draft generation | 15-30s | Streaming text output |
| Direction-based edit | 5-10s | Inline streaming replacement |
| Scene operations | <300ms | Optimistic UI |
| Character map layout | <500ms | Force-directed simulation runs visually |
| Auto-save | <1s | Subtle "Saving..." -> "Saved" |

### 6.7 Confirmation Dialogs

Only for destructive + irreversible actions:

- Delete scene with content: "Delete '[Scene Title]'? This will remove the scene and its draft. This cannot be undone." [Cancel] [Delete Scene]
- Delete character: "Delete '[Character Name]'? This character will be removed from all scenes. This cannot be undone." [Cancel] [Delete Character]
- Re-generate draft: "Replace current draft? Your existing draft for '[Scene Title]' will be overwritten." [Cancel] [Replace Draft]

All confirmation dialogs use specific verbs, not "OK"/"Yes".

---

## 7. UX Writing

### 7.1 Voice

- **Clear**: No ambiguity. "Generate Draft" not "Process" or "Create".
- **Concise**: Short labels, no marketing speak inside the product.
- **Supportive**: The user is an aspiring writer who may feel uncertain. Copy should encourage without patronizing.

### 7.2 Tone by Context

| Context | Tone | Example |
|---------|------|---------|
| First visit | Warm, inviting | "Start your first story" |
| Working | Direct, minimal | "Generate Draft", "Save", scene status labels |
| AI generated | Neutral, factual | "Found 4 characters, 12 events." |
| Error | Calm, solution-focused | "We couldn't generate this scene. Check the plot summary and try again." |
| Success | Subtle warmth | "All changes saved" |
| Destructive | Clear, consequence-focused | "Delete 'Chapter 3 Reveal'? This removes the scene and its 2,400-character draft." |

### 7.3 Key Labels and Copy

**Buttons:**
- "Structure My Story" (not "Submit" or "Process")
- "Generate Draft" (not "Create" or "Write")
- "Edit with AI" (not "AI Assist" or "Magic Edit")
- "Apply" (for direction-based edits)
- "Re-generate" (not "Try Again")
- "+ New Project", "+ Add Character", "+ Add Track"

**Status labels:** Empty | AI Draft | Edited | Needs Revision

**Empty states:**
- Dashboard: "No projects yet. Start your first story."
- Timeline: "This is a starting point — drag, add, or delete scenes to match your vision."
- Editor (no scene): "Select a scene on the timeline to start writing."
- Editor (no draft): "Ready to bring this scene to life. Add a plot summary, then generate your first draft."
- Character Map: "No characters yet. Characters are created automatically when you structure your story."

**Error messages:**
- Generation failed: "Couldn't generate this scene. Check your connection and try again." [Retry]
- File import failed: "We couldn't read this file. Supported formats: .md, .txt, Notion .zip export."
- Auto-structuring failed: "We couldn't structure this input. Try adding more detail." [Try Again]

### 7.4 Language

All system UI in Korean (primary market). English labels in this document are for specification clarity.

| English (spec) | Korean (implementation) |
|----------------|----------------------|
| Generate Draft | 초안 생성 |
| Edit with AI | AI로 수정 |
| Structure My Story | 내 이야기 구성하기 |
| New Project | 새 프로젝트 |
| Characters | 등장인물 |
| Timeline | 타임라인 |
| Plot Summary | 줄거리 요약 |
| Empty | 미작성 |
| AI Draft | AI 초안 |
| Edited | 수정 완료 |
| Needs Revision | 재확인 필요 |
| Config / Story Settings | 작품 설정 |
| Genre | 장르 |
| Mood / Tone | 분위기 |
| Apply | 적용 |
| Re-generate | 다시 생성 |
| Delete | 삭제 |
| Cancel | 취소 |

---

## 8. Accessibility

### 8.1 Non-Negotiable Requirements

| Requirement | Implementation |
|-------------|---------------|
| Text contrast | 4.5:1 minimum for body text, 3:1 for large text and UI components |
| Focus indicator | 2px outline with 3:1 contrast on all interactive elements |
| Color not sole indicator | Scene states use fill pattern + icon + text label (not just color) |
| Keyboard navigation | All features reachable via keyboard. Tab order matches visual layout. |
| Screen reader labels | All interactive elements have `aria-label` or visible text label |
| Scalable text | Supports browser zoom to 200% without layout breakage |
| Reduced motion | `prefers-reduced-motion`: replace animations with instant transitions |

### 8.2 Timeline Accessibility

- **Keyboard:** Arrow keys move between scenes. Enter opens scene detail. Tab moves between tracks.
- **Screen reader:** Scenes announced as "Scene [number]: [title], status: [state], track: [track name]".
- **Alternative view:** List view toggle presents timeline as a sequential list grouped by track.

### 8.3 Character Map Accessibility

- **Keyboard:** Tab cycles through nodes. Enter opens character card.
- **Screen reader:** Characters announced with name and relationship summary.
- **Alternative view:** Character list view with relationship tags.

### 8.4 Dark Mode

Full dark mode support. Theme follows system preference with manual override. All color tokens have light and dark variants.

---

## 9. Progressive Disclosure Strategy

### First Project Experience

| Step | What's Visible | What's Hidden | Revealed When |
|------|---------------|---------------|--------------|
| 1. Project creation | Text input, file import | Genre templates [Phase 2] | N/A |
| 2. Workspace first load | Timeline (1 track), Config bar (collapsed), Character map, Editor (empty) | Multi-track, branch/merge, context menus | User interacts with timeline |
| 3. First scene interaction | Scene detail panel auto-opens | Direction-based editing, shortcuts | User generates first draft |
| 4. First generation | [Generate Draft] button prominent | Re-generate, [Edit with AI] | Draft exists |
| 5. First edit | Standard text editing | Direction-based AI editing | User selects text |

### Inline Hints (First Occurrence Only)

| Trigger | Hint | Dismissal |
|---------|------|-----------|
| First workspace load | "This is a starting point — drag, add, or delete scenes to match your vision." | First timeline interaction |
| First scene selection | "Add a plot summary to get the best AI draft." | Plot summary filled |
| First draft generated | "Select any text and click 'Edit with AI' to refine specific passages." | First use of Edit with AI |
| First track added | "Each track represents a parallel storyline. Overlapping ranges happen at the same time." | Dismissed on click or 10s |

Hints appear as subtle banners (not modals). Stored in local preference.

---

## 10. Phase Implementation Summary

### Phase 1 (Core Loop MVP)

**Screens:** Dashboard, Project Creation, Workspace (Config Bar, Timeline, Scene Detail, Editor, Character Map)

**Key flows:** New project -> auto-structuring -> workspace. Timeline editing. Character management. AI generation + direction-based editing. Scene navigation.

**Interaction patterns:** Drag-and-drop, auto-save, undo/redo, streaming AI, keyboard shortcuts, context menus, progressive disclosure.

### Phase 2 (Episode Layer + Polish)

**New:** Episode Organization Overlay, AI Chat Panel, Export Modal, Genre Template Gallery, draft variations, tone sliders, foreshadowing lines, inline autocomplete, manuscript reading mode, onboarding tutorial.

### Phase 3+ (Depth + Delight)

**New:** World Map Panel, Revision Panel, temporal relationship tracking, AI Surprise mode, AI gap detection.
