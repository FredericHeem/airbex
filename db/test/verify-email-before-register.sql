BEGIN;

SAVEPOINT before_tests;

-- Successful registration
DO $$
DECLARE
    uid int;
BEGIN
    INSERT INTO user_pending (email, api_key_id, code)
    VALUES ('a@a', repeat('a', 64), repeat('a', 20));

    uid := create_user_end(repeat('a', 20));

    IF NOT EXISTS (SELECT 1 FROM "user" WHERE user_id = uid AND email = 'a@a') THEN
        RAISE 'User not found';
    END IF;

    IF EXISTS (SELECT 1 FROM user_pending WHERE email = 'a@a') THEN
        RAISE 'User was not removed from pending';
    END IF;
END; $$ LANGUAGE plpgsql;

ROLLBACK TO before_tests;

-- Duplicate email (before)
DO $$
BEGIN
    INSERT INTO user_pending (email, api_key_id, code)
    VALUES ('a@a', repeat('a', 64), repeat('a', 20));

    BEGIN
        INSERT INTO user_pending (email, api_key_id, code)
        VALUES ('a@a', repeat('b', 64), repeat('b', 20));
    EXCEPTION WHEN others THEN
        IF SQLSTATE = '23505' THEN
            RETURN;
        END IF;
    END;

    RAISE 'Fell through';
END; $$ LANGUAGE plpgsql;

ROLLBACK TO before_tests;

-- Duplicate email (after)
DO $$
DECLARE
    uid int;
BEGIN
    INSERT INTO user_pending (email, api_key_id, code)
    VALUES ('a@a', repeat('a', 64), repeat('a', 20));

    PERFORM create_user_end(repeat('a', 20));

    BEGIN
        INSERT INTO user_pending (email, api_key_id, code)
        VALUES ('a@a', repeat('b', 64), repeat('b', 20));
    EXCEPTION WHEN others THEN
        IF SQLERRM = 'Email already in use' THEN
            RETURN;
        END IF;
    END;

    RAISE 'Fell through';
END; $$ LANGUAGE plpgsql;

ROLLBACK TO before_tests;

ROLLBACK;
