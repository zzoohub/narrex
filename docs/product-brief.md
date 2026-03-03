# Narrex — Product Brief

**Author:** zzoo | **Date:** 2026-03-04 | **Status:** Discovery
**Tagline:** Set up your story, and AI drafts it scene by scene — you just direct and refine.

---

## 1. Problem

**What problem are we solving?**

Aspiring writers and hobbyists have stories in their heads but cannot turn them into actual novels. The bottleneck is not lack of ideas — it's the labor of structuring dozens of events, maintaining consistency across chapters, and producing thousands of words per episode. Existing AI writing tools either auto-generate low-quality text with no author control, or offer sentence-level autocomplete that doesn't address the real pain: "How do I develop this scene within the larger narrative?"

**Who has this problem?**

Aspiring novelists and hobbyist writers who have ideas (often sketched in Notion, memos, or their heads) but lack the craft or stamina to produce a structured, multi-chapter work. Secondary: beginner web novel serializers struggling with pacing and consistency across episodes.

**How do they solve it today?**

They outline in docs or Notion, then stall at the actual writing. Some use ChatGPT in free-form chat, but lose narrative consistency after a few chapters. Others try services like Sudowrite (English-only, no visual structure) or Korean tools like 단편.ai (fully automated, no quality control). Most simply give up.

**Why now?**

LLM quality has reached a point where scene-level prose generation is viable at reasonable cost (~$0.03-0.06 per scene with Sonnet-class models and caching). The Korean web novel market is booming, but no tool combines visual story structure with AI drafting in Korean. Prompt caching and model tiering make the unit economics workable for the first time.

---

## 2. Proposed Direction

**High-level approach**

A visual novel editor where the story is a timeline of event nodes — not a blank page. Authors set up characters, relationships, and plot points on an interactive timeline, then generate AI prose scene by scene. The visual structure (config, character graph, timeline position, foreshadowing links) automatically assembles into the AI prompt, so authors never write prompts — they just arrange their story visually and the AI knows the full narrative context.

The editing model is "revise, don't write from scratch." AI generates 2-3 draft variations per scene with adjustable tone sliders; the author picks, mixes, and refines. Episodes are a separate layer from events — drag a divider to re-partition chapters instantly, and the AI context rebuilds automatically.

**Core insight**

Novelists think in scenes and events, not sentences. By making the unit of AI generation a *scene within a timeline* rather than a *next sentence in a chat*, we solve the real bottleneck (story development) while preserving author control. The visual structure is simultaneously the authoring interface and the prompt engine — this is the moat that chat-based tools cannot replicate.

---

## 3. Success Signal

We'll know this is working when users who enter with just an idea (free-text or file import) consistently reach a complete first draft of 10+ episodes, and when they choose to continue using the tool for their next project rather than reverting to docs or chat. Early signal: users spend more time *editing* AI drafts than *generating* them — meaning the drafts are good enough to refine, not discard.

---

## 4. Open Questions

- [ ] What is the minimum viable timeline UI — full drag-and-drop canvas, or a simpler list-based view for MVP?
- [ ] How much Korean web novel genre knowledge (regression, romance-fantasy, martial arts tropes) needs to be baked into prompts vs. learned from user templates?
- [ ] Can context compression (summarizing prior chapters) maintain enough narrative fidelity for foreshadowing and character consistency over 40+ episodes?
- [ ] What is the right free-tier AI generation limit (currently assumed 10/month) to demonstrate value without excessive cost?
- [ ] Should we validate with hobbyist writers first (broader market, lower expectations) or beginner serializers (narrower but higher willingness to pay)?
