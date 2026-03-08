# Editor Panel

**Location:** Center panel
**Primary action:** Edit scene prose

---

## Empty State (no scene selected)

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

## Empty State (scene selected, no draft)

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

## Draft Exists State

```
+-----------------------------------------------+
| <- Prev Scene    Scene 5: Title    Next ->    |
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

## AI Generation Loading State

```
+-----------------------------------------------+
| <- Prev Scene    Scene 5: Title    Next ->    |
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

## Direction-based Editing Interaction

1. User selects text in the editor.
2. A floating toolbar appears above the selection: `[B] [I] [Edit with AI]`
3. User clicks [Edit with AI].
4. An inline input expands below the toolbar: "How should this change?" with text input and [Apply] button.
5. User types direction (e.g., "more restrained, internal monologue").
6. User clicks [Apply] or presses Enter.
7. Only the selected text is replaced with streaming AI output. Surrounding text is unchanged.
8. Original text is preserved in undo history. (Undo/Redo: Cmd+Z unlimited stack.)

If no text is selected and user clicks [Edit with AI] from a toolbar menu, the direction applies to the entire scene.

## Editor Features (Phase 1)

- Standard text editing (type, select, cut/copy/paste)
- Undo/redo (Cmd+Z / Cmd+Shift+Z, 50+ action stack)
- Character count (real-time)
- Prev/next scene navigation
- Direction-based partial regeneration
- Re-generate entire draft (with confirmation)

## Deferred Editor Features

- Inline autocomplete [Phase 2]
- Tone/style sliders before generation [Phase 2]
- Multiple draft variations with comparison view [Phase 2]
- Full manuscript reading mode with episode navigation [Phase 2]
