ALTER TABLE user_account
    ADD COLUMN theme_preference TEXT NOT NULL DEFAULT 'system'
        CONSTRAINT chk_user_theme CHECK (theme_preference IN ('system', 'light', 'dark')),
    ADD COLUMN language_preference TEXT NOT NULL DEFAULT 'ko'
        CONSTRAINT chk_user_language CHECK (language_preference IN ('ko', 'en'));
