-- New users should not be admin
BEGIN; DO $$ <<fn>>
DECLARE
    uid int;
    a boolean;
BEGIN
    uid := (SELECT create_user('test@fest.com', repeat('X', 64), FALSE));

    RAISE NOTICE 'user % created', uid;

    a := (SELECT admin FROM "user" WHERE user_id = uid);

    IF a IS NULL THEN
        RAISE 'admin is null';
    END IF;

    IF a = TRUE THEN
        RAISE 'admin is true by default';
    END IF;
END; $$; ROLLBACK;

-- admin can not be null
BEGIN; DO $$ <<fn>>
DECLARE
    uid int;
    a boolean;
BEGIN
    uid := (SELECT create_user('test@fest.com', repeat('X', 64), FALSE));

    BEGIN
        UPDATE "user" SET admin = NULL WHERE user_id = uid;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN;
    END;

    RAISE 'fail';
END; $$; ROLLBACK;
