-- Add 'sample' to project.source_type CHECK constraint.
-- Sample projects are auto-created on first signup (REQ-063).

ALTER TABLE project DROP CONSTRAINT IF EXISTS project_source_type_check;
ALTER TABLE project
    ADD CONSTRAINT project_source_type_check
    CHECK (source_type IN ('free_text', 'file_import', 'template', 'sample'));

-- Prevent duplicate sample projects per user (defence against TOCTOU race).
CREATE UNIQUE INDEX uq_one_sample_per_user
    ON project (user_id)
    WHERE source_type = 'sample' AND deleted_at IS NULL;
