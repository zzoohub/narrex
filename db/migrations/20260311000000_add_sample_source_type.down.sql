DROP INDEX IF EXISTS uq_one_sample_per_user;

ALTER TABLE project DROP CONSTRAINT IF EXISTS project_source_type_check;
ALTER TABLE project
    ADD CONSTRAINT project_source_type_check
    CHECK (source_type IN ('free_text', 'file_import', 'template'));
