# Narrex — Phase 1 PRD (Core Loop MVP)

**Status:** Draft
**Author:** zzoo
**Last Updated:** 2026-03-04
**Full PRD:** docs/prd.md
**Product Brief:** docs/product-brief.md

---

## 1. Phase Goal

Prove that an aspiring writer can go from an unstructured story idea to a multi-scene AI-assisted draft using a visual single-track timeline, character map, and scene-level AI generation — and that the resulting drafts are good enough to edit rather than discard.

---

## 2. Scoping Rationale

### Why this scope?

The full product vision includes multi-track timelines, episode organization layers, world maps, revision tools, export, and advanced AI features (variations, tone sliders, AI Surprise). Phase 1 strips all of that to answer one question: **does the core loop work?**

The core loop is: idea in -> visual structure out -> arrange story -> generate scene prose -> edit and refine. If this loop does not produce drafts that users want to keep editing, nothing else matters. Multi-track timelines, episode dividers, and revision tools are force multipliers on a core loop that must first prove viable.

### Why this subset specifically?

1. **Input + auto-structuring (REQ-001, REQ-002, REQ-004) is non-negotiable.** The product's first-moment promise is "bring your idea, we'll structure it." Without this, users face the same blank-page problem they already have.

2. **Multi-track timeline (REQ-009, REQ-010, REQ-011, REQ-012, REQ-013, REQ-014, REQ-015) is the visual structure.** Target genres (regression fantasy, romance-fantasy, martial arts) routinely feature simultaneous storylines — the protagonist training while the antagonist schemes. A multi-track timeline with parallel tracks, merge/branch points, and vertical alignment of simultaneous events is included in Phase 1 because omitting it would make the visual structure feel incomplete for the stories users actually write.

3. **Character relationship map (REQ-024, REQ-025, REQ-026) is essential for context assembly.** AI draft quality depends on character awareness. Without character data in the generation context, output will be generic. The character map also serves as a tangible, visual "look, it understands my story" moment during onboarding.

4. **AI draft generation (REQ-034, REQ-035) is the revenue engine.** This is the feature users will pay for. It must be present in MVP to validate willingness to pay and draft quality.

5. **Basic editor (REQ-042, REQ-043) closes the loop.** Users need to be able to read, edit, and improve AI output. Direction-based edit requests ("more tension," "add dialogue") are included because they are the lowest-effort way for non-writers to improve prose — directly addressing the target user's skill gap.

6. **Config bar (REQ-007, REQ-008) provides global context.** Genre, tone, era, and POV settings dramatically affect AI output quality. Without config, every scene generation would require manual prompt context — defeating the "your structure is your prompt" value proposition.

### What can we learn from this release?

- Is the auto-structuring output good enough for users to start from? (Or do they discard and rebuild manually?)
- Do users engage with the visual timeline, or do they ignore it and go straight to the editor?
- Are AI-generated scene drafts good enough to edit? (Retention rate of generated text after user editing)
- What is the actual per-user AI cost at real usage patterns?
- Do users complete multiple scenes, or do they generate one and leave?

---

## 3. Phase Requirements

### 3.1 Onboarding & Project Setup

| Priority | REQ-ID | Requirement | Phase 1 Detail | Rationale |
|----------|--------|-------------|-----------------|-----------|
| P0 | REQ-001 | User can create a new project by entering free-form text describing their story idea | Accept any length of text input. System should handle inputs ranging from a single sentence to multi-page dumps. If input is too vague to structure (fewer than ~2 meaningful story elements), system asks 2-3 clarifying questions before proceeding. | Primary entry point. Most users will start here. |
| P0 | REQ-002 | User can create a new project by importing a file | Support Notion export (.zip with Markdown), standalone Markdown (.md), and plain text (.txt) files via drag-and-drop or file picker. Parse and extract narrative content, character references, and plot points. | Secondary entry point. Users with existing notes in Notion or docs need this path. |
| P0 | REQ-004 | System auto-structures any input into initial Config, Timeline, and Character Map | From the user's input, generate: (a) Config bar values (genre, theme, era/location, POV, tone) inferred from content; (b) Timeline with ordered event nodes representing key plot points — placing simultaneous events on parallel tracks where applicable; (c) Character Map with character nodes and inferred relationships. All generated elements are editable. System shows a brief summary of what it inferred and invites the user to review and adjust. | The core "magic moment." Without this, the product is just another blank canvas. |

**Acceptance criteria for REQ-004:**
- Given a 200+ word input with identifiable characters and plot points, the system produces at least 5 timeline nodes (across one or more tracks if parallel storylines are detected), 2 characters with at least 1 relationship, and a populated config bar within 30 seconds.
- Given a vague input (e.g., "a love story"), the system asks 2-3 clarifying questions before generating structure.
- All auto-generated elements (nodes, characters, config values) are individually editable after generation.
- User can trigger re-generation of the entire structure from the same input if the first result misses the mark.

### 3.2 Config Bar

| Priority | REQ-ID | Requirement | Phase 1 Detail | Rationale |
|----------|--------|-------------|-----------------|-----------|
| P0 | REQ-007 | User can view and edit global story settings in a collapsible top bar | Settings: genre (free text or dropdown with common Korean web novel genres), theme (free text), era/location (free text), point of view (1st/3rd limited/3rd omniscient), overall mood/tone (free text or tags). Config bar is collapsible to maximize workspace. | Global context that shapes every AI generation. |
| P0 | REQ-008 | Changes to Config settings are reflected in all subsequent AI draft generations | When a user changes any config value, all future AI generations incorporate the updated settings. Already-generated drafts are not retroactively changed, but a visual indicator shows that the config has changed since the draft was generated. | "Your structure is your prompt" — config changes must flow through to AI output without manual prompt editing. |

**Acceptance criteria for REQ-008:**
- After changing genre from "romance" to "thriller," the next AI-generated scene draft reflects thriller conventions (tension, pacing, vocabulary) without the user mentioning the change in any other context.
- Nodes with drafts generated before a config change display a subtle "config changed since generation" indicator.

### 3.3 Timeline & Event Nodes

| Priority | REQ-ID | Requirement | Phase 1 Detail | Rationale |
|----------|--------|-------------|-----------------|-----------|
| P0 | REQ-009 | System displays a timeline with horizontal axis representing time progression | The timeline is a horizontal sequence of event nodes across one or more parallel tracks. Nodes are visually connected to show narrative flow. The timeline supports horizontal scrolling/zooming for stories with many nodes, and vertical expansion for multiple tracks. | Core visual metaphor. Multi-track is included because target genres routinely feature parallel storylines. |
| P0 | REQ-010 | User can add, delete, and reorder event nodes on the timeline via drag-and-drop | Add: click a "+" button between existing nodes or at the end of a track. Delete: right-click or use a delete action on a selected node (with confirmation if the node has generated content). Reorder: drag a node to a new position within the same track or across tracks; adjacent nodes shift to accommodate. | Fundamental timeline manipulation. Without this, the timeline is read-only and not useful as an authoring tool. |
| P0 | REQ-011 | User can add and remove parallel tracks on the timeline | User can create a new track (with an optional label, e.g., character name or storyline name) and delete empty tracks. Each track represents an independent storyline that progresses in parallel. | Parallel storylines are a staple of target genres. Tracks allow users to visually separate simultaneous narrative threads. |
| P0 | REQ-012 | User can create merge points and branch points on the timeline | Branch point: a node on one track splits into nodes on two or more tracks (storylines diverge). Merge point: nodes from multiple tracks converge into a single node (storylines reconverge). Visual indicators distinguish branch/merge points from regular nodes. | Branch and merge points represent the moments where storylines split apart or come together — critical narrative structure for multi-POV stories. |
| P0 | REQ-013 | System vertically aligns simultaneous events across tracks | Nodes at the same narrative time across different tracks are vertically aligned so users can see what is happening simultaneously. Alignment is automatic based on node position but can be manually adjusted. | Without vertical alignment, the multi-track timeline loses its primary benefit — showing what happens at the same time across different storylines. |
| P0 | REQ-014 | User can open a node overlay panel to edit event details | Phase 1 overlay fields: event title (required), involved characters (multi-select from character map), location (free text), plot summary (free text, used as primary context for AI generation), mood/tone tags (optional, override config-level tone for this scene). Deferred fields: episode assignment, episode-end hook type, foreshadowing links, expected word count. | The node overlay is where users shape what the AI generates for each scene. Plot summary is the most critical field — it's the user's creative direction for the scene. |
| P0 | REQ-015 | System displays node visual states | Four states: (a) Empty — no content, no draft generated; (b) AI Draft — AI has generated a draft, user has not edited; (c) Edited — user has modified the AI draft or written original content; (d) Needs Revision — config or character data changed since draft was generated. Visual distinction via color, icon, or fill level. | Users need to see at a glance which scenes are done, which need work, and which may be stale. Essential for managing a multi-scene project. |

**Acceptance criteria for REQ-010:**
- User can add a new node between any two existing nodes with a single interaction (click "+").
- User can drag a node from position 3 to position 7; nodes 4-7 shift left, and the moved node lands at position 7. The operation completes in under 500ms visually.
- User can drag a node from one track to another; the node's track assignment updates and vertical alignment adjusts accordingly.
- Deleting a node with existing content shows a confirmation dialog. Deleting an empty node does not require confirmation.

**Acceptance criteria for REQ-011:**
- User can create a new track with a single interaction. Track label is optional and editable.
- User can delete a track only if it contains no nodes (or confirms deletion of all contained nodes).
- The timeline displays up to 5 parallel tracks without significant layout degradation.

**Acceptance criteria for REQ-012:**
- User can create a branch point by dragging from one node to create a new node on a different track.
- User can create a merge point by connecting nodes from multiple tracks into a single downstream node.
- Branch and merge points are visually distinct from regular sequential connections.

**Acceptance criteria for REQ-013:**
- Nodes at the same narrative time position across different tracks are vertically aligned within 1 grid unit.
- User can manually adjust alignment by dragging a node horizontally without breaking track assignment.

**Acceptance criteria for REQ-014:**
- Opening a node overlay does not navigate away from the timeline — the overlay appears alongside or on top of the timeline.
- Characters listed in the overlay are pulled from the character map. Adding a character in the overlay that does not exist in the character map prompts the user to create a new character entry.
- Plot summary supports multi-line text input with no character limit.

### 3.4 Character Relationship Map

| Priority | REQ-ID | Requirement | Phase 1 Detail | Rationale |
|----------|--------|-------------|-----------------|-----------|
| P0 | REQ-024 | System displays an interactive node graph of characters | Characters displayed as nodes in a force-directed or manually arrangeable graph layout. Nodes show character name and optionally a profile image placeholder. Graph is interactive: nodes can be dragged to rearrange layout. | Visual character management is a core differentiator. The graph makes the story's social structure tangible. |
| P0 | REQ-025 | User can click a character node to view and edit a character card | Character card fields: name (required), personality (free text), appearance (free text), secrets (free text), motivation (free text), profile image (upload or placeholder). All fields are used as AI generation context when the character appears in a scene. | Character depth directly improves AI draft quality. The more the system knows about a character, the more consistent and nuanced the generated prose. |
| P0 | REQ-026 | User can create relationship lines between characters | Relationship lines with: visual type (solid for positive, dashed for negative, arrowed for one-directional), editable text label (e.g., "rivals," "siblings," "former lovers"). User creates relationships by dragging from one character node to another or via a menu. Relationships are included in AI generation context for scenes involving both characters. | Relationships are critical narrative context. A scene between "rivals" reads completely differently from a scene between "allies." |

**Acceptance criteria for REQ-025:**
- Editing a character's personality field and then generating a scene draft involving that character produces output that reflects the updated personality.
- Character card supports at least 500 characters per free-text field.

**Acceptance criteria for REQ-026:**
- User can create a relationship line between two characters in 3 or fewer interactions.
- Relationship label and type (solid/dashed/arrowed) are editable after creation.
- In AI-generated drafts, the relationship context is reflected (e.g., tension between rivals, warmth between allies) without the user explicitly mentioning the relationship in the node's plot summary.

### 3.5 AI Draft Generation

| Priority | REQ-ID | Requirement | Phase 1 Detail | Rationale |
|----------|--------|-------------|-----------------|-----------|
| P0 | REQ-034 | User can select any event node and trigger "Generate AI Draft" | User selects a node on the timeline or opens it in the editor, then presses a "Generate" button. System produces a single prose draft (Phase 1 generates one variation; multiple variations deferred to Phase 2). Output length targets 1,500-3,000 Korean characters per scene. Generation shows a loading state with estimated time. If generation fails, system shows a clear error message with a retry option. | The core value delivery moment. This is where the product converts visual structure into readable prose. |
| P0 | REQ-035 | System auto-assembles the AI prompt from structured context | Phase 1 context assembly includes: (a) Global Config settings (genre, tone, era, POV); (b) Current node's plot summary, characters, location, mood tags; (c) Character cards and relationship data for characters involved in the scene; (d) AI-compressed summaries of preceding nodes (not full text — summaries generated and cached as each node's draft is completed); (e) Next node's title and summary (if it exists) for narrative continuity. Deferred context sources: foreshadowing links, episode position, episode-end hook type. Note: simultaneous events from other tracks ARE included in Phase 1 context assembly (via REQ-013). | "Your structure is your prompt." The auto-assembly is the technical core of the product — it transforms visual editing into prompt engineering without the user knowing. |

**Acceptance criteria for REQ-034:**
- Pressing "Generate" on a node with a plot summary and at least one assigned character produces a prose draft within 30 seconds.
- Pressing "Generate" on a node with no plot summary produces a draft based on the node title, config, and surrounding context — but the system shows a suggestion to add a plot summary for better results.
- Generated prose is in natural Korean appropriate to the configured genre and tone.
- User can re-generate (overwrite the current draft) with a single action and a confirmation dialog.

**Acceptance criteria for REQ-035:**
- A scene involving Character A (described as "cold and calculating" in their character card) who has a "rival" relationship with Character B produces prose that reflects both the personality and the relationship dynamic.
- A scene at position 10 in the timeline references relevant events from earlier nodes (via compressed summaries) without contradicting them.
- Changing a preceding node's draft and re-generating a later node's draft reflects the updated earlier content in the summary context.

### 3.6 Editor

| Priority | REQ-ID | Requirement | Phase 1 Detail | Rationale |
|----------|--------|-------------|-----------------|-----------|
| P0 | REQ-042 | User can edit AI-generated text directly in the editor | A scene-level text editor opens when a user selects a node for editing. Supports standard text editing: typing, selecting, cut/copy/paste, undo/redo. Editor displays the current node's title and shows navigation to previous/next nodes. Word/character count displayed. | Users must be able to modify AI output. The product philosophy is "revise, don't write from scratch" — this requires a functional editor. |
| P0 | REQ-043 | User can make direction-based partial edit requests | User selects a passage of text, then enters a natural-language direction (e.g., "more tension," "expand this dialogue," "make this shorter," "add internal monologue"). System regenerates only the selected passage, preserving the surrounding text. If no text is selected, the direction applies to the entire scene draft. | This is the key interaction that makes AI-assisted editing accessible to non-writers. Instead of knowing how to rewrite prose, users describe what they want changed in plain language. |

**Acceptance criteria for REQ-042:**
- Editor loads the AI-generated draft immediately after generation completes.
- Undo/redo supports at least 50 actions.
- Character count updates in real time as the user types.
- Editor preserves content across sessions (navigating away and returning does not lose edits).

**Acceptance criteria for REQ-043:**
- User selects 2 sentences, types "more dramatic," and receives a regenerated version of only those sentences within 10 seconds. Surrounding text is unchanged.
- Direction-based edit preserves the overall narrative context (does not introduce characters or events not present in the scene).
- User can undo a direction-based edit to restore the previous version.

### 3.7 Observability (Phase 1 Subset)

| Priority | REQ-ID | Requirement | Phase 1 Detail | Rationale |
|----------|--------|-------------|-----------------|-----------|
| P1 | REQ-051 | Product team can monitor key usage and cost metrics | Phase 1 tracking: (a) Project creation funnel (started -> input provided -> structure generated -> first node edited -> first draft generated -> first edit made); (b) AI generation count per user per day/week/month; (c) Per-user AI cost (token usage); (d) Text retention rate (% of AI-generated text retained after user editing); (e) Session duration and frequency; (f) Node completion rate (% of nodes in a project that have edited drafts). | Without analytics, we cannot evaluate Phase 1 success criteria. This is P1 rather than P0 because the product can technically launch without it, but it should ship within the first week. |

---

## 4. What This Phase Explicitly Defers

| REQ-ID | Requirement | Why Deferred |
|--------|-------------|--------------|
| REQ-003 | Genre templates (pre-populated config and starter timeline) | Templates require curated genre-specific content (regression, romance-fantasy, martial arts structures). Auto-structuring from free text is the higher-priority entry point. Templates are a Phase 2 onboarding enhancement once we understand which genres users actually choose. |
| REQ-005 | First-project onboarding tutorial | A guided tutorial requires a stable UI to build against. Phase 1 UI will iterate rapidly. Instead, rely on clear empty states, inline hints, and a simple first-time flow that pushes users to their first generation. Structured onboarding is a Phase 2 polish item. |
| REQ-006 | AI chat panel (user-initiated questions and brainstorming) | Chat panel requires a working project context (Config, Timeline, Character Map) to be useful. Phase 1 focuses on getting the core data structures right. AI chat is a Phase 2 feature once the context it draws from is stable. |
| REQ-016 | Foreshadowing connection lines between nodes | Valuable but not essential for the core loop. Adds visual complexity to the timeline. Deferred to Phase 2 where it pairs with revision tools (REQ-047) that verify foreshadowing payoffs. |
| REQ-017 | AI gap detection (suggests scenes to fill narrative holes) | Requires enough user data to understand what "good" story structure looks like. Also depends on a stable timeline experience. Phase 2+ feature. |
| REQ-018, REQ-019, REQ-020, REQ-021, REQ-022, REQ-023 | Episode organization layer (event-to-episode mapping, dividers, word count estimates, hook types, AI episode-aware pacing) | The entire episode layer is deferred. In Phase 1, nodes map 1:1 to scenes — there is no separate episode concept. This dramatically simplifies the data model and UI. Episode organization is the centerpiece of Phase 2. |
| REQ-027 | Temporal relationship tracking (relationships change over story time) | Adds significant complexity to the character map data model. Phase 1 relationships are static — they represent the "current" state. Temporal tracking is a Phase 3 depth feature. |
| REQ-028 | AI auto-suggests new characters or relationship changes | Requires a working character map and enough generation data to understand user patterns. Phase 2+ feature. |
| REQ-029 | Character data automatically included in AI context (filtered to relevant characters) | Note: the capability described in REQ-029 IS included in Phase 1 via REQ-035's context assembly. REQ-029 as a separate requirement is about automatic relevance filtering. In Phase 1, filtering is based on characters explicitly assigned to the node (REQ-014). |
| REQ-030, REQ-031, REQ-032, REQ-033 | World map (visual map, location nodes, timeline integration, AI location suggestions) | World map is a Phase 3 feature. In Phase 1, location is a free-text field on the node overlay. Visual map adds significant design and engineering scope with lower validation priority than timeline and character map. |
| REQ-036 | Multiple draft variations (2-3 per scene) | Phase 1 generates one draft per generation. Multiple variations add UI complexity (comparison view, mixing interface) and increase AI cost per generation by 2-3x. Deferred to Phase 2 to manage cost and scope. |
| REQ-037 | Tone/style sliders (description density, dialogue ratio, emotional intensity, pacing) | Powerful tuning feature but not essential for core loop validation. Phase 1 relies on config-level tone and node-level mood tags. Sliders are a Phase 2 generation enhancement. |
| REQ-038 | AI Surprise mode | A delight feature that depends on strong baseline generation quality. Premature before validating that standard generation meets quality bar. Phase 3. |
| REQ-039 | Context compression (AI-generated summaries of prior chapters) | Partially included in Phase 1: REQ-035 specifies that preceding node summaries are used as context. The full REQ-039 vision — sophisticated compression that preserves foreshadowing and character arcs over 40+ episodes — requires dedicated engineering and quality validation. Phase 1 uses simpler per-node summaries. |
| REQ-040 | Prompt caching for stable context | Performance and cost optimization. Phase 1 may implement basic caching, but the full prompt caching strategy (identifying stable vs. volatile context segments) is a Phase 2 infrastructure improvement. |
| REQ-041 | Model tiering (different models for different task types) | Phase 1 uses a single model for all generation tasks. Model tiering is a cost optimization that becomes important at scale. Phase 2. |
| REQ-044 | Inline autocomplete suggestions | Writing-assist feature that is secondary to the core scene generation loop. Phase 2+ polish. |
| REQ-045 | Navigation between previous/next nodes from editor | Partially included: basic prev/next navigation is part of the editor (REQ-042 Phase 1 detail). Full REQ-045 scope (seamless reading-mode navigation through the entire manuscript) is Phase 2. |
| REQ-046, REQ-047, REQ-048, REQ-049 | Revision tools (character consistency, foreshadowing verification, contradiction detection, style review) | Revision tools require a substantially complete draft to be useful. Phase 1 focuses on getting users to that draft. Revision is the centerpiece of Phase 3. |
| REQ-050 | Export (DOCX, EPUB, plain text) | Users need a complete draft before export is valuable. Phase 2 feature — ships alongside episode organization so users can export properly structured manuscripts. |

---

## 5. Phase 1 User Journeys

### Journey 1: Idea to First AI Draft (Primary Journey)

This is the journey that validates the core hypothesis. A user who completes this journey has experienced the full Phase 1 value loop.

1. User opens Narrex and creates a new project.
2. User chooses an entry point:
   - **Free text:** Types or pastes a story idea — anything from "a regression fantasy where a failed knight returns to his childhood" to a multi-page dump of character notes and plot ideas.
   - **File import:** Drags a .md or .txt file (or Notion .zip export) into the project creation area.
3. System processes the input:
   - If input contains identifiable characters and plot points -> system generates a Config bar (genre, tone, etc.), a single-track Timeline with event nodes, and a Character Map with relationship lines. A brief summary shows: "I found X characters, Y plot points. Here's your story structure."
   - If input is too vague (e.g., "a love story") -> system asks 2-3 clarifying questions (e.g., "What genre?", "Who is the main character?", "What is the central conflict?") and then generates structure.
4. User sees the workspace: a horizontal multi-track timeline with nodes across the top/center (parallel storylines on separate tracks), a character graph in a side panel, and a config bar (collapsible) at the top. Everything is pre-filled from auto-structuring.
5. User reviews the auto-generated structure. They:
   - Rename a node that doesn't match their intent.
   - Click a character node and edit the personality description to be more specific.
   - Add a new node between two existing ones for a scene the system missed.
   - Delete a node that doesn't fit.
   - Drag a node to reorder the sequence.
   - Add a relationship line between two characters ("rivals").
6. User selects a node they're excited about (e.g., "Protagonist discovers regression ability").
7. Node overlay opens. User reviews the auto-generated plot summary and edits it: "Protagonist wakes up in his 12-year-old body after dying in battle. He's in his childhood bedroom. Disbelief, then slowly realizes this is real. Ends with him clenching his fist — this time will be different."
8. User presses "Generate AI Draft."
9. System shows a loading indicator. Within 30 seconds, the editor panel fills with a prose draft (1,500-3,000 Korean characters).
   - If generation fails -> system shows error with retry option.
10. User reads the draft. It captures the regression moment but the emotional tone is too melodramatic. User selects the second paragraph, types the direction "more restrained, internal monologue, less dramatic," and presses "Apply."
11. System regenerates only the selected passage. The new version is quieter, more internal.
12. User makes a few manual edits — changes a word choice, adds a line of thought.
13. Node status updates from "Empty" to "Edited." User sees the node fill in on the timeline.
14. User selects the next node and repeats steps 7-13.

**Drop-off risks and mitigations:**
- **Step 3 (auto-structuring quality):** If the generated structure misses the user's vision, they may abandon. Mitigation: every element is editable; system invites review; user can re-generate.
- **Step 9 (first draft quality):** If the AI draft is bad enough to discard entirely, the core value proposition fails. Mitigation: include rich context in the prompt (config, character data, plot summary); direction-based editing lets users steer without rewriting.
- **Step 10 (editing skill gap):** User may not know how to improve the draft. Mitigation: direction-based editing (REQ-043) lets users describe intent ("more tension") instead of executing prose craft.

**Phase 1 difference from full vision:** In the full product, step 8 would generate 2-3 variations with tone sliders. In Phase 1, it generates one draft. Users who dislike the output can re-generate or use direction-based edits. Multi-track timeline is included in Phase 1, so users can organize parallel storylines from the start.

### Journey 2: Building the Character Map

1. User opens the Character Map panel from the workspace.
2. User sees auto-generated character nodes with names and basic relationship lines from the initial structuring.
3. User clicks the protagonist node. Character card opens with auto-inferred fields (name, personality, appearance — some may be sparse or marked as inferred).
4. User enriches the character card: adds a detailed personality ("disciplined but haunted by guilt from his previous life"), adds appearance ("tall, lean, scar on left hand from a sword training accident"), adds a secret ("knows the location of a hidden treasure from his future memories"), and a motivation ("protect his family from the disaster he knows is coming").
5. User creates a new character not found in the original input: the protagonist's childhood friend who will become an antagonist later.
6. User drags a relationship line from the protagonist to the new character. Labels it "childhood friends." Sets line type to solid (positive).
7. User returns to the timeline, selects a node involving both characters, and generates an AI draft. The draft naturally incorporates their friendship dynamic and the protagonist's hidden knowledge.

**Phase 1 difference from full vision:** No temporal relationship tracking. The relationship is a single static state. Users cannot show that "childhood friends" becomes "bitter enemies" at a specific timeline point. The AI uses the current relationship state for all scenes.

### Journey 3: Returning to Continue a Project

1. User returns to Narrex the next day.
2. User opens their existing project. The timeline shows their progress: 3 nodes are "Edited" (filled), 2 are "AI Draft" (partially filled), and 8 are "Empty."
3. User picks up where they left off — selects the next empty node after their last edited scene.
4. User writes a plot summary in the node overlay, assigns characters, and generates an AI draft.
5. The draft references events from earlier scenes (via compressed summaries of completed nodes), maintaining narrative continuity.
6. User edits the draft, and the node status updates.

**Drop-off risk:** User forgot what they were doing. Mitigation: node visual states make progress visible at a glance. The timeline serves as a persistent story map.

---

## 6. Phase 1 Success Criteria

### Primary Metrics

| Goal | Metric | Phase 1 Target | Full Product Target | Timeframe |
|------|--------|----------------|---------------------|-----------|
| Users complete the core loop | % of users who create a project, auto-structure, and generate at least 1 AI draft | 40% of new users | N/A (Phase 1 specific) | First 4 weeks |
| AI drafts are worth editing | % of AI-generated text retained after user editing (not deleted/replaced) | 50%+ text retention | 60%+ | 8 weeks post-launch |
| Users build multi-scene drafts | % of users who generate and edit 5+ scene drafts in a single project | 20% of users who complete the core loop | 25% of MAU reach 10+ episodes (full product) | 8 weeks post-launch |
| Editing over generating | Ratio of time spent editing vs. time spent waiting for generation | 1.5:1 edit-to-generate ratio | 2:1 | 8 weeks post-launch |

### Counter-Metrics

| Primary Metric | Counter-Metric | Acceptable Range |
|----------------|----------------|------------------|
| Core loop completion (40%) | Time to first draft generated (should be under 15 minutes from project creation) | If completion rises but time-to-first-draft exceeds 15 min, onboarding needs simplification |
| Text retention (50%+) | Full re-generation rate per scene (users clicking "Generate" again to replace the entire draft) | If retention is high but re-generation is also high, users may be settling for mediocre output rather than finding how to improve it |
| Multi-scene completion (20%) | Average session duration trend (should not decline as users progress through scenes) | If multi-scene completion rises but session duration drops sharply after scene 3-4, the later scenes may have degrading quality |

### Exit Criteria for Phase 1

Phase 1 is considered validated — and the team should proceed to Phase 2 — when:

1. **Core loop completion rate exceeds 30%.** At least 30% of new users who start a project reach their first AI-generated and edited scene. Below 30% indicates a fundamental onboarding or value delivery problem that must be solved before adding features.

2. **Text retention rate exceeds 40%.** Users keep at least 40% of AI-generated text after editing. Below 40% means drafts are being discarded rather than revised — the "revise, don't write" thesis is not holding.

3. **Multi-scene engagement exists.** At least 15% of users who complete the core loop go on to generate and edit 5+ scenes. This signals that the tool is not a novelty — users see ongoing value.

4. **Per-user AI cost is sustainable.** Average monthly AI cost per active user is below $5 (consistent with Basic plan pricing at $12/month with ~40% cost ceiling).

5. **No critical quality blockers.** AI-generated Korean prose is rated as "good enough to revise" by at least 70% of test users in qualitative feedback (structured survey or interview).

If any of the first three criteria are not met after 8 weeks, the team should diagnose and iterate on Phase 1 rather than proceeding to Phase 2.

---

## 7. Phase 1 Assumptions & Risks

### Assumptions

| Assumption | Validation Plan | Impact if Wrong |
|------------|-----------------|-----------------|
| Scene-level Korean prose generation is good enough to edit, not just discard. | Pre-launch: generate 50+ test scenes across 3 genres (regression, romance-fantasy, martial arts) and have 5-10 target users rate them. Post-launch: track text retention rate. | Critical. If wrong, the entire product thesis fails. Mitigation: test multiple model providers, invest in prompt engineering, consider fine-tuning. |
| Users will engage with the visual timeline rather than finding it confusing. | Post-launch: track whether users interact with the timeline (add/move/delete nodes) or ignore it and only use the editor. | High. If timeline is ignored, the differentiator is lost. Mitigation: simplify timeline UI, provide inline guidance, consider a "list view" fallback. |
| Auto-structuring from free text produces useful starting points. | Post-launch: track how many auto-generated elements (nodes, characters) survive user editing vs. how many are deleted and recreated. | High. If users discard and rebuild from scratch, auto-structuring is a false promise. Mitigation: improve structuring prompts, add "structure from scratch" as an explicit path. |
| Simple per-node summaries are sufficient context for AI generation continuity over 10+ scenes. | During development: test generation quality at scene 1, scene 5, scene 10, and scene 15 with summary-based context. Check for contradictions and lost plot threads. | Medium. If summaries lose critical details, later scenes will have quality issues. Mitigation: include more recent nodes as full text, tag critical plot points for preservation. |
| Aspiring writers will try an AI writing tool (awareness and willingness). | Pre-launch: validate messaging and positioning with target audience. Post-launch: track signup-to-project-creation conversion. | Medium. If target users are skeptical of AI writing tools, acquisition will be the bottleneck. Mitigation: position as "story structuring tool with AI assist" rather than "AI writer." |

### Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| AI prose quality in Korean is below the "worth editing" threshold for target genres | Critical | Medium | Pre-launch quality benchmark with target users. Multiple model provider options. Genre-specific prompt engineering. If quality is insufficient at launch, delay launch and iterate on prompting. |
| Multi-track timeline adds onboarding complexity for first-time users | Medium | Low | Provide a sensible default (single track) on project creation; parallel tracks appear only when auto-structuring detects simultaneous events or the user explicitly adds a track. Inline hints explain the track concept on first encounter. |
| Context window limits cause quality degradation for projects with 15+ nodes | High | Medium | Phase 1 projects are likely 10-20 nodes. Implement summary-based context compression from the start. Monitor generation quality by node position. If degradation is detected, invest in compression quality before Phase 2. |
| Users generate one scene and leave — the tool is a novelty, not a workflow | High | Medium | Push toward multi-scene engagement in the UX: after first generation, suggest "Generate the next scene?" Show progress on the timeline. Track generation-to-second-generation conversion as an early warning metric. |
| Per-user AI costs are higher than modeled due to re-generation and direction-based edits | Medium | Low | Monitor per-user token usage from day one. Set internal cost alerts. If costs exceed projections, consider generation limits even for beta users to collect accurate usage data. |
| File import (Notion export) parsing fails on edge cases, creating a bad first impression | Low | Medium | Support a limited set of well-tested file formats (.md, .txt, Notion .zip). Show clear error messages for unsupported formats. Auto-structuring gracefully handles partial parse results. |

---

## 8. Phase 1 Timeline & Milestones

| Milestone | Description |
|-----------|-------------|
| M1: Foundation | Project data model, authentication, basic workspace layout. Auto-structuring pipeline (input -> Config + Timeline + Character Map). |
| M2: Timeline + Character Map | Single-track timeline with node CRUD and drag-and-drop. Character map with node graph, character cards, and relationship lines. Node overlay panel. |
| M3: AI Generation + Editor | AI draft generation with context assembly. Basic text editor with direction-based edit requests. Node state management. |
| M4: Integration + Polish | End-to-end flow testing. Analytics instrumentation (REQ-051). Performance optimization. Bug fixes. |
| M5: Beta Launch | Invite-only launch with 20-50 target users. Collect qualitative feedback. Monitor success metrics. |
| M6: Iteration | Address critical feedback. Iterate on auto-structuring quality, generation quality, and UX friction points. |

Target dates are omitted pending engineering capacity assessment. Estimated total development: 8-12 weeks for a single developer.

---

## 9. Appendix

- Full PRD (complete product vision): docs/prd.md
- Product Brief (strategic context): docs/product-brief.md
- UX Design: docs/ux-design.md
- Database Design: docs/database-design.md
- Design Document: docs/design-doc.md
