# Narrex — PRD

**Status:** Draft
**Author:** zzoo
**Last Updated:** 2026-03-12
**Stakeholders:** zzoo (founder, product, engineering)
**Product Brief:** docs/product-brief.md

---

## 1. Problem / Opportunity

### The Problem

Aspiring novelists, hobbyist writers, and beginner web novel serializers in Korea have stories they want to tell but cannot turn ideas into finished manuscripts. The bottleneck is not creativity — it is the labor of structuring dozens of interconnected events, maintaining character and plot consistency across 40+ episodes, and producing 3,000-5,000 characters of prose per episode.

Users arrive with ideas at wildly different levels of readiness: some have 10-page Notion documents with character bios and plot outlines; others have a single sentence or a vague mental image. Regardless of starting point, they all face the same wall: translating narrative structure into actual written scenes.

The fundamental mismatch in existing tools is the unit of work. Novelists think in scenes and events ("How should this confrontation play out given what happened three chapters ago?"), not in sentences ("What's the next word?"). Current AI writing tools operate at either extreme — sentence-level autocomplete (Sudowrite, TypeTak) that doesn't address structural thinking, or fully automated generation (단편.ai, Squibler) that removes author control entirely. Neither approach produces work that writers feel ownership over.

The result: most aspiring writers abandon their projects. They outline in docs, attempt a few chapters, lose consistency, and stop.

### Why Now

Three converging factors make this the right moment:

1. **Model quality inflection.** Scene-level prose generation in Korean is now viable with frontier-class models. The output is good enough to revise rather than discard — a critical threshold for an "edit, don't write" workflow.
2. **Cost structure viability.** Prompt caching, context compression (AI summaries instead of full prior text), and model tiering (lightweight for inline, mid-tier for scenes, frontier for structure) bring per-scene costs to ~$0.03-0.06. A complete 40-episode novel costs $3.60-9.60 in AI generation — sustainable at $12-25/month subscription pricing. A provider-agnostic LLM gateway enables switching providers to optimize cost without code changes.
3. **Competitive vacuum.** No tool — Korean or international — combines visual story structure with AI drafting. International tools (Sudowrite, Novelcrafter, NovelAI) are English-only and lack visual timelines. Korean tools (단편.ai, 이음AI, TypeTak, AIWC) are either fully automated generators, character-only management, or weak writing assistants. The intersection of visual structure + scene-level AI + Korean web novel specialization is unoccupied.

### Evidence Summary

- User insight (qualitative): Writers describe their bottleneck as "How to develop this scene?" not "What's the next sentence?" — the structural gap is the primary pain point.
- Competitive analysis: 8 tools reviewed (4 international, 4 Korean). Zero offer visual timeline + AI scene generation. Closest international competitor (Novelcrafter) has codex/worldbuilding but no timeline or AI generation. Closest Korean competitor (이음AI) has character management but no visual structure or timeline.
- Market context: Korean web novel market continues rapid growth. Platforms (Kakao Page, Naver Series) have expanding demand for content, creating pull for tools that help more people produce publishable work.
- Cost modeling: Per-scene generation cost validated at $0.03-0.06 with prompt caching. 40-episode novel at ~120-160 scenes = $3.60-9.60 total generation cost per novel.

---

## 2. Target Users & Use Cases

### Primary Persona: The Aspiring Writer (Ji-yeon)

University student or early-career professional in Korea. Has been imagining a regression-fantasy story for months — the characters are vivid in her head, she has notes scattered across Notion and KakaoTalk messages to herself. She has never written a novel. She tried ChatGPT a few times, got inconsistent output, and couldn't figure out how to keep the AI aligned with her vision across multiple chapters. She knows what she wants the story to feel like but doesn't know how to structure 40 episodes or write compelling scene-level prose.

**Pain points:**
- Has ideas but no framework for organizing them into a novel structure
- Does not know prose craft — describing scenes, writing dialogue, pacing episodes
- Loses motivation when facing the blank page after the initial excitement of planning

**JTBD:** "When I have a story idea that I'm excited about, I want to turn it into a structured, multi-episode novel without needing to master the craft of prose writing, so I can finally see my story exist as a real, readable work."

### Secondary Persona: The Struggling Serializer (Min-ho)

Published 8 episodes of a martial arts web novel on Novelpia. Readers liked the premise but noted inconsistencies — a character's eye color changed, a subplot was introduced and forgotten, pacing dragged in episodes 5-7. He writes 2-3 hours per night after work and can barely produce one episode per week. He knows the story he wants to tell but can't maintain quality and consistency at the pace readers expect.

**Pain points:**
- Cannot maintain character and plot consistency across a growing number of episodes
- Writing speed is too slow for the serialization pace readers expect (2-3 episodes/week)
- Spends more time re-reading past chapters for continuity than writing new ones

**JTBD:** "When I'm writing my next episode, I want the tool to remember everything that happened before and generate a draft that's consistent with my established story, so I can focus on creative decisions instead of continuity management."

### Tertiary Persona: The Content Creator (Su-bin)

YouTube content creator who wants to create narrative content (audio drama scripts, TRPG campaign modules, interactive fiction). Needs structured storylines but not necessarily traditional novel format. Values speed and visual organization over prose polish.

**JTBD:** "When I need a structured story for my content, I want to rapidly build a narrative framework with characters and plot points, so I can adapt it to my specific medium without starting from scratch."

### Top Use Cases

1. **Idea to structure (highest priority):** User enters with unstructured ideas (free text, file import, or genre template selection) and gets an organized Config + Timeline + Character Map that they can visually edit and refine.

2. **Scene-by-scene drafting:** User selects a scene on the timeline, presses "Generate AI Draft," and receives 2-3 prose variations that are contextually aware of the full narrative (prior events, character states, foreshadowing, episode position).

3. **Episode organization:** User maps timeline scenes to episodes, adjusts episode boundaries by dragging dividers, manages per-episode word count targets, and sets episode-end hooks (cliffhanger types).

4. **Character and world management:** User maintains a visual character relationship map and world map that evolve with the story. Changes to characters/relationships are automatically reflected in AI generation context.

5. **Revision and consistency:** After completing a draft, user runs AI-powered reviews for character consistency, foreshadowing recovery, setting contradictions, and tone/style uniformity.

---

## 3. Proposed Solution

### Elevator Pitch

Narrex is a visual novel editor where your story is a timeline of scenes, not a blank page. Set up your characters, world, and plot points visually — then generate AI prose scene by scene. The visual structure you build is the AI prompt: no prompt engineering required, just arrange your story and write.

### Core Value Propositions

1. **"Revise, don't write from scratch."** AI generates scene-level drafts (2-3 variations with adjustable tone) from the full narrative context. The author's job shifts from producing prose to directing and refining it — dramatically lowering the barrier to completing a novel. (Solves: the aspiring writer's inability to produce prose)

2. **"Your structure is your prompt."** The visual timeline, character map, and config bar are simultaneously the authoring interface and the AI prompt engine. Editing a character's relationship, moving a scene on the timeline, or dragging an episode divider automatically changes what the AI generates. No prompt writing, no context management. (Solves: loss of narrative consistency across chapters)

3. **"From idea to structure in minutes."** Any starting point — a text dump, a file import, or a genre template — gets auto-structured into a visual timeline with characters and plot points. The hardest part of novel writing (going from "I have an idea" to "I have a plan") happens in the first session. (Solves: the blank-page paralysis that kills most novel attempts)

### Mental Model

Think of Narrex as a video editor for novels. A video editor has a multi-track timeline (video, audio, effects), a preview window, and a media library. Narrex has a multi-track timeline (plot tracks per character/faction/subplot), an editor window (prose preview and editing), and a media library (character map, world map, config). Just as video editors let you arrange clips and the software handles rendering, Narrex lets you arrange story events and the AI handles prose generation.

The critical architectural concept: **events and episodes are separate layers.** Scenes on the timeline represent what happens in the story. Episodes represent how the story is packaged for readers. These are not always 1:1:
- Multiple small events can be grouped into one episode (commute + conversation + clue discovery = Episode 1)
- One large event can span multiple episodes (final battle = Episodes 38-39)

Episode dividers on the timeline can be dragged to re-partition chapters. The AI prompt auto-rebuilds to reflect the new structure.

---

## 4. Goals & Success Metrics

| Goal | Metric | Counter-metric | Target | Timeframe |
|------|--------|----------------|--------|-----------|
| Users complete novels | % of active users who reach 10+ episodes drafted | Time spent per episode (should not increase as episode count grows) | 25% of MAU reach 10+ episodes | 6 months post-launch |
| AI drafts are useful | % of AI-generated text retained after user editing | Number of full re-generations per scene (low = drafts are useful) | 60%+ text retention rate | 3 months post-launch |
| Free-to-paid conversion | Free users converting to Basic or Pro | Churn rate of paid users (conversion should not come from misleading free tier) | 8% free-to-paid conversion | 6 months post-launch |
| Editing over generating | Ratio of time spent editing vs. generating | Total session duration (engagement should increase, not just shift) | 2:1 edit-to-generate time ratio | 3 months post-launch |

---

## 5. Functional Requirements

### 5.1 Onboarding & Project Setup

```
REQ-001  User can create a new project by entering free-form text describing
         their story idea (any length, any level of organization).

REQ-002  User can create a new project by importing a file (Notion export,
         Markdown, plain text) via drag-and-drop or file picker.

REQ-003  User can create a new project by selecting a genre template
         (regression, romance-fantasy, martial arts, modern thriller, etc.)
         that pre-populates Config and suggests a starter timeline structure.

REQ-004  System auto-structures any input (free text, imported file, or
         template) into an initial Config (genre, theme, era/location, POV,
         tone), Timeline (scenes), and Character Map (characters with
         relationships).

REQ-005  System provides a first-project onboarding tutorial that
         progressively introduces features (Config, Timeline, Character Map,
         Editor) without requiring the user to read documentation.

REQ-006  System provides an AI chat panel where the user can ask questions
         about their story, request structural advice, brainstorm ideas,
         or get writing guidance at any time (e.g., "How should I develop
         this character's arc?", "What conflict would work here?", "Help
         me connect these two plot points"). The chat is context-aware —
         it has access to the current project's Config, Timeline, and
         Character Map.

REQ-063  System auto-creates a sample project when a new user signs up
         (first-time Google OAuth). The sample project contains pre-crafted
         seed data (not AI-generated per user) inserted server-side as a
         single atomic DB transaction during signup. Content uses the
         regression-fantasy genre — chosen because it is among the most
         popular Korean web novel genres, its inherent dual-timeline
         structure naturally showcases the NLE multi-track UI, and it
         matches the primary persona (Ji-yeon). Composition:
         - 2 tracks (protagonist + antagonist faction)
         - 8-10 scenes: protagonist track 6-7, antagonist track 2-3,
           including 1 merge point. States: 2 "Edited", 1 "AI Draft",
           rest "Empty" — showing users "pick up from here."
         - 4-5 characters (protagonist, childhood friend turned rival,
           mentor, heroine, antagonist leader) with 5-6 relationship
           lines covering alliance, rivalry, mentor-student, friendship
           (solid, dashed, and arrowed types all represented).
         - Fully populated Config: genre=regression fantasy, mood=tense
           coming-of-age, era=medieval fantasy, POV=3rd person limited,
           tone=restrained narrative.
         - 2-3 scenes with pre-written draft content demonstrating AI
           prose quality. This content does not count against the user's
           AI quota.
         The project appears on the dashboard with an "Example" badge,
         is fully editable and deletable like a normal project. Once
         deleted, it is not re-created. Purpose: achieve Time-to-Value
         of 0 seconds — new users explore the real workspace with real
         data before committing to their own story idea, serving as a
         substitute for REQ-005 (onboarding tutorial, deferred to Phase 2).

REQ-064  Unauthenticated visitors can access the app dashboard without
         being redirected to the login page. The dashboard displays a
         client-side in-memory demo project in the project list (same
         content as REQ-063 sample project, hardcoded as a fixture).

REQ-065  The demo project card on the guest dashboard displays a "Try it"
         badge to indicate it is not a real project.

REQ-066  The guest dashboard shows a [+ New Project] button. When a guest
         clicks it, the system displays a login prompt modal (REQ-071)
         instead of entering the project creation flow.

REQ-067  The guest dashboard always shows a login/signup entry point
         (e.g., header button) so guests can authenticate at any time.
```

### 5.2 Config (Global Story Settings)

```
REQ-007  User can view and edit global story settings in a collapsible top
         bar: genre, theme, era/location, point of view, and overall
         mood/tone.

REQ-008  Changes to Config settings are reflected in all subsequent AI
         draft generations without manual prompt editing.
```

### 5.3 Timeline & Scenes

```
REQ-009  System displays a multi-track timeline with horizontal axis
         representing time progression and vertical axis representing
         simultaneous tracks (per character, faction, or subplot).

REQ-010  User can add, delete, and reorder scenes on the timeline via
         drag-and-drop.

REQ-011  User can add and remove tracks on the timeline (e.g., add a track
         for a new character's parallel storyline).

REQ-012  User can create merge points and branch points on the timeline
         where tracks converge or diverge.

REQ-013  System supports vertical alignment of scenes across tracks to
         represent simultaneous events, with a vertical time cursor for
         reference.

REQ-014  User can open a scene detail panel to edit: event title, episode
         assignment, involved characters, location, plot summary, mood/tone
         tags, episode-end hook type, foreshadowing links to other scenes,
         and expected word count.

REQ-015  System displays scene visual states: empty (no content in
         scene.content), ai_draft (content originated from AI generation,
         user has not yet edited), edited (user has modified the content),
         and needs_revision (config or character data changed since content
         was last generated/edited — prior changes may affect consistency).

REQ-016  User can create foreshadowing connection lines between scenes to
         indicate narrative links (setup/payoff relationships).

REQ-017  AI detects structural gaps in the timeline and suggests additional
         scenes or events to fill narrative holes.
```

### 5.4 Episode Organization

```
REQ-018  User can map timeline scenes to episodes, with support for
         many-to-one (multiple scenes per episode) and one-to-many (one scene
         spanning multiple episodes) relationships.

REQ-019  AI auto-suggests episode distribution based on scene placement,
         event scale, and target word count per episode.

REQ-020  User can drag episode dividers on the timeline to re-partition
         chapters, with AI prompt context auto-rebuilding to reflect the
         new structure.

REQ-021  System estimates and displays per-episode word count based on
         assigned scenes and target range (configurable, default
         3,000-5,000 characters for web novels).

REQ-022  System automatically classifies each episode ending's hook type
         (twist, crisis, breadcrumb, emotional explosion, etc.) after
         generation and displays it as a read-only label.

REQ-023  AI uses episode-scene links to determine narrative position context
         (e.g., "Episode 7 of 40, entering mid-section") and adjusts
         pacing and tone accordingly.
```

### 5.5 Character Relationship Map

```
REQ-024  System displays an interactive node graph of characters with
         clickable character nodes. Layout uses a force-directed graph
         algorithm (characters with more relationships gravitate to the
         center). Users can drag nodes to adjust positions manually.

REQ-025  User can click a character node to view and edit a character card:
         name, personality, appearance, secrets, motivation, and profile
         image.

REQ-026  User can create relationship lines between characters with visual
         distinction: solid (positive), dashed (negative), arrowed
         (one-directional), with editable relationship labels.

REQ-027  System supports temporal relationship tracking: a slider or
         timeline-linked control shows the state of relationships at
         different points in the story.

REQ-028  AI auto-suggests new characters or relationship changes based on
         manuscript content and story needs.

REQ-029  Character data and relationship states are automatically included
         in AI draft generation context, filtered to characters relevant to
         the current scene.
```

### 5.6 World Map

```
REQ-030  System displays a visual world map that adapts to genre: real
         map-based (pins on actual locations) for modern/thriller settings,
         custom or AI-generated fictional maps for fantasy/martial arts
         settings.

REQ-031  User can place location nodes on the world map and define
         movement paths between locations.

REQ-032  World map integrates with the timeline so location data is
         available per scene.

REQ-033  AI suggests new locations based on story events and can auto-add
         them to the map.
```

### 5.7 AI Draft Generation

```
REQ-034  User can select any scene and press "Generate AI Draft" to
         produce prose for that scene.

REQ-035  System auto-assembles the AI prompt from: global Config settings,
         narrative position (from episode-scene links), relevant characters
         and their current relationship states, location (from world map),
         prior episode flow (AI-compressed summaries from scene-episode
         links), foreshadowing info (from scene connection lines),
         simultaneous events (from other tracks at the same timeline
         point), current episode's assigned scenes, next episode preview,
         and episode-end hook type.

REQ-036  System generates 2-3 draft variations simultaneously with
         different focuses (e.g., internal monologue focus, dialogue focus,
         witness perspective focus). User can pick one or mix elements from
         multiple versions.

REQ-037  User can adjust tone/style via sliders before or after generation:
         description density (concise to rich), dialogue ratio (low to
         high), emotional intensity (calm to intense), and pacing (fast to
         slow).

REQ-038  System provides an "AI Surprise" mode that generates an unexpected
         but framework-consistent narrative direction for the current scene.

REQ-039  System uses context compression (AI-generated summaries of prior
         chapters rather than full text) to manage context window limits
         while preserving narrative fidelity.

REQ-040  System uses prompt caching for stable context (Config, prior
         summaries) to reduce cost and latency on repeated generations.

REQ-041  System applies model tiering via a provider-agnostic LLM gateway:
         lightweight models for inline suggestions, mid-tier models for
         scene generation, and frontier models for structure planning and
         revision analysis. The gateway abstracts multiple providers
         (OpenAI, Anthropic, Google, etc.) behind a unified interface,
         enabling model switching without code changes. Local development
         uses Ollama for cost-free iteration.
```

### 5.8 Content Model (Manuscript vs Drafts)

```
REQ-052  System separates manuscript content from AI drafts:
         - scene.content: the user's actual manuscript text, auto-saved
           from the editor. This is the single source of truth for what
           the user has written.
         - drafts[]: AI-generated draft history (append-only log). Each
           draft records version, source, model, token counts, and cost.
         The editor always reads from and writes to scene.content.
         AI drafts are reference material stored separately.

REQ-053  When AI generates a draft for a scene with no existing content
         (scene.content is empty), the generated text is automatically
         applied to scene.content. No separate "apply" step required.

REQ-054  When AI generates a draft for a scene with existing content
         (scene.content is non-empty), the system shows a confirmation
         before replacing. The previous content is preserved via undo.
         (Phase 2: side-by-side comparison view, selective apply.)

REQ-055  User can browse AI draft history for a scene and apply any
         previous draft version to scene.content. (Phase 2)
```

### 5.9 Editor

```
REQ-042  User can edit scene content (scene.content) directly in a
         scene-level editor with standard text editing capabilities.
         All edits are auto-saved.

REQ-043  User can make direction-based partial edit requests on selected
         text (e.g., "more tension", "more dialogue", "make this scene
         shorter") without regenerating the entire scene.

REQ-044  User can write freely in the editor with optional inline
         autocomplete suggestions.

REQ-045  User can navigate between previous and next scenes directly
         from the editor.
```

### 5.10 Revision & Quality Checks

```
REQ-046  System can perform a character consistency check across all
         episodes (appearance, personality, speech patterns).

REQ-047  System can verify foreshadowing recovery: checks that setup scenes
         have corresponding payoff scenes and flags unresolved threads.

REQ-048  System can detect setting contradictions (location details,
         timeline inconsistencies, world-rule violations).

REQ-049  System can review style and tone consistency across episodes and
         flag deviations from the established voice.
```

### 5.11 Export

```
REQ-050  User can export the full manuscript in standard formats (DOCX,
         EPUB, plain text) with episode structure preserved.
```

### 5.12 Observability & Analytics

```
REQ-051  Product team can monitor: user acquisition funnel, project
         creation rate, AI generation frequency per user, edit-to-generate
         time ratio, episode completion rate, free-to-paid conversion,
         per-user AI cost, and guest browsing metrics (guest dashboard
         visits, guest workspace entry rate, login modal trigger counts
         by type, login modal-to-signup conversion rate, guest average
         session duration, guest interaction frequency by type).

REQ-075  Product team can monitor the following guest-specific conversion
         funnel metrics:
         - Guest dashboard visit count
         - Guest workspace entry rate (dashboard -> workspace)
         - Guest interaction frequency by type (scene click, character
           click, editor open, config change)
         - Login modal exposure count by trigger (AI generation, AI edit,
           new project)
         - Login modal-to-signup completion rate
         - Guest average session duration
```

### 5.13 Guest Browsing Mode

```
REQ-068  Guests can click the demo project card to enter the workspace.
         All workspace panels are fully interactive: timeline, character
         map, editor, Config Bar, and scene detail panel.

REQ-069  The demo project uses the same content as the REQ-063 sample
         project: regression-fantasy genre, 2 tracks, 8-10 scenes (2-3
         with draft content), 4-5 characters, 5-6 relationship lines,
         and a fully populated Config. The same fixture data is shared
         between the client-side demo and the server-side seed.

REQ-070  Demo project data is managed entirely in client-side memory.
         No server API calls are made. On browser refresh, tab close, or
         new tab open, the demo always resets to the initial state
         (hardcoded fixture). No browser persistence (localStorage,
         sessionStorage, IndexedDB) is used.

REQ-071  When a guest attempts an action that requires authentication,
         the system displays a login prompt modal containing:
         - A value proposition message (ko/en)
         - A Google login button
         - A close/cancel button
         Login modal copy:
         - ko: "AI가 당신의 이야기를 써드립니다. 무료로 시작하세요."
           Subtitle: "Google 계정으로 가입하면, AI 씬 생성과 나만의
           프로젝트를 이용할 수 있습니다. 매월 10회 무료."
         - en: "Let AI write your story. Start free."
           Subtitle: "Sign in with Google to unlock AI scene generation
           and your own projects. 10 free generations per month."

REQ-072  The login gate triggers on actions that require content creation
         or server persistence (gate BEFORE the action starts, not after):
         - AI scene generation (Generate AI Draft button)
         - AI editing request (direction-based edit)
         - New project creation ([+ New Project])

REQ-073  The login gate does NOT trigger on the following actions (freely
         available to guests):
         - Opening/browsing the demo project
         - Dragging/resizing/moving scenes on the timeline
         - Editing scene detail panel fields (title, summary, mood tags)
         - Clicking character nodes, editing character cards
         - Viewing relationship lines
         - Typing/editing text directly in the editor
         - Changing Config Bar values
         - Switching theme (dark/light)
         - Switching language (ko/en)

REQ-074  When a guest completes Google OAuth via the login modal:
         (a) Client-side in-memory demo data is discarded.
         (b) Authenticated user's real data is loaded from the server
             (including REQ-063 sample project).
         (c) User is navigated to the dashboard.
         Demo edits are not preserved, and no "save your work" prompt
         is displayed.
```

### 5.14 Non-Functional Requirements (Guest Mode)

```
REQ-076  Guest dashboard initial load time is equal to or faster than
         the authenticated dashboard. Demo project data is hardcoded
         in the client bundle — no server round-trip required.

REQ-077  Demo project workspace initial load time is equal to or faster
         than server-based project workspace load time. No API calls
         means no network latency.

REQ-078  Guest mode does not send requests to authenticated API
         endpoints. All data is processed in client-side memory. The
         server's existing AuthUser middleware and API auth logic remain
         unchanged.

REQ-079  If a guest manually calls authenticated API endpoints (e.g.,
         via browser dev tools), the existing JWT auth middleware returns
         401 Unauthorized. Guest mode must not weaken existing API
         security.

REQ-080  The login prompt modal's Google OAuth flow maintains the same
         security level as the existing auth flow (REQ-056~059). No
         separate auth pathway is introduced.
```

---

## 6. User Journeys

### Journey 0: Guest Browsing to Signup Conversion

1. Unauthenticated visitor opens Narrex.
2. Dashboard loads with a demo project card ("회귀 기사의 두 번째 인생") showing a "Try it" badge, a [+ New Project] button, and a login button.
3. Visitor clicks the demo project card.
4. Workspace opens. Timeline shows 2 tracks with 8-10 scenes. Character map shows 4-5 characters with relationship lines. Config bar is populated.
5. Visitor clicks a scene on the timeline. Scene detail panel opens. They read the title and plot summary.
6. Visitor clicks an "Edited" scene. Editor panel shows draft text. They read and modify the text (in-memory changes only).
7. Visitor selects an "Empty" scene and clicks "Generate AI Draft."
8. Login prompt modal appears: "AI가 당신의 이야기를 써드립니다. 무료로 시작하세요."
9. Visitor clicks Google login button.
10. Google OAuth flow completes -> JWT issued.
11. Client-side demo data is discarded. Server data loads (including REQ-063 sample project).
12. User lands on dashboard with the server sample project ("Example" badge) and [+ New Project] button.

**Drop-off risks:**
- Step 3: Visitor doesn't click the demo project. Mitigation: visually prominent demo card design.
- Step 8: Visitor closes the login modal. Mitigation: value proposition copy emphasizing "10 free per month." Visitor can return to browsing the demo.
- Step 11: Visitor is disappointed that demo edits are gone. Mitigation: server sample project provides identical content immediately. Demo is positioned as "try it out," not "your workspace."

**Alternative path — New Project:**
1. Visitor clicks [+ New Project] on the dashboard.
2. Login prompt modal appears immediately (before any project creation work).
   - If visitor logs in -> signup completes -> dashboard with server data.
   - If visitor cancels -> returns to dashboard, can explore the demo project.

**Returning visitor (no signup):**
1. Visitor explored the demo, closed the browser, returns the next day.
2. Dashboard loads with the demo project in its initial state (in-memory reset).
3. Visitor can re-explore or sign up.

### Journey 1: Idea to First AI Draft (Core Loop)

1. User opens Narrex and creates a new project.
2. User chooses an entry point:
   - **Free text:** Types or pastes their story idea into a text input area.
   - **File import:** Drags a Notion export or Markdown file into the project.
   - **Genre template:** Selects "Regression Fantasy" from a template gallery.
3. System processes the input and generates an initial Config, Timeline (with scenes), and Character Map.
   - If input is too vague to structure (e.g., "a love story") -> system asks 2-3 clarifying questions before generating structure.
   - If input is rich (multi-page notes) -> system structures directly and presents result.
4. User sees the generated timeline with scenes, character map with relationships, and config bar pre-filled. First-time users see an onboarding overlay explaining each area.
5. User reviews and edits the auto-generated structure: renames scenes, adjusts character details, moves events on the timeline, adds missing characters.
6. User selects a scene on the timeline (e.g., "Protagonist discovers regression ability").
7. Editor panel opens. User presses "Generate AI Draft."
8. System assembles prompt from all context sources and generates 2-3 variations.
   - If generation fails -> system shows error with retry option and suggests checking scene details for completeness.
9. User reads the variations, selects one (or mixes sections from multiple). The selected draft is applied to `scene.content`. User edits the text in the editor — all changes auto-save.
10. Scene status updates from "Empty" to "AI Draft" (and to "Edited" once the user modifies text).

**Drop-off risks:**
- Step 3: Auto-structuring produces a result that doesn't match the user's vision. Mitigation: make every element editable, show a "This is a starting point — edit freely" message.
- Step 7: First AI draft quality is disappointing. Mitigation: generate multiple variations; provide tone sliders to let user steer output.
- Step 9: User doesn't know how to improve the draft. Mitigation: direction-based edit requests ("more tension", "add dialogue") lower the editing skill barrier.

### Journey 2: Episode Organization

1. User has created 15+ scenes on the timeline.
2. User opens the episode organization view (or system prompts: "You have enough events to start organizing episodes").
3. AI suggests episode distribution: "Based on your 18 scenes, I suggest 6 episodes. Here's a proposed grouping."
4. System places episode dividers on the timeline.
5. User reviews per-episode word count estimates. Episode 3 is estimated at 8,000 characters (over the 3,000-5,000 target).
6. User drags the Episode 3/4 divider leftward, splitting the large event group into two episodes.
7. System auto-rebuilds AI context for affected episodes.
8. User tags Episode 2's ending as "breadcrumb" (subtle clue) and Episode 4's ending as "crisis" (cliffhanger).
9. When user generates AI drafts for scenes in these episodes, the AI adjusts pacing and ending direction based on episode position and hook type.

### Journey 3: Character Map Evolution

1. User opens the Character Map tab in the left panel.
2. User sees auto-generated character nodes with relationship lines from the initial structuring.
3. User clicks on the protagonist node and edits the character card: adds a secret motivation, refines personality description.
4. User creates a new relationship line between the protagonist and antagonist, labels it "former allies," marks it as dashed (negative) with a one-directional arrow.
5. User uses the temporal slider to set a different relationship state at an earlier timeline point: "allies" (solid line) before the betrayal scene.
6. When generating AI drafts for scenes before the betrayal, the AI references the allied relationship state. After the betrayal scene, it references the adversarial state.

### Journey 4: Revision After First Draft Complete

1. User has completed AI drafts and edits for all scenes across 12 episodes.
2. User opens the Revision panel.
3. System runs character consistency check. Flags: "In Episode 3, Seo-jun is described as having brown eyes, but in Episode 9, they are described as black."
4. System runs foreshadowing verification. Flags: "The mysterious letter introduced in Episode 2, Scene 4 has no payoff in any subsequent scene."
5. User clicks on the foreshadowing flag. System suggests: "Consider adding a reveal scene around Episode 8-10. Here are three options for how the letter could pay off."
6. User selects a suggestion, and the system creates a new scene on the timeline linked to the original foreshadowing scene.
7. User generates an AI draft for the new scene, which automatically includes the foreshadowing context.

---

## 7. Scope & Non-Goals

### In Scope (Full Product Vision)

- Project creation from free text, file import, or genre templates with AI auto-structuring
- Visual multi-track timeline with drag-and-drop scene editing
- Event-episode separation layer with draggable episode dividers
- Interactive character relationship map with temporal tracking
- Visual world map (real and fictional) with timeline integration
- Scene-level AI draft generation with full narrative context assembly
- Multiple draft variations, tone/style sliders, and AI Surprise mode
- Direction-based partial editing and inline autocomplete
- AI-powered revision tools (consistency, foreshadowing, contradictions, style)
- Manuscript export (DOCX, EPUB, plain text)
- Freemium subscription model (Free, Basic, Pro, Pay-as-you-go)

### Out of Scope

- **Platform publishing integration** (Kakao Page, Naver Series direct submission) — requires partnership agreements and platform-specific formatting that should only be pursued after core product-market fit is validated. Future phase candidate.
- **Real-time collaboration** (multiple authors on one project) — introduces significant complexity in conflict resolution, permissions, and real-time sync. The single-author experience must be solid first.
- **Character illustration AI generation** — visual generation is a different AI domain with different cost structures and quality expectations. Evaluating as a Phase 3+ feature once the writing workflow is proven.
- **Cover image generation** — same rationale as character illustration.
- **Multi-language support** (beyond Korean) — the product is designed for the Korean web novel market. International expansion is a future strategic decision, not a launch concern.
- **Mobile app** — web-first. The timeline and editor interactions require screen real estate that makes desktop the primary platform. Mobile viewing (read-only) could be a future addition.
- **Social features** (sharing, community, commenting) — the product is an authoring tool, not a publishing platform. Social features dilute focus.

### What This Document Does NOT Cover

- UI/UX design, wireframes, interaction patterns, visual specs (see docs/ux-design.md)
- Technical architecture, tech stack, API design (see docs/design-doc.md)
- Database schema and data modeling (see docs/database-design.md)
- Sprint planning, task breakdown, story points

---

## 8. Assumptions, Constraints & Risks

### Assumptions

- **Scene-level Korean prose generation is good enough to revise.** Current frontier-class models produce Korean prose that is serviceable as a starting point. If quality degrades significantly for genre-specific tropes (regression, martial arts), the provider-agnostic LLM gateway enables rapid provider switching. Specialized prompting or fine-tuning may also be required. Plan to validate with user testing in first month.
- **Context compression preserves narrative fidelity.** AI-generated summaries of prior chapters can maintain enough detail for foreshadowing and character consistency over 40+ episodes. Not yet validated at scale — plan to test with 50-episode test novels.
- **Aspiring writers will pay for AI generation.** The assumption that users who cannot write novels will pay $12-25/month for AI assistance is based on comparable creative tool pricing (Canva, Midjourney) but not directly validated in the Korean web novel writing market.
- **Users will engage with the visual timeline rather than finding it overwhelming.** The multi-track timeline is the core differentiator but also the highest UX risk. Progressive disclosure and onboarding tutorials are planned, but the assumption that non-technical hobbyist writers will adopt a timeline interface needs validation.

### Constraints

- **Cost ceiling per user.** AI generation costs must remain below ~40% of subscription revenue per user to sustain the business model. At $12/month (Basic), this means <$4.80/month in AI costs per user.
- **Korean language quality.** All AI outputs must be natural-sounding Korean, not translated-feeling text. This constrains model selection to those with strong Korean language capabilities.
- **Single developer initially.** Development velocity is constrained by team size. This influences phasing decisions — the MVP must be achievable by a small team.

### Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| AI prose quality in Korean is not good enough to revise (users discard rather than edit) | Critical | Medium | Multiple variations + tone sliders give users more control. Run quality benchmarks before launch with target users. Fallback: integrate multiple model providers for A/B quality comparison. |
| Context compression loses critical narrative details over 40+ episodes | High | Medium | Implement foreshadowing link system that preserves tagged important details regardless of compression. Test with progressively longer manuscripts during development. |
| Visual timeline is too complex for target users (hobbyist writers, not technical users) | High | Medium | Progressive feature disclosure (start with simple list view, unlock timeline complexity as user advances). AI chat panel available for users to ask questions when stuck. Validate with user testing before full launch. |
| Per-user AI costs exceed subscription revenue (especially for Pro/unlimited users) | High | Low | Model tiering (cheap models for simple tasks, expensive models only for scene generation). Prompt caching for stable context. Usage monitoring with cost alerts. Adjust unlimited tier pricing if needed. |
| Competitors add visual timeline features (Sudowrite, Novelcrafter) | Medium | Low | Korean language specialization and web novel genre knowledge create a defensible niche. Speed of execution matters — first-mover advantage in the Korean market. |
| Users create elaborate structures but never generate/write (tool becomes a planning toy, not a writing tool) | Medium | Medium | Onboarding flow pushes users to generate their first AI draft within the first session. Surface "ready to write" prompts when structure reaches a viable state. Track structure-to-generation conversion as a key metric. |

---

## 9. Business Model

| Plan | Price (USD) | Included | Target User |
|------|-------------|----------|-------------|
| Free | $0 | Unlimited structure, timeline, and character map editing. 50 AI generations/month (resets 1st of each month UTC). Warning at 80% usage (40/50). | Trial users, evaluators, pure planners |
| Basic | ~$12/month | 100 AI generations/month. 2 draft variations per scene. Tone/style sliders. | Hobbyist writers producing their first novel |
| Pro | ~$25/month | Unlimited AI generations. 3 draft variations. AI Surprise mode. Advanced model access. Revision tools. | Active serializers, serious hobbyists |
| Pay-as-you-go | Credit packs | Overage credits for any plan | Users who exceed plan limits occasionally |

**Cost structure per scene:** ~$0.03-0.06 (with prompt caching and model tiering).
**Cost per 40-episode novel:** ~$3.60-9.60.
**Estimated monthly AI cost per active user:** ~$15-40 (Pro, heavy use) / ~$3-8 (Basic, moderate use).

---

## 10. Competitive Landscape

### International Competitors

| Tool | Strengths | Gaps |
|------|-----------|------|
| Sudowrite | Strong autocomplete, "Story Engine" for longer works | English-only. No visual timeline. Sentence-level, not scene-level. |
| Novelcrafter | Codex system for worldbuilding, character management | English-only. No timeline view. No AI generation (uses third-party models via API keys). |
| Squibler | Full auto-generation, fast output | Low quality output. No author control. English-focused. |
| NovelAI | Customizable AI models, privacy-focused | English-focused. Generator not authoring tool. No structural planning. |

### Korean Competitors

| Tool | Strengths | Gaps |
|------|-----------|------|
| 단편.ai | Fast 30-second generation, low barrier | No author control. Low quality. No structure tools. |
| 이음AI | Character management, relationship tracking | No visual timeline. No scene-level AI generation. |
| TypeTak | Editor with AI assist, familiar UX | Sentence-level assist only. No structural tools. |
| AIWC | 11-step guided process, structured approach | Rigid process. Weak writing output. Not visual. |

### Narrex Differentiators

1. **Visual timeline-based structure.** No competitor — international or Korean — offers a multi-track visual timeline for story planning. This is the primary differentiator.
2. **Visual editing = AI prompting.** Manipulating the UI (moving scenes, editing character cards, dragging episode dividers) directly shapes what the AI generates. No prompt engineering required.
3. **Beginner-friendly UX.** Progressive feature disclosure and an always-available AI chat panel let non-technical users ask for help on their own terms, unlike competitors that assume writing experience.
4. **AI variations.** Multiple draft versions + tone sliders + AI Surprise give authors meaningful creative control, unlike single-output generators.
5. **Korean web novel specialization.** Genre-aware (regression, romance-fantasy, martial arts), Korean-native prose output, episode-length calibrated for web novel standards (3,000-5,000 characters).
6. **Authoring tool, not generator.** Author involvement at every step — the tool augments creative judgment instead of replacing it.

---

## 11. Phasing Strategy

### Phase 1: Core Loop (MVP)

Prove that a user can go from idea to a multi-episode AI-assisted draft using the visual timeline.

**Included:**
- Guest browsing mode with client-side demo project, deferred authentication at AI generation / new project creation points, and login prompt modal (REQ-064, REQ-065, REQ-066, REQ-067, REQ-068, REQ-069, REQ-070, REQ-071, REQ-072, REQ-073, REQ-074, REQ-075, REQ-076, REQ-077, REQ-078, REQ-079, REQ-080)
- Sample project auto-created on signup for instant workspace exploration (REQ-063)
- Free text input and file import with AI auto-structuring (REQ-001, REQ-002, REQ-004)
- Multi-track timeline with scene editing: add, delete, move via drag-and-drop, parallel tracks, merge/branch points, vertical alignment (REQ-009, REQ-010, REQ-011, REQ-012, REQ-013, REQ-014, REQ-015)
- Scene detail panel with event details (REQ-014)
- Character relationship map: node graph, relationship lines, character cards (REQ-024, REQ-025, REQ-026)
- Per-scene AI draft generation with auto-assembled context (REQ-034, REQ-035)
- Basic editor: edit generated text, direction-based edit requests (REQ-042, REQ-043)
- Basic Config bar (REQ-007, REQ-008)

**Deferred to Phase 2+:**
- Episode organization layer (scenes map 1:1 to episodes initially)
- Episode assembly — merge per-scene drafts into a single cohesive episode text
- Full manuscript assembly — combine all episodes into a complete book
- Draft history browsing and selective apply (REQ-055)
- Side-by-side draft comparison when re-generating with existing content (REQ-054 full)
- World map
- Temporal relationship tracking
- Genre templates
- Multiple draft variations and tone sliders
- AI Surprise mode
- Foreshadowing connection lines
- AI gap detection
- Revision tools
- Inline autocomplete
- Export

### Phase 2: Episode Layer & Polish

Add episode organization, episode assembly (merge scene content into episodes), full manuscript assembly, variations, draft history browsing (REQ-055), side-by-side draft comparison (REQ-054), and export.

### Phase 3: Depth & Delight

World map, temporal relationships, revision tools, AI Surprise, genre templates, advanced features.

Detailed Phase PRDs will be created as separate documents (docs/prd-phase-1.md, docs/prd-phase-2.md, etc.).

---

## 12. Appendix

- Product Brief: docs/product-brief.md
- Guest Mode Product Brief: docs/product-brief-guest-mode.md
- UX Design: docs/ux-design.md
- Database Design: docs/database-design.md
- Design Document: docs/design-doc.md
- ERD: docs/erd.mermaid
