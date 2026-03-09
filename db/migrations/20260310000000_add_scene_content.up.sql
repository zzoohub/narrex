-- Add content column to scene table.
-- scene.content holds the user's manuscript text (auto-saved from editor).
-- AI-generated drafts remain in the drafts table as append-only history.
-- Phase 1: AI generation auto-applies to scene.content when empty.
-- Phase 2: draft comparison UI, selective apply from draft history.

ALTER TABLE scene ADD COLUMN content TEXT;

COMMENT ON COLUMN scene.content IS
  'User manuscript text. Auto-saved from editor. NULL = no content yet. '
  'Distinct from drafts table which stores AI generation history.';
