CREATE EXTENSION IF NOT EXISTS hstore;

ALTER TABLE "user"
    ADD COLUMN notify_email hstore NOT NULL DEFAULT(''::hstore);

CREATE TABLE settings (
    notify_email_default hstore,
    notify_user_visible hstore
);

CREATE UNIQUE INDEX settings_single_ix ON settings ((1));

INSERT INTO settings DEFAULT VALUES;

UPDATE settings
SET
    notify_email_default = (
        'FillOrder => true'
    )::hstore,
    notify_user_visible = (
        ''
    )
    ::hstore;
