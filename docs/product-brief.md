# Narrex — Product Brief

**Author:** zzoo | **Date:** 2026-03-04 | **Status:** In Progress
**Tagline:** Set up your story, and AI drafts it scene by scene — you just direct and refine.

---

## 1. Problem

**What problem are we solving?**

Aspiring writers and hobbyists have stories in their heads but cannot turn them into actual novels. The bottleneck is not lack of ideas — it is the labor of structuring dozens of events, maintaining consistency across chapters, and producing thousands of words per episode. Users arrive with ideas at wildly different levels of organization: 10-page Notion docs, one-line phone memos, vague mental images. They think in scenes and events ("How do I develop this scene?"), not sentences ("What's the next word?"). Existing AI tools address the wrong unit of work — sentence-level autocomplete or fully automated generation with no author control.

**Who has this problem?**

Primary: aspiring novelists and hobbyist writers in the Korean web novel ecosystem who have ideas but lack the craft or stamina to produce a structured, multi-chapter work. Secondary: beginner web novel serializers who started publishing but struggle with pacing and consistency across 40+ episodes. Tertiary: content creators who need narrative structure for YouTube stories, game scenarios, or TRPG campaigns.

**How do they solve it today?**

They outline in docs or Notion, then stall at the actual writing. Some use ChatGPT in free-form chat, losing narrative consistency after a few chapters because context evaporates. Others try international tools like Sudowrite (English-only, no visual structure, good autocomplete but wrong unit of work) or Novelcrafter (codex worldbuilding but no timeline). Korean alternatives are either fully automated generators with no quality control (단편.ai), character management without visual structure (이음AI), or multi-step processes with weak writing output (AIWC). No tool on the market — Korean or international — combines visual story structure with AI drafting.

**Why now?**

LLM quality has reached a point where scene-level prose generation is viable at reasonable cost (~$0.03-0.06 per scene with model tiering and prompt caching). The Korean web novel market is booming, but zero tools combine visual story architecture with AI drafting in Korean. Competitors are clustered in either "full auto-generation" or "sentence autocomplete" — the scene-level sweet spot is unoccupied. Cost structure is finally workable: estimated $3.60-9.60 per complete 40-episode novel, making $12-25/month subscription pricing sustainable.

---

## 2. Proposed Direction

**High-level approach**

A visual novel editor where the story is a timeline of scenes — not a blank page. Authors set up characters, relationships, and plot points on an interactive multi-track timeline, then generate AI prose scene by scene. The visual structure (config, character graph, timeline position, foreshadowing links) automatically assembles into the AI prompt, so authors never write prompts — they just arrange their story visually and the AI knows the full narrative context.

The key architectural insight is separating scenes from episodes. Events and episodes are not 1:1 — several small events can merge into one episode, or one large event can span multiple episodes. Episode dividers on the timeline can be dragged to re-partition chapters instantly, and the AI prompt auto-rebuilds. The editing model is "revise, don't write from scratch": AI generates 2-3 draft variations per scene with adjustable tone sliders (description density, dialogue ratio, emotional intensity, pacing), and the author picks, mixes, and refines.

**Core insight**

Novelists think in scenes and events, not sentences. By making the unit of AI generation a scene within a structured timeline rather than a next sentence in a chat, we solve the real bottleneck (story development and scene construction) while preserving author control. The visual structure is simultaneously the authoring interface and the prompt engine — manipulating the UI is writing the prompt. This is the moat that chat-based and autocomplete-based tools cannot replicate.

---

## 3. Success Signal

We will know this is working when users who enter with just an idea (free-text dump, file import, or genre template) consistently reach a complete first draft of 10+ episodes, and when they choose to continue using the tool for their next project rather than reverting to docs or chat. Early signal: users spend more time editing AI drafts than generating them — meaning the drafts are good enough to refine, not discard. Revenue signal: free-to-Basic conversion driven by users hitting the 10 AI generations/month ceiling.

---

## 4. Open Questions

- [ ] What is the minimum viable timeline UI — full drag-and-drop multi-track canvas, or a simpler single-track view for first release?
- [ ] How much Korean web novel genre knowledge (regression, romance-fantasy, martial arts tropes) needs to be baked into system prompts vs. learned from user-provided genre templates?
- [ ] Can context compression (AI-summarized prior chapters) maintain enough narrative fidelity for foreshadowing and character consistency over 40+ episodes?
- [ ] What is the right free-tier AI generation limit (currently assumed 10/month) to demonstrate value without excessive cost?
- [ ] Should we validate with hobbyist writers first (broader market, lower expectations) or beginner serializers (narrower but higher willingness to pay)?
- [x] ~~What is the optimal model tiering strategy?~~ **Decided:** Provider-agnostic LLM gateway with self-hosted abstraction (Rust trait). Supports OpenAI, Anthropic, Google, etc. behind a unified interface. Model tiering by task type deferred to Phase 2. Local dev uses Ollama.
