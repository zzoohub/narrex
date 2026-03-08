-- Narrex: Rollback Initial Schema (Phase 1)
-- Reverse order of creation to respect FK dependencies

DROP TABLE IF EXISTS generation_log;
DROP TABLE IF EXISTS scene_summary;
DROP TABLE IF EXISTS draft;
DROP TABLE IF EXISTS character_relationship;
DROP TABLE IF EXISTS scene_character;
DROP TABLE IF EXISTS character;
DROP TABLE IF EXISTS scene_connection;
DROP TABLE IF EXISTS scene;
DROP TABLE IF EXISTS track;
DROP TABLE IF EXISTS project;
DROP TABLE IF EXISTS user_account;

DROP FUNCTION IF EXISTS fn_set_updated_at();

DROP TYPE IF EXISTS generation_status;
DROP TYPE IF EXISTS generation_type;
DROP TYPE IF EXISTS pov_type;
DROP TYPE IF EXISTS relationship_direction;
DROP TYPE IF EXISTS relationship_visual;
DROP TYPE IF EXISTS connection_type;
DROP TYPE IF EXISTS scene_status;

DROP EXTENSION IF EXISTS pg_stat_statements;
