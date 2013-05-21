BEGIN; DO $$ <<fn>>
DECLARE
    uid int;
BEGIN
    uid := (SELECT create_user('b@c', repeat('a', 64)));

    UPDATE "user"
    SET
        first_name = 'derpson',
        last_name = 'herpson',
        address = 'smerpson',
        postal_area = 'foo',
        city = 'derp',
        country = 'NO'
    WHERE
        user_id = uid;
END; $$; ROLLBACK;
