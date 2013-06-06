-- TODO: Should split these up

BEGIN;

DO $$ <<fn>>
DECLARE
    n varchar := '+12345678';
    c phone_number_verify_code;
    u1 int := create_user('bob@gmail.com', repeat('x', 64), FALSE);
    u2 int := create_user('alice@gmail.com', repeat('y', 64), FALSE);
BEGIN
    c := create_phone_number_verify_code(n, u1);
    RAISE NOTICE 'Verify code %', c;

    IF (SELECT phone_number_verify_attempts FROM "user" WHERE user_id = u1) <> 1 THEN
        RAISE 'Attempts should be 1';
    END IF;

    IF (SELECT phone_number_verify_attempt_at FROM "user" WHERE user_id = u1) IS NULL THEN
        RAISE 'Attempt_at should be set';
    END IF;

    IF (SELECT phone_number_verify_code FROM "user" WHERE user_id = u1) <> c THEN
        RAISE 'Code was not set correctly';
    END IF;

    IF (SELECT phone_number FROM "user" WHERE user_id = u1) IS NOT NULL THEN
        RAISE 'phone_number should not be set';
    END IF;

    IF verify_phone(u1, c) <> TRUE THEN
        RAISE 'Expected verification to succeed';
    END IF;
END; $$;

DO $$ <<fn>>
DECLARE
    n varchar := '+123456789';
    c phone_number_verify_code;
    u int := create_user('bob2@gmail.com', repeat('a', 64), FALSE);
BEGIN
    c := create_phone_number_verify_code(n, u);
    RAISE NOTICE 'Verify code %', c;

    IF verify_phone(u, '1234') <> FALSE THEN
        RAISE 'Expected verification to fail';
    END IF;
END; $$;

DO $$ <<fn>>
DECLARE
    n varchar := '+12345678910';
    c phone_number_verify_code;
    u int := create_user('bob3@gmail.com', repeat('b', 64), FALSE);
BEGIN
    c := create_phone_number_verify_code(n, u);
    RAISE NOTICE 'Verify code %', c;

    IF verify_phone(u, '1234') <> FALSE THEN
        RAISE 'Expected verification to fail';
    END IF;

    IF (SELECT phone_number FROM "user" WHERE user_id = u) IS NOT NULL THEN
        RAISE 'Phone number should not be set';
    END IF;

    BEGIN
        PERFORM create_phone_number_verify_code(n, u);
        RAISE 'Should not be able to retry so fast';
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'Failed to retry, good.';
    END;

    -- 10 minutes passed, should be allowed to retry

    UPDATE "user"
    SET phone_number_verify_attempt_at = current_timestamp - '+10 minutes'::interval
    WHERE user_id = u;

    c := create_phone_number_verify_code(n, u);

    IF verify_phone(u, c) <> TRUE THEN
        RAISE 'Expected verification to succeed.';
    END IF;

    IF (SELECT phone_number FROM "user" WHERE user_id = u) <> n THEN
        RAISE 'Phone number was not set';
    END IF;

    IF (SELECT phone_number_unverified FROM "user" WHERE user_id = u) IS NOT NULL THEN
        RAISE 'Unverified was not unset';
    END IF;
END; $$;

ROLLBACK;
