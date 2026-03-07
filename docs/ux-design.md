# Narrex — UX Design

**Status:** Draft
**Author:** zzoo
**Last Updated:** 2026-03-05
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

The workspace is a single-page application with togglable panels. No deep navigation hierarchy. Users switch between panels, not pages.

**Reachability:** Every core action is at most 2 clicks from the workspace:
- Generate draft: select scene (1) -> click "Generate" (2)
- Edit character: click character node on map (1) -> edit card (in-place)
- Add timeline scene: click "+" on timeline (1)

### Panel Layout (Desktop, >=1280px)

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

**Mental model:** Video editor. Timeline at the bottom (= video timeline). Editor in the center (= preview monitor). Character Map on the left (= media library). Scene Detail on the right (= inspector/properties). Config Bar at the top (= project settings).

### Panel Behavior

| Panel | Default State | Toggle | Resize |
|-------|--------------|--------|--------|
| Config Bar | Collapsed (shows genre + tone summary) | Click to expand | No |
| Left Panel (Character Map) | Open, 280px wide | Toggle icon in toolbar | Drag edge, min 240px, max 400px |
| Center (Editor) | Shows welcome/overview when no scene selected | Always visible | Fills remaining space |
| Right Panel (Scene Detail) | Hidden until scene selected | Auto-opens on scene select, close button | Drag edge, min 300px, max 500px |
| Timeline | Open, 240px tall | Toggle icon in toolbar | Drag top edge, min 160px, max 50vh |

### Responsive Behavior

| Viewport | Layout Change |
|----------|--------------|
| >= 1280px | Full panel layout as shown above |
| 1024-1279px | Left panel defaults to collapsed (icon-only), expandable as overlay |
| 768-1023px | Left and Right panels become overlay sheets. Timeline reduces to 2 visible tracks. |
| < 768px | Not supported. Show message: "Narrex is designed for desktop. Please use a device with a wider screen." |

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

**Decision points:**
- Entry method: default to free text (most common). File import is secondary. Minimize Hick's Law by not presenting all options equally — free text is visually dominant.
- Clarifying questions: system-initiated, 2-3 max. Presented as a conversational flow, not a form.

### Flow 2: Timeline Editing [Phase 1]

```
Workspace (Timeline panel)
  |
  +-- Add scene: Click [+] between scenes or at track end
  |     -> Scene appears with "Untitled Scene" placeholder
  |     -> Right panel opens with Scene Detail form
  |
  +-- Select scene: Click on scene
  |     -> Scene highlights
  |     -> Right panel shows Scene Detail
  |     -> Center panel shows Editor (if draft exists) or empty state
  |
  +-- Move scene: Drag to new start_position (within track or across tracks)
  |     -> Ghost preview shows destination
  |     -> Adjacent scenes shift to accommodate
  |     -> Drop completes move (optimistic UI)
  |
  +-- Delete scene: Select scene -> press Delete key or context menu
  |     -> [If scene has content] Confirmation dialog: "Delete 'Scene Title'?"
  |     -> [If scene is empty] Delete immediately, show undo snackbar
  |
  +-- Branch: Drag from scene's branch handle to empty space on another track
  |     -> Creates new scene on target track with connection line
  |
  +-- Merge: Drag from multiple scenes to a single downstream scene
  |     -> Connection lines converge to merge point
  |
  +-- Add track: Click [+ Add Track] below existing tracks
  |     -> New empty track appears with label input
  |
  +-- Remove track: Right-click track label -> "Remove Track"
        -> [If track has scenes] Show confirmation
        -> [If track empty] Remove immediately
```

### Flow 3: Character Map Management [Phase 1]

```
Workspace (Left Panel: Character Map)
  |
  +-- View: Force-directed graph with character nodes and relationship lines
  |
  +-- Add character: Click [+ Add Character] button at panel top
  |     -> New node appears in graph
  |     -> Character card opens for editing
  |
  +-- Edit character: Click character node
  |     -> Character card expands/opens as overlay within left panel
  |     -> Edit fields: name, personality, appearance, secrets, motivation, image
  |
  +-- Create relationship: Drag from one character node edge to another
  |     -> Relationship line appears
  |     -> Inline popover: set label + line type (solid/dashed/arrowed)
  |
  +-- Edit relationship: Click on relationship line
  |     -> Inline popover: edit label, change type, delete
  |
  +-- Rearrange: Drag character nodes to adjust layout
```

### Flow 4: AI Draft Generation + Editing [Phase 1]

```
Workspace (Scene selected)
  |
  +-- Scene Detail (Right Panel):
  |     - Review/edit: title, plot summary, characters, location, mood tags
  |
  +-- Editor (Center Panel):
  |     |
  |     +-- [If no draft] Empty state:
  |     |     "Ready to write this scene. Add a plot summary and click Generate."
  |     |     [Generate Draft] button (primary, disabled if no plot summary)
  |     |
  |     +-- Click [Generate Draft]
  |     |     -> Button becomes loading state: "Generating..."
  |     |     -> Prose streams into editor as it's generated (15-30s)
  |     |     -> On complete: scene status -> "AI Draft"
  |     |
  |     +-- [If draft exists] Prose displayed in editor
  |           |
  |           +-- Edit directly: type, select, cut/copy/paste, undo/redo
  |           |     -> Scene status -> "Edited" on first modification
  |           |
  |           +-- Direction-based edit:
  |           |     (1) Select text passage
  |           |     (2) Floating toolbar appears with [Edit with AI] option
  |           |     (3) Text input appears: "How should this change?"
  |           |     (4) Type direction (e.g., "more tension", "add dialogue")
  |           |     (5) Click [Apply]
  |           |     (6) Only selected text regenerates (streaming)
  |           |     (7) Undo available if result is unwanted
  |           |
  |           +-- Re-generate entire draft:
  |                 Click [Re-generate] in toolbar
  |                 -> Confirmation: "Replace current draft?"
  |                 -> New draft streams in
  |
  +-- Navigate to prev/next scene: arrows in Editor header
```

### Flow 5: Episode Organization [Phase 2]

```
Workspace (Timeline panel)
  |
  +-- System prompt: "You have enough events to organize episodes"
  |     -> User clicks [Organize Episodes] or opens Episode view
  |
  +-- AI suggests episode distribution
  |     -> Episode dividers appear on timeline
  |     -> Per-episode word count estimates shown
  |
  +-- User drags episode dividers to adjust grouping
  |     -> Word count estimates update in real-time
  |     -> AI context auto-rebuilds for affected episodes
  |
  +-- Tag episode endings: click episode divider label
        -> Select hook type (twist, crisis, breadcrumb, emotional explosion)
        -> AI uses hook type in subsequent generation
```

### Flow 6: Revision [Phase 3+]

```
Workspace -> Revision Panel (toggle from toolbar)
  |
  +-- Run checks:
  |     [Character Consistency] [Foreshadowing] [Setting] [Style]
  |
  +-- Results displayed as issue cards:
  |     - Issue description
  |     - Affected scenes (clickable -> navigates to scene)
  |     - Suggested fix (expandable)
  |     - [Apply Fix] or [Dismiss]
  |
  +-- Apply fix creates new scene or modifies existing draft
```

---

## 5. Screen Specifications

### 5.1 Dashboard [Phase 1]

**Route:** `/`
**Primary action:** Create a new project
**Entry points:** Direct navigation, post-login redirect

**Layout:**

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

**States:**

| State | Design |
|-------|--------|
| Empty (first visit) | Centered illustration + "No projects yet. Start your first story." + [Create Your First Project] button. No other elements compete for attention. (Von Restorff: single CTA) |
| Loaded | Grid of project cards sorted by last edited. [+ New Project] button top-right and as final ghost card in grid. |
| Loading | Skeleton cards matching card layout, shimmer animation |
| Error | "Couldn't load your projects. Check your connection and try again." + [Retry] |

### 5.2 Project Creation [Phase 1]

**Route:** `/new`
**Primary action:** Submit story idea for auto-structuring
**Entry points:** Dashboard [+ New Project]

**Layout:**

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
|  |  Drop a file here (.md, .txt, or Notion .zip export)  |   |
|  |  or [Browse Files]                                     |   |
|  +- - - - - - - - - - - - - - - - - - - - - - - - - - - +   |
|                                                               |
|                              [Structure My Story]             |
|                                                               |
+---------------------------------------------------------------+
```

**Interaction details:**
- Text area: auto-growing, no character limit, supports paste of large text blocks.
- File drop zone: secondary visual weight (dashed border, muted). Accepts .md, .txt, .zip (Notion export). Shows file name after drop with [x] to remove.
- [Structure My Story] button: primary CTA. Disabled until text area has content or file is uploaded. (Von Restorff: single primary action)
- Genre template gallery: [Phase 2] Would appear as a third option between text and file import.

**Clarifying Questions Sub-state:**

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

**AI Processing Loading State:**

```
+---------------------------------------------------------------+
|                                                               |
|             Structuring your story...                         |
|                                                               |
|             [progress indicator - animated]                   |
|                                                               |
|             Finding characters and relationships              |
|             Organizing plot points into a timeline            |
|             Setting up your story world                       |
|                                                               |
+---------------------------------------------------------------+
```

Progress updates as processing completes each stage (Doherty Threshold: provide context during 10-30s wait). Each line gets a checkmark as completed.

**States:**

| State | Design |
|-------|--------|
| Empty (initial) | Text area with placeholder, file drop zone, disabled CTA |
| Text entered | CTA becomes active (filled primary button) |
| File uploaded | File name shown with remove option, CTA active |
| Clarifying | Question form replaces input area |
| Processing | Full-screen loading with staged progress |
| Error (processing failed) | "We couldn't structure this input. Try adding more detail about your characters and plot." + [Try Again] returns to input state with content preserved |

### 5.3 Workspace — Config Bar [Phase 1]

**Location:** Top of workspace, full width
**Primary action:** Edit global story settings

**Collapsed State (default):**

```
+---------------------------------------------------------------+
| [v] Config: Regression Fantasy | Tense, dark | Medieval | 1st |
+---------------------------------------------------------------+
```

Single line showing key settings as tags. Click [v] expands to full view.

**Expanded State:**

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

**Interaction details:**
- Genre, Theme, Era/Location: free text inputs with dropdown suggestions for common Korean web novel genres.
- Point of View: dropdown (1st person / 3rd person limited / 3rd person omniscient).
- Mood/Tone: tag chips. Click to edit, [+ Add] to add new tag, click [x] on tag to remove.
- Changes auto-save. Scenes with drafts generated before the change display a "config changed" indicator (Zeigarnik: incomplete state visible).

**"Config changed" indicator on scenes:**

Scenes whose draft was generated with different config values show a small warning badge. Hovering the badge shows: "Story settings changed since this draft was generated. Re-generate to apply new settings."

### 5.4 Workspace — Timeline Panel [Phase 1]

**Location:** Bottom of workspace, full width
**Primary action:** Select a scene to view/edit/generate

This is the core visual differentiator. Design must balance power (multi-track, branch/merge) with approachability (non-technical users).

**Layout:**

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

**Scene visual states** (not color-only — uses fill + icon + label):

| State | Visual | Icon | Tooltip |
|-------|--------|------|---------|
| Empty | Hollow rectangular clip, thin border | (none) | "No content yet" |
| AI Draft | Half-filled rectangular clip | Small pen icon | "AI draft — not yet edited" |
| Edited | Solid filled rectangular clip | Checkmark | "Author-edited" |
| Needs Revision | Filled rectangular clip with warning border | Warning triangle | "Settings changed since draft" |

**Scene interaction:**

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

**Track interaction:**

| Action | Trigger | Response |
|--------|---------|----------|
| Add track | Click [+ Add Track] | New track appended at bottom, label input focused |
| Rename track | Double-click track label | Inline text edit |
| Remove track | Right-click label -> "Remove Track" | Confirmation if has scenes |
| Collapse track | Click chevron next to label | Track collapses to single line (saves vertical space) |

**Zoom and scroll:**

- Horizontal scroll: scroll wheel (horizontal) or click-and-drag on empty timeline area.
- Zoom: Ctrl/Cmd + scroll wheel, or zoom controls in toolbar.
- [Fit] button: fits all scenes into visible area.
- Pinch-to-zoom on trackpad.

**Vertical alignment of simultaneous events:**

Scenes whose timeline ranges (start_position + duration) overlap across tracks are vertically aligned. A faint vertical band spans the overlapping region. Hovering an overlapping region highlights all scenes with overlapping ranges.

**Auto-structuring result:**

When a project is first created, the timeline appears pre-populated. An inline hint at the top of the timeline says: "This is a starting point — drag, add, or delete scenes to match your vision." This hint dismisses on first interaction and does not return. (Cognitive Load: reduce extraneous load by showing guidance only when relevant.)

**Connection lines:**

- Within-track flow: sequential order is implicit from clip positioning (start_position). No explicit connection lines needed.
- Branch/merge connections (across tracks): curved bezier lines.
- Foreshadowing connections [Phase 2]: dashed colored line with arrow, distinct from structural connections.

### 5.5 Workspace — Scene Detail Panel [Phase 1]

**Location:** Right side panel (auto-opens on scene selection)
**Primary action:** Define what this scene is about (to shape AI generation)

**Layout:**

```
+-----------------------------------+
| Scene Detail                  [x] |
+-----------------------------------+
|                                   |
| Title                             |
| [Protagonist discovers ability  ] |
|                                   |
| Characters                        |
| [Seo-jun] [Ji-yeon] [+ Add]      |
|                                   |
| Location                          |
| [Childhood bedroom             ]  |
|                                   |
| Mood / Tone (overrides config)    |
| [Tense] [Disbelief] [+ Add]      |
|                                   |
| Plot Summary                      |
| +-------------------------------+ |
| | Protagonist wakes up in his   | |
| | 12-year-old body after dying  | |
| | in battle. He's in his        | |
| | childhood bedroom. Disbelief, | |
| | then slowly realizes this is  | |
| | real. Ends with him clenching | |
| | his fist - this time will be  | |
| | different.                    | |
| +-------------------------------+ |
|                                   |
| Episode [Phase 2]                 |
| Hook Type [Phase 2]               |
| Foreshadowing Links [Phase 2]     |
| Word Count Target [Phase 2]       |
|                                   |
| Status: [Empty / AI Draft /       |
|          Edited / Needs Revision]  |
| Character count: 2,340            |
|                                   |
+-----------------------------------+
```

**Interaction details:**

- Title: single-line text input. Required. Auto-filled from structuring.
- Characters: multi-select chip input. Typing filters from character map. [+ Add] creates a new character (opens character card in left panel).
- Location: free text input with autocomplete from previously used locations.
- Mood/Tone tags: chip input, same pattern as config bar. Optional. Overrides config-level tone for this scene only.
- Plot summary: multi-line text area, no character limit. This is the most critical field — it is the user's creative direction for AI generation. Placeholder: "What happens in this scene? The more detail you provide, the better the AI draft will be."

**Auto-save:** All fields save automatically on change (debounced 1s). No manual save button. Status indicator: "Saved" or "Saving..." in panel footer. (Cognitive Load: remove the decision to save.)

### 5.6 Workspace — Editor Panel [Phase 1]

**Location:** Center panel
**Primary action:** Edit scene prose

**Empty State (no scene selected):**

```
+-----------------------------------------------+
|                                               |
|          Select a scene on the timeline       |
|          to start writing                     |
|                                               |
|  [illustration: minimal timeline with arrow]  |
|                                               |
+-----------------------------------------------+
```

**Empty State (scene selected, no draft):**

```
+-----------------------------------------------+
| <- [Prev Scene Title]  Scene 5  [Next Title] ->|
+-----------------------------------------------+
|                                               |
|                                               |
|     Ready to bring this scene to life.        |
|                                               |
|     Add a plot summary in the detail panel,   |
|     then generate your first draft.           |
|                                               |
|     [Generate Draft]                          |
|                                               |
|                                               |
+-----------------------------------------------+
| 0 characters                                  |
+-----------------------------------------------+
```

[Generate Draft] is disabled with tooltip "Add a plot summary first" if plot summary is empty. Enabled if plot summary exists. (Fitts's Law: large primary button, centered.)

**Draft Exists State:**

```
+-----------------------------------------------+
| <- Prev Scene    Scene 5: Title    Next -> |
| [Generate Draft]  [Re-generate]               |
+-----------------------------------------------+
|                                               |
| [Prose text content...]                       |
|                                               |
| Lorem ipsum dolor sit amet, consectetur       |
| adipiscing elit. Sed do eiusmod tempor        |
| incididunt ut labore et dolore magna aliqua.  |
|                                               |
| [Selected text shows floating toolbar]        |
|   [B] [I] [Edit with AI]                     |
|                                               |
+-----------------------------------------------+
| 2,340 characters | Status: Edited             |
+-----------------------------------------------+
```

**AI Generation loading state:**

```
+-----------------------------------------------+
| <- Prev Scene    Scene 5: Title    Next -> |
+-----------------------------------------------+
|                                               |
| [Prose streams in, character by character,    |
|  similar to ChatGPT output. Cursor blinks     |
|  at the end of the streaming text.]           |
|                                               |
| Generating...  [Stop]                         |
|                                               |
+-----------------------------------------------+
| Generating... ~15s remaining                  |
+-----------------------------------------------+
```

Streaming output reduces perceived wait time (Doherty Threshold). User can read as it generates. [Stop] button cancels generation and keeps whatever was generated so far.

**Direction-based editing interaction:**

1. User selects text in the editor.
2. A floating toolbar appears above the selection: `[B] [I] [Edit with AI]`
3. User clicks [Edit with AI].
4. An inline input expands below the toolbar: "How should this change?" with text input and [Apply] button.
5. User types direction (e.g., "more restrained, internal monologue").
6. User clicks [Apply] or presses Enter.
7. Only the selected text is replaced with streaming AI output. Surrounding text is unchanged.
8. Original text is preserved in undo history. (Undo/Redo: Cmd+Z unlimited stack.)

If no text is selected and user clicks [Edit with AI] from a toolbar menu, the direction applies to the entire scene.

**Editor features (Phase 1):**
- Standard text editing (type, select, cut/copy/paste)
- Undo/redo (Cmd+Z / Cmd+Shift+Z, 50+ action stack)
- Character count (real-time)
- Prev/next scene navigation
- Direction-based partial regeneration
- Re-generate entire draft (with confirmation)

**Deferred editor features:**
- Inline autocomplete [Phase 2]
- Tone/style sliders before generation [Phase 2]
- Multiple draft variations with comparison view [Phase 2]
- Full manuscript reading mode with episode navigation [Phase 2]

### 5.7 Workspace — Character Map Panel [Phase 1]

**Location:** Left sidebar panel
**Primary action:** View and manage story characters and their relationships

**Layout:**

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

**Character node visual:**
- Circle with character initial or profile image thumbnail.
- Name label below.
- Click to select (highlights with ring).
- Drag to reposition in graph.

**Relationship line visual:**
- Solid line: positive relationship (allies, friends, lovers).
- Dashed line: negative relationship (rivals, enemies).
- Arrow: one-directional (e.g., unrequited love, secret enmity).
- Label centered on line.
- Click line to edit relationship.

**Character Card (opens on character node click):**

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

**Empty state (no characters):**

"No characters yet. Characters are created automatically when you structure your story, or you can add them manually."
[+ Add Character]

**Creating a relationship:**
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

**Temporal relationship tracking [Phase 3+]:**

A timeline slider appears at the bottom of the Character Map panel, linked to the main timeline. Sliding shows the state of relationships at different story points. Phase 1 relationships are static (single state).

### 5.8 Workspace — World Map Panel [Phase 3+]

Replaces or tabs with Character Map in the left panel. Shows a visual map (real or fictional) with location nodes. Locations link to timeline scenes. Not designed in Phase 1 — location is a free-text field on Scene Detail.

### 5.9 AI Chat Panel [Phase 2]

Right sidebar toggle (shares space with Scene Detail or opens as a separate tab). Context-aware chat for story questions, brainstorming, structural advice. Reads Config, Timeline, Character Map as context.

### 5.10 Episode Organization [Phase 2]

Overlay on the timeline that adds episode dividers. Dividers are draggable vertical lines that partition scenes into episodes. Each episode section shows word count estimate and hook type label.

### 5.11 Revision Panel [Phase 3+]

Toggle panel that runs AI-powered checks across the full manuscript. Displays issues as cards with links to affected scenes and suggested fixes.

### 5.12 Export [Phase 2]

Modal dialog accessed from workspace toolbar. Format selection (DOCX, EPUB, plain text). Preview of episode structure. [Export] button generates and downloads file.

---

## 6. Interaction Patterns

### 6.1 Drag-and-Drop (Timeline)

**Core interaction for the timeline. Must feel responsive and forgiving.**

| Phase | Visual Feedback | Duration |
|-------|----------------|----------|
| Grab | Scene lifts slightly (scale 1.05), shadow appears | 100ms |
| Drag | Ghost of scene follows cursor. Valid drop zones highlight. Invalid zones dim. | Continuous |
| Over valid target | Target start_position shows insertion indicator (line or gap). Adjacent scenes shift. | 200ms transition |
| Drop | Scene animates to final start_position. Snackbar: "Scene moved" with [Undo]. | 300ms ease-out |
| Cancel | Press Escape during drag -> scene returns to original start_position. | 200ms |

**Accessibility:** Drag-and-drop has a keyboard alternative. Select scene -> use Ctrl+Arrow keys to move start_position. Confirmation via Enter.

### 6.2 Auto-Save

All user edits auto-save. No save button anywhere in the product.

- Debounce: 1 second after last keystroke.
- Status indicator in workspace footer: "All changes saved" (default) / "Saving..." (during save) / "Offline — changes will sync when connected" (no network).
- Conflict resolution: last-write-wins (single-user product, no collaboration in scope).

### 6.3 Undo/Redo

| Scope | Mechanism | Depth |
|-------|-----------|-------|
| Editor text | Cmd+Z / Cmd+Shift+Z | 50+ actions |
| Timeline operations (scene add/move/delete) | Cmd+Z or undo snackbar | 20 actions |
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

Right-click on interactive elements shows context-specific menus.

**Scene context menu:**
- Edit Details
- Generate Draft
- Re-generate Draft (if draft exists)
- Duplicate Scene
- Delete Scene

**Track context menu:**
- Rename Track
- Remove Track (disabled if has scenes; or confirms deletion of all scenes)

**Character node context menu:**
- Edit Character
- Create Relationship
- Delete Character

**Relationship line context menu:**
- Edit Relationship
- Delete Relationship

### 6.6 Loading Patterns

| Operation | Expected Wait | Pattern |
|-----------|--------------|---------|
| Page load | <1s | Skeleton screen |
| Auto-structuring | 10-30s | Staged progress with descriptive steps |
| AI draft generation | 15-30s | Streaming text output (progressive rendering) |
| Direction-based edit | 5-10s | Inline streaming replacement |
| Scene operations (add/move/delete) | <300ms | Optimistic UI, no indicator |
| Character map layout | <500ms | Force-directed simulation runs visually |
| Auto-save | <1s | Subtle "Saving..." -> "Saved" in footer |

### 6.7 Confirmation Dialogs

Only used for destructive + irreversible actions:

- Delete scene with content: "Delete '[Scene Title]'? This will remove the scene and its draft. This cannot be undone."
  [Cancel] [Delete Scene]
- Delete character: "Delete '[Character Name]'? This character will be removed from all scenes. This cannot be undone."
  [Cancel] [Delete Character]
- Re-generate draft: "Replace current draft? Your existing draft for '[Scene Title]' will be overwritten."
  [Cancel] [Replace Draft]

All confirmation dialogs use specific verbs, not "OK"/"Yes". (UX Writing: verb rule.)

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
| AI generated | Neutral, factual | "Found 4 characters, 12 events. Here's your story structure." |
| Error | Calm, solution-focused | "We couldn't generate this scene. Check the plot summary and try again." |
| Success | Subtle warmth | "All changes saved" (not fireworks, not "Great job!") |
| Destructive action | Clear, consequence-focused | "Delete 'Chapter 3 Reveal'? This removes the scene and its 2,400-character draft." |

### 7.3 Key Labels and Copy

**Buttons:**
- "Structure My Story" (not "Submit" or "Process")
- "Generate Draft" (not "Create" or "Write")
- "Edit with AI" (not "AI Assist" or "Magic Edit")
- "Apply" (for direction-based edits)
- "Re-generate" (not "Try Again" — implies replacement)
- "+ New Project" (not "Create")
- "+ Add Character" (not "New")
- "+ Add Track" (not "Create Track")

**Status labels:**
- "Empty" (not "Unwritten" — sounds judgmental)
- "AI Draft" (not "Generated" — too technical)
- "Edited" (not "Complete" — writing is never "complete")
- "Needs Revision" (not "Stale" or "Outdated")

**Empty states:**
- Dashboard: "No projects yet. Start your first story."
- Timeline (first project): "This is a starting point — drag, add, or delete scenes to match your vision."
- Editor (no scene selected): "Select a scene on the timeline to start writing."
- Editor (scene selected, no draft): "Ready to bring this scene to life. Add a plot summary, then generate your first draft."
- Character Map (empty): "No characters yet. Characters are created automatically when you structure your story."

**Error messages:**
- Generation failed: "Couldn't generate this scene. Check your connection and try again." [Retry]
- File import failed: "We couldn't read this file. Supported formats: .md, .txt, Notion .zip export."
- Auto-structuring failed: "We couldn't structure this input. Try adding more detail about your characters and plot." [Try Again]

### 7.4 Language

All system UI is in Korean (primary market). English labels in this document are for specification clarity. Final implementation uses Korean equivalents:

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

The visual timeline presents unique accessibility challenges:

- **Keyboard navigation:** Arrow keys move between scenes. Enter opens scene detail. Tab moves between tracks.
- **Screen reader:** Scenes announced as "Scene [number]: [title], status: [state], track: [track name]". Relationships announced as connections.
- **Alternative view:** A list view toggle (accessible from toolbar) presents the timeline as a sequential list of scenes grouped by track. This serves both accessibility and users who find the visual timeline overwhelming. (PRD Risk: "Visual timeline is too complex for target users" — list view is the mitigation.)

### 8.3 Character Map Accessibility

- **Keyboard navigation:** Tab cycles through character nodes. Enter opens character card. Shift+Tab reverses.
- **Screen reader:** Characters announced with name and relationship summary ("Seo-jun, 3 relationships: ally of Ji-yeon, rival of Min, sibling of Ha-na").
- **Alternative view:** A character list view shows characters as cards in a vertical list with relationship tags. Available via toggle in panel header.

### 8.4 Dark Mode

Full dark mode support. Theme follows system preference (`prefers-color-scheme`) with manual override in account settings. All color tokens have light and dark variants. Scene state colors adjusted for dark backgrounds.

---

## 9. Progressive Disclosure Strategy

The multi-track timeline with branch/merge points, character maps, and AI generation is a lot for a first-time user. Progressive disclosure prevents overwhelm without hiding power.

### First Project Experience

| Step | What's Visible | What's Hidden | Revealed When |
|------|---------------|---------------|--------------|
| 1. Project creation | Text input, file import | Genre templates [Phase 2] | N/A |
| 2. Workspace first load | Timeline (may start with 1 track), Config bar (collapsed), Character map (populated), Editor (empty state) | Multi-track controls, branch/merge, context menus | User interacts with timeline |
| 3. First scene interaction | Scene detail panel opens automatically | Direction-based editing, keyboard shortcuts | User generates first draft |
| 4. First generation | [Generate Draft] button prominent in editor | Re-generate, [Edit with AI] on selection | Draft exists in editor |
| 5. First edit | Standard text editing | Direction-based AI editing | User selects text (floating toolbar appears) |

### Inline Hints (First Occurrence Only)

| Trigger | Hint | Dismissal |
|---------|------|-----------|
| First workspace load | "This is a starting point — drag, add, or delete scenes to match your vision." (above timeline) | First timeline interaction |
| First scene selection | "Add a plot summary to get the best AI draft." (in scene detail if plot summary is empty) | Plot summary is filled |
| First draft generated | "Select any text and click 'Edit with AI' to refine specific passages." (below editor toolbar) | First use of Edit with AI |
| First track added | "Each track represents a parallel storyline. Scenes with overlapping timeline ranges happen at the same time." (above new track) | Dismissed on click or after 10 seconds |

Hints appear as subtle banners (not modals, not blocking). They do not reappear after dismissal. Stored in local preference.

---

## 10. Phase Implementation Summary

### Phase 1 (Core Loop MVP)

**Screens:**
- Dashboard (project list + empty state)
- Project Creation (free text input, file import, clarifying questions, processing)
- Workspace: Config Bar (collapsed/expanded)
- Workspace: Timeline Panel (multi-track, scenes, branch/merge, zoom/scroll)
- Workspace: Scene Detail Panel (title, characters, location, mood, plot summary)
- Workspace: Editor Panel (prose editing, AI generation, direction-based edits)
- Workspace: Character Map Panel (force-directed graph, character cards, relationship lines)

**Key flows:**
- New project: idea input -> auto-structuring -> workspace
- Timeline editing: add/move/delete/branch/merge scenes
- Character management: add/edit characters, create/edit relationships
- AI generation: select scene -> fill details -> generate -> edit -> direction-based refine
- Scene navigation: prev/next in editor, click on timeline

**Interaction patterns:**
- Drag-and-drop (timeline scenes)
- Auto-save (all edits)
- Undo/redo (editor + timeline)
- Streaming AI output (generation + direction edits)
- Keyboard shortcuts
- Context menus
- Progressive disclosure via inline hints

### Phase 2 (Episode Layer + Polish)

**New screens:**
- Episode Organization Overlay on timeline (draggable dividers, word count estimates, hook type labels)
- AI Chat Panel (right sidebar, context-aware)
- Export Modal (format selection, episode structure preview)
- Genre Template Gallery (in project creation flow)

**Flow changes:**
- Project creation adds genre template option
- Timeline shows episode dividers and per-episode word count
- Generation produces 2-3 draft variations with comparison view
- Tone/style sliders appear before generation
- Foreshadowing connection lines between scenes
- Editor gains inline autocomplete suggestions
- Editor gains full manuscript reading mode with episode navigation
- Onboarding tutorial (step-by-step first project guide)

**New interaction patterns:**
- Episode divider dragging
- Draft variation comparison (side-by-side or tabbed)
- Tone slider adjustment
- Foreshadowing line creation (similar to relationship lines)

### Phase 3+ (Depth + Delight)

**New screens:**
- World Map Panel (left sidebar tab, visual map with location pins)
- Revision Panel (check results as issue cards with suggested fixes)

**New flows:**
- World map: add locations, link to timeline scenes, AI location suggestions
- Temporal relationship tracking: slider on character map shows relationship state at story points
- Revision: run checks -> review issues -> apply fixes -> re-generate affected scenes
- AI Surprise mode: generates unexpected but consistent narrative direction
- AI gap detection: suggests scenes to fill narrative holes

**New interaction patterns:**
- Map interaction (zoom, pan, place pins)
- Temporal slider on character map
- Revision issue cards with inline fix application
