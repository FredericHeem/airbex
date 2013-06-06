BEGIN; DO $$ <<fn>>
DECLARE
    uid int;
    p boolean;
BEGIN
    uid := create_user('t@t', repeat('x', 64), FALSE);
    PERFORM replace_api_key(repeat('x', 64), repeat('y', 64));

    p := (SELECT "primary" FROM api_key WHERE api_key_id = repeat('y', 64));

    IF p <> TRUE THEN
        RAISE 'New API was not made primary.';
    END IF;
END; $$; ROLLBACK;
