BEGIN; DO $$ <<fn>>
DECLARE
    uid int;
BEGIN
    uid := create_user('a@a', repeat('x', 64));

    BEGIN
        PERFORM reset_password_continue(repeat('a', 20));
        RAISE 'Should not be able to continue before begin.';
    EXCEPTION WHEN OTHERS THEN
    END;

    BEGIN
        PERFORM reset_password_begin('a@a', repeat('a', 20), '1234');
        RAISE 'Should not be able to begin with no phone.';
    EXCEPTION WHEN OTHERS THEN
    END;

    UPDATE "user"
    SET phone_number = '+123'
    WHERE user_id = uid;

    BEGIN
        PERFORM reset_password_begin('a@a', repeat('a', 20), '1234');
        RAISE 'Should not be able to begin with no phone.';
    EXCEPTION WHEN OTHERS THEN
    END;

    PERFORM reset_password_begin('a@a', repeat('a', 20), '1234');

    IF (SELECT reset_email_code FROM "user" WHERE user_id = uid) <> repeat('a', 20) THEN
        RAISE 'Email code not set correctly.';
    END IF;

    IF (SELECT reset_phone_code FROM "user" WHERE user_id = uid) <> '1234' THEN
        RAISE 'Phone code not set correctly.';
    END IF;

    BEGIN
        PERFORM reset_password_end('a@a', '1234', repeat('y', 64));
        RAISE 'Should not be able to end before continue.';
    EXCEPTION WHEN OTHERS THEN
    END;

    BEGIN
        PERFORM reset_password_continue(repeat('b', 20));
        RAISE 'Should not be able to continue.';
    EXCEPTION WHEN OTHERS THEN
    END;

    PERFORM reset_password_continue(repeat('a', 20));

    BEGIN
        PERFORM reset_password_continue(repeat('a', 20));
        RAISE 'Duplicate continue should not be allowed.';
    EXCEPTION WHEN OTHERS THEN
    END;

    PERFORM reset_password_end('a@a', '1234', repeat('y', 64));

    IF (SELECT api_key_id FROM api_key WHERE user_id = uid) <> repeat('y', 64) THEN
        RAISE 'Key was not changed as expected';
    END IF;
END; $$; ROLLBACK;
