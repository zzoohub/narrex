# Product Recommendation: Trash Bin for Project Deletion

**Author:** Product Manager | **Date:** 2026-03-09 | **Status:** Recommendation
**Context:** Evaluating whether to adopt a trash bin / recycle bin pattern instead of (or layered on top of) the current delete + undo snackbar design.

---

## Verdict: Yes, but not yet. Ship the snackbar-only flow now, add the trash bin in Phase 2.

The trash bin is the correct long-term pattern for Narrex. But it is not the right thing to build first. Here is the reasoning.

---

## 1. Is a Trash Bin Right for This Product?

**Yes, strongly.** Three factors make the trash bin pattern a near-inevitable addition:

**High asset value.** A Narrex project contains tracks, scenes, characters, relationships, drafts, and AI-generated content. A single project can represent days of creative work. This is closer to a Figma design file or a Final Cut Pro project than a to-do item. Every creative tool in this class has a trash bin: Figma, Notion, Google Drive, Adobe apps, Final Cut, Logic Pro.

**Irreversibility anxiety.** Creative tools live and die on user trust. Writers are already anxious about losing work (every writing app touts "never lose your work"). An 8-second undo window, while technically sufficient, creates a psychological gap: "What if I deleted something yesterday and only realize today?" The trash bin eliminates this class of anxiety entirely.

**Low project count, high attachment.** Narrex users will have a small number of projects (Phase 1 expects fewer than 20 per user), each representing significant emotional and time investment. This is the exact profile where a trash bin adds disproportionate value: few items, high stakes.

---

## 2. Trade-offs: Snackbar-Only vs. Trash Bin

| Dimension | Snackbar-Only (current UX design) | Snackbar + Trash Bin |
|-----------|-----------------------------------|----------------------|
| **Recovery window** | 8 seconds (snackbar) + invisible 30-day server retention | Unlimited until user explicitly purges |
| **User confidence** | Medium. User must trust that "undo" works and act fast. | High. Deleted items are visible and restorable at any time. |
| **Discoverability of recovery** | Low. If the snackbar dismisses, the user has no UI path to recover. They would need to contact support. | High. Trash is always accessible. Self-service recovery. |
| **Implementation cost** | Lower. No new views, no new API endpoints beyond restore. | Higher. Needs: trash view UI, list-deleted API, restore API, permanent-delete API, possibly auto-purge job. |
| **Cognitive overhead** | Simple mental model: delete is delete. | Slightly more complex: delete moves to trash, permanent delete from trash. But this is a universally understood pattern (every OS has it). |
| **Support burden** | Higher long-term. Users who miss the undo window will contact support asking for recovery. | Lower long-term. Users self-serve. |
| **Edge cases** | What happens if the user closes the browser during the 8s window? (Data is soft-deleted server-side, but user has no recovery path in the UI.) | Closing the browser is fine. The project sits in trash until the user decides. |

**Key insight:** The snackbar and the trash bin solve different problems. The snackbar handles the "oops, wrong click" moment (immediate undo). The trash bin handles the "I deleted that last week and now I need it back" moment (deferred recovery). They are complementary, not alternatives.

---

## 3. Should There Be Auto-Purge?

**Yes, 30 days.** Reasons:

- **Storage cost.** Soft-deleted projects still consume database rows and related records (scenes, characters, drafts, generation logs). Without auto-purge, storage grows unbounded.
- **User expectation.** Every trash bin implementation users know has auto-purge: macOS Trash (manual but prompted), Google Drive (30 days), Gmail (30 days), Notion (30 days). 30 days is the de facto standard.
- **Legal/compliance.** Even in Phase 1, retaining user data indefinitely after they explicitly requested deletion creates a liability. 30-day auto-purge provides a clear retention policy.
- **The existing UX doc already assumes this.** The current `ux-project-deletion.md` mentions "server retains data for 30 days" -- the trash bin simply makes this visible to the user.

**Implementation note:** The auto-purge should be a background job (cron or scheduled Cloud Run Job) that hard-deletes projects where `deleted_at < now() - 30 days`. This already aligns with the worker infrastructure in the architecture.

---

## 4. Where Does the Trash Bin Live in the UI?

**Recommendation: Dashboard tab, not sidebar item.**

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **Sidebar item** | Always visible, matches Finder/Google Drive | Narrex does not currently have a persistent sidebar on the dashboard. Adding one for a single item is over-engineering. | No |
| **Dashboard tab** ("Projects" / "Trash") | Lightweight. Fits existing dashboard layout. Clear mental model: trash is a filtered view of the same project list. | Adds a tab bar to the dashboard (currently just a project grid). | **Yes -- recommended** |
| **Settings page** | Keeps the dashboard clean | Too buried. Users will not find it when they need it. Violates the principle that recovery should be easily discoverable. | No |
| **Floating icon/button** | Minimal UI change | Doesn't scale. Where does it go? Feels ad-hoc. | No |

**Detailed recommendation:**

- Add a minimal tab bar to the dashboard: "Projects" (default) and "Trash" (with a count badge showing number of trashed items, or hidden entirely if trash is empty).
- The Trash tab shows the same card grid layout but with different actions: "Restore" and "Delete Permanently" instead of "Open."
- Each trashed project card shows the deletion date and days remaining before auto-purge: "Deleted Mar 5 -- 26 days left."
- An "Empty Trash" action (with confirmation dialog) allows bulk permanent deletion.

---

## 5. MVP Scope vs. Future Enhancements

### MVP (Phase 2 -- after the snackbar-only deletion ships)

| Item | Detail |
|------|--------|
| **Trash tab on dashboard** | Tab bar: "Projects" / "Trash". Trash tab shows soft-deleted projects. |
| **Restore from trash** | Context menu or button on trashed project card. Calls restore API. Project reappears in Projects tab. |
| **Permanent delete from trash** | Context menu or button on trashed project card. Confirmation dialog (stricter than soft-delete: "This cannot be undone"). Calls hard-delete API. |
| **Auto-purge indicator** | Each trashed card shows "Deleted [date] -- [N] days left." |
| **Auto-purge job** | Background job: hard-delete projects where `deleted_at` is older than 30 days. |
| **API endpoints** | `POST /v1/projects/{id}/restore` (clear `deleted_at`), `DELETE /v1/projects/{id}/permanent` (hard delete), `GET /v1/projects?status=deleted` (list trashed). |
| **Empty Trash** | Button to permanently delete all trashed projects at once. Confirmation dialog. |

### Future Enhancements (Phase 3+)

| Item | Rationale |
|------|-----------|
| **Trash count in dashboard header** | Visual indicator without needing to click the tab. |
| **Batch select + restore/delete** | Useful when project count grows. Not needed at fewer than 20 projects. |
| **Undo permanent delete** (grace period) | Extreme safety net. Low priority -- if users confirm permanent delete through a strict dialog, that should be sufficient. |
| **Trash for individual scenes/characters** | Granular recovery. Significantly more complex. Defer until user demand is clear. |
| **Storage quota warnings** | "Your trash is using X MB. Empty trash to free space." Only relevant at scale. |

---

## 6. Risks and Edge Cases

| Risk / Edge Case | Severity | Mitigation |
|------------------|----------|------------|
| **User deletes project, forgets about trash, project auto-purges** | Medium | Send email notification 3 days before auto-purge: "Your project [title] will be permanently deleted in 3 days." (Phase 3 -- requires email infrastructure.) For MVP: the "N days left" indicator in the trash view is sufficient. |
| **User tries to create a project with the same title as a trashed one** | Low | Allow it. Titles are not unique identifiers. No conflict. |
| **Trashed project still counts against any future project limits** | Medium | Decision needed. Recommendation: trashed projects do NOT count against limits. This encourages cleanup and avoids user frustration. |
| **User opens a direct link to a trashed project** | Low | Show a clear message: "This project is in the trash. Restore it to continue editing." with a Restore button. Do not silently 404. |
| **Race condition: auto-purge runs while user is restoring** | Very Low | The restore API should use a transaction that checks `deleted_at IS NOT NULL` and clears it atomically. If the row is already hard-deleted, return 404. |
| **Data cascade on hard delete** | Medium | Hard delete must cascade to all related records: tracks, scenes, connections, characters, relationships, drafts, generation logs, summaries. Use `ON DELETE CASCADE` in the schema or explicit transaction. Verify this is covered in the database design. |

---

## 7. Recommended Execution Order

**Step 1 (now): Ship the snackbar-only deletion flow.** The UX design in `docs/ux-project-deletion.md` is solid and well-specified. It covers the immediate need (users can delete projects from the dashboard) and the 8-second undo handles the most common accident case. This unblocks the "dashboard housekeeping" user need today.

**Step 2 (Phase 2): Add trash bin.** Once the basic deletion flow is live and users start accumulating deleted projects, layer in the trash bin. The server-side soft-delete infrastructure is already in place -- this is primarily a UI and API addition. The 30-day auto-purge job should ship with this.

**Step 3 (Phase 3+): Refinements.** Email notifications before auto-purge, trash for sub-project assets (scenes, characters), batch operations.

**Why not build the trash bin first?** Three reasons:
1. The snackbar flow is a prerequisite anyway -- you need the delete action, confirmation dialog, and undo snackbar regardless of whether a trash bin exists.
2. The trash bin adds 3-4 new API endpoints, a new dashboard tab, new card states, and a background job. That is meaningful scope for a feature that benefits users only after they have deleted something and then need it back days later -- a scenario that barely exists when the product has few users with few projects.
3. Shipping deletion without a trash bin is safe because the server already retains soft-deleted data for 30 days. If a user desperately needs recovery before the trash bin ships, you can restore manually via the database. At Phase 1 scale (fewer than 100 users), this is acceptable.

---

## 8. Impact on Existing UX Design

The current `docs/ux-project-deletion.md` does not need changes for Step 1. It explicitly noted "No Recently Deleted section in Phase 1" and acknowledged this as a future consideration. The trash bin recommendation aligns with the existing design's own roadmap.

When the trash bin ships in Phase 2, the following UX copy should change:
- The confirmation dialog description should update from "All scenes, characters, and drafts in this project will be deleted" to "This project will be moved to Trash. You can restore it within 30 days." This is less anxiety-inducing and more accurate.
- The snackbar should remain (it still handles the immediate "oops" case), but its message can simplify to "Moved to Trash" with an Undo action.

---

## Summary

The trash bin is the right pattern for Narrex. Creative tools with high-value assets universally adopt it, and it eliminates a real category of user anxiety. But it is not the right thing to build right now. Ship the well-designed snackbar-only flow immediately, then layer in the trash bin as a Phase 2 enhancement. The soft-delete infrastructure already in place makes this a clean two-step execution.
