BEGIN;

SAVEPOINT before_tests;

DO $$
DECLARE
    uid int;
    lang varchar;
BEGIN
    uid := create_user('a@a', repeat('x', 64));
    lang := (SELECT language FROM "user" WHERE user_id = uid);

    IF lang IS NOT NULL THEN
        RAISE 'Expected language to be null for new user.';
    END IF;

    BEGIN
        UPDATE "user" SET language = '' WHERE user_id = uid;
        RAISE 'Should not be allowed to set empty string as language.';
    EXCEPTION WHEN others THEN
        IF NOT SQLERRM ~* 'regex' THEN
            RAISE 'Unexpected error mewssage %', SQLERRM;
        END IF;
   END;


    BEGIN
        UPDATE "user" SET language = '!' WHERE user_id = uid;
        RAISE 'Should not be allowed to set invalid language.';
    EXCEPTION WHEN others THEN
        IF NOT SQLERRM ~* 'regex' THEN
            RAISE 'Unexpected error mewssage %', SQLERRM;
        END IF;
   END;

    UPDATE "user" SET language = 'en-US' WHERE user_id = uid;
    UPDATE "user" SET language = 'no' WHERE user_id = uid;
    UPDATE "user" SET language = 'klingon' WHERE user_id = uid;
    UPDATE "user" SET language = 'es-ES' WHERE user_id = uid;
END; $$; ROLLBACK TO before_tests;

ROLLBACK;
