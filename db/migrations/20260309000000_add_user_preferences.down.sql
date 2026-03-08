ALTER TABLE user_account
    DROP COLUMN IF EXISTS theme_preference,
    DROP COLUMN IF EXISTS language_preference;
