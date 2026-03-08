# Scene Detail Panel

**Location:** Right side panel (auto-opens on scene selection)
**Primary action:** Define what this scene is about (to shape AI generation)

---

## Layout

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

## Interaction Details

- **Title**: single-line text input. Required. Auto-filled from structuring.
- **Characters**: multi-select chip input. Typing filters from character map. [+ Add] creates a new character (opens character card in left panel).
- **Location**: free text input with autocomplete from previously used locations.
- **Mood/Tone tags**: chip input, same pattern as config bar. Optional. Overrides config-level tone for this scene only.
- **Plot summary**: multi-line text area, no character limit. This is the most critical field — it is the user's creative direction for AI generation. Placeholder: "What happens in this scene? The more detail you provide, the better the AI draft will be."

## Auto-save

All fields save automatically on change (debounced 1s). No manual save button. Status indicator: "Saved" or "Saving..." in panel footer. (Cognitive Load: remove the decision to save.)
