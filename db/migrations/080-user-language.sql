ALTER TABLE "user"
    ADD COLUMN language varchar(8)
        CONSTRAINT language_regex CHECK (language IS NULL OR language ~* '^[a-z0-9]{1,8}(-[a-z0-9]{1,8})?');
