-- Narrex: Initial Schema (Phase 1)
-- Database: Neon (PostgreSQL)
-- Date: 2026-03-07

-- =============================================================================
-- Extensions
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- =============================================================================
-- Enum Types
-- =============================================================================

CREATE TYPE scene_status AS ENUM ('empty', 'ai_draft', 'edited', 'needs_revision');
CREATE TYPE connection_type AS ENUM ('sequential', 'branch', 'merge');
CREATE TYPE relationship_visual AS ENUM ('solid', 'dashed', 'arrowed');
CREATE TYPE relationship_direction AS ENUM ('bidirectional', 'a_to_b', 'b_to_a');
CREATE TYPE pov_type AS ENUM ('first_person', 'third_limited', 'third_omniscient');
CREATE TYPE generation_type AS ENUM ('scene', 'summary', 'structuring', 'edit');
CREATE TYPE generation_status AS ENUM ('success', 'failure', 'partial');

-- =============================================================================
-- Shared Functions
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Tables
-- =============================================================================

-- 1. user_account
CREATE TABLE user_account (
    id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    google_id         TEXT        NOT NULL,
    email             TEXT        NOT NULL,
    display_name      TEXT,
    profile_image_url TEXT,
    CONSTRAINT uq_user_google_id UNIQUE (google_id),
    CONSTRAINT uq_user_email UNIQUE (email),
    CONSTRAINT chk_user_email_length CHECK (char_length(email) <= 255)
);

COMMENT ON TABLE user_account IS 'Google OAuth2 users. Ownership-based authorization.';

CREATE TRIGGER trg_user_account_updated_at
    BEFORE UPDATE ON user_account
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- 2. project
CREATE TABLE project (
    id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id         UUID        NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    title           TEXT        NOT NULL,
    genre           TEXT,
    theme           TEXT,
    era_location    TEXT,
    pov             pov_type,
    tone            TEXT,
    source_type     TEXT        CHECK (source_type IN ('free_text', 'file_import', 'template')),
    source_input    TEXT,
    source_file_key TEXT,
    CONSTRAINT chk_project_title_length CHECK (char_length(title) <= 200)
);

COMMENT ON TABLE project IS 'Story workspace with global config settings for AI generation.';
COMMENT ON COLUMN project.source_input IS 'Original user text input or extracted text from imported file';
COMMENT ON COLUMN project.source_file_key IS 'Cloudflare R2 object key for imported file';

CREATE INDEX idx_project_user_id ON project (user_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_project_updated_at
    BEFORE UPDATE ON project
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- 3. track
CREATE TABLE track (
    id              UUID             DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id      UUID             NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT now(),
    position        DOUBLE PRECISION NOT NULL,
    label           TEXT,
    CONSTRAINT chk_track_position CHECK (position > 0)
);

COMMENT ON TABLE track IS 'Parallel storylines within a project. Ordered by position.';

CREATE INDEX idx_track_project_id ON track (project_id, position);

CREATE TRIGGER trg_track_updated_at
    BEFORE UPDATE ON track
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- 4. scene
CREATE TABLE scene (
    id              UUID             DEFAULT gen_random_uuid() PRIMARY KEY,
    track_id        UUID             NOT NULL REFERENCES track(id) ON DELETE CASCADE,
    project_id      UUID             NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT now(),
    position        DOUBLE PRECISION NOT NULL,
    status          scene_status     NOT NULL DEFAULT 'empty',
    title           TEXT             NOT NULL,
    plot_summary    TEXT,
    location        TEXT,
    mood_tags       TEXT[]           DEFAULT '{}',
    CONSTRAINT chk_scene_position CHECK (position > 0),
    CONSTRAINT chk_scene_title_length CHECK (char_length(title) <= 500)
);

COMMENT ON TABLE scene IS 'Scene on the timeline. Central entity for AI context assembly.';
COMMENT ON COLUMN scene.project_id IS 'Denormalized from track.project_id for query performance';
COMMENT ON COLUMN scene.position IS 'Fractional ordering. Initial spacing: 1024.0. Insert at midpoint.';
COMMENT ON COLUMN scene.mood_tags IS 'Override config-level tone for this scene';

CREATE INDEX idx_scene_project_position ON scene (project_id, position);
CREATE INDEX idx_scene_track_position ON scene (track_id, position);
CREATE INDEX idx_scene_mood_tags ON scene USING GIN (mood_tags);

CREATE TRIGGER trg_scene_updated_at
    BEFORE UPDATE ON scene
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- 5. scene_connection
CREATE TABLE scene_connection (
    id              UUID            DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id      UUID            NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    source_scene_id UUID            NOT NULL REFERENCES scene(id) ON DELETE CASCADE,
    target_scene_id UUID            NOT NULL REFERENCES scene(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    connection_type connection_type  NOT NULL DEFAULT 'sequential',
    CONSTRAINT chk_no_self_connection CHECK (source_scene_id != target_scene_id),
    CONSTRAINT uq_scene_connection UNIQUE (source_scene_id, target_scene_id)
);

COMMENT ON TABLE scene_connection IS 'Narrative flow between scenes: sequential, branch, merge.';

CREATE INDEX idx_scene_connection_source ON scene_connection (source_scene_id);
CREATE INDEX idx_scene_connection_target ON scene_connection (target_scene_id);
CREATE INDEX idx_scene_connection_project ON scene_connection (project_id);

-- 6. character
CREATE TABLE character (
    id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id        UUID        NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    name              TEXT        NOT NULL,
    personality       TEXT,
    appearance        TEXT,
    secrets           TEXT,
    motivation        TEXT,
    profile_image_url TEXT,
    CONSTRAINT chk_character_name_length CHECK (char_length(name) <= 200)
);

COMMENT ON TABLE character IS 'Story characters with attributes used as AI generation context.';

CREATE INDEX idx_character_project_id ON character (project_id);

CREATE TRIGGER trg_character_updated_at
    BEFORE UPDATE ON character
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- 7. scene_character
CREATE TABLE scene_character (
    scene_id     UUID        NOT NULL REFERENCES scene(id) ON DELETE CASCADE,
    character_id UUID        NOT NULL REFERENCES character(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (scene_id, character_id)
);

COMMENT ON TABLE scene_character IS 'Which characters appear in which scenes. Used for context assembly.';

CREATE INDEX idx_scene_character_character ON scene_character (character_id);

-- 8. character_relationship
CREATE TABLE character_relationship (
    id              UUID                   DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id      UUID                   NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    character_a_id  UUID                   NOT NULL REFERENCES character(id) ON DELETE CASCADE,
    character_b_id  UUID                   NOT NULL REFERENCES character(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ            NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ            NOT NULL DEFAULT now(),
    label           TEXT                   NOT NULL,
    visual_type     relationship_visual    NOT NULL DEFAULT 'solid',
    direction       relationship_direction NOT NULL DEFAULT 'bidirectional',
    CONSTRAINT chk_different_characters CHECK (character_a_id != character_b_id),
    CONSTRAINT uq_character_pair UNIQUE (character_a_id, character_b_id)
);

COMMENT ON TABLE character_relationship IS 'Relationships between characters. Included in AI generation context.';
COMMENT ON COLUMN character_relationship.character_a_id IS 'Convention: character_a_id < character_b_id (lexicographic UUID)';
COMMENT ON COLUMN character_relationship.direction IS 'a_to_b: A->B only. b_to_a: B->A only. bidirectional: both.';

CREATE INDEX idx_relationship_project ON character_relationship (project_id);
CREATE INDEX idx_relationship_char_a ON character_relationship (character_a_id);
CREATE INDEX idx_relationship_char_b ON character_relationship (character_b_id);

CREATE TRIGGER trg_relationship_updated_at
    BEFORE UPDATE ON character_relationship
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- 9. draft
CREATE TABLE draft (
    id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    scene_id           UUID        NOT NULL REFERENCES scene(id) ON DELETE CASCADE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    version            INTEGER     NOT NULL,
    token_count_input  INTEGER,
    token_count_output INTEGER,
    content            TEXT        NOT NULL,
    char_count         INTEGER     GENERATED ALWAYS AS (char_length(content)) STORED,
    source             TEXT        NOT NULL CHECK (source IN ('ai_generation', 'ai_edit', 'manual')),
    edit_direction     TEXT,
    model              TEXT,
    provider           TEXT,
    cost_usd           NUMERIC(10, 6),
    CONSTRAINT uq_draft_scene_version UNIQUE (scene_id, version)
);

COMMENT ON TABLE draft IS 'Versioned prose content for scenes. Latest version = current draft.';
COMMENT ON COLUMN draft.char_count IS 'Auto-computed. char_length counts Unicode characters (Korean syllable = 1 char).';
COMMENT ON COLUMN draft.edit_direction IS 'User instruction for direction-based edits, e.g. "more tension"';
COMMENT ON COLUMN draft.version IS 'Monotonically increasing per scene.';

CREATE INDEX idx_draft_scene_version ON draft (scene_id, version DESC);

-- 10. scene_summary
CREATE TABLE scene_summary (
    scene_id      UUID        PRIMARY KEY REFERENCES scene(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    draft_version INTEGER     NOT NULL,
    summary_text  TEXT        NOT NULL,
    model         TEXT,
    CONSTRAINT chk_summary_length CHECK (char_length(summary_text) <= 2000)
);

COMMENT ON TABLE scene_summary IS 'Compressed AI summary of a scene draft. Used as context for subsequent scenes.';
COMMENT ON COLUMN scene_summary.draft_version IS 'Which draft version this summary is based on.';

CREATE TRIGGER trg_scene_summary_updated_at
    BEFORE UPDATE ON scene_summary
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- 11. generation_log
CREATE TABLE generation_log (
    id                 UUID              DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id            UUID              NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
    project_id         UUID              REFERENCES project(id) ON DELETE SET NULL,
    scene_id           UUID              REFERENCES scene(id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ       NOT NULL DEFAULT now(),
    duration_ms        INTEGER           NOT NULL,
    token_count_input  INTEGER           NOT NULL,
    token_count_output INTEGER           NOT NULL,
    generation_type    generation_type   NOT NULL,
    status             generation_status NOT NULL,
    model              TEXT              NOT NULL,
    provider           TEXT              NOT NULL,
    cost_usd           NUMERIC(10, 6)    NOT NULL,
    error_message      TEXT
);

COMMENT ON TABLE generation_log IS 'Every LLM API call. Append-only. For cost monitoring and analytics.';
COMMENT ON COLUMN generation_log.project_id IS 'SET NULL on project delete to preserve cost data';
COMMENT ON COLUMN generation_log.scene_id IS 'SET NULL on scene delete to preserve cost data';

CREATE INDEX idx_genlog_user_created ON generation_log (user_id, created_at DESC);
CREATE INDEX idx_genlog_project_created ON generation_log (project_id, created_at DESC)
    WHERE project_id IS NOT NULL;
CREATE INDEX idx_genlog_created_at ON generation_log USING BRIN (created_at);
