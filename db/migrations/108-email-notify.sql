ALTER TABLE settings
    ADD COLUMN notify_tip int;

UPDATE settings
    SET notify_tip = (
        SELECT max(activity_id)
        FROM activity
    );

CREATE VIEW pending_email_notify AS
SELECT
    a.*,
    u.language,
    u.email,
    u.first_name
FROM
    activity a
        INNER JOIN "user" u ON u.user_id = a.user_id,
    settings s
WHERE
    a.activity_id > s.notify_tip AND
    u.email_verified_at IS NOT NULL AND
    ((s.notify_email_default || u.notify_email || s.notify_user_visible) -> a.type)::bool IS TRUE;
