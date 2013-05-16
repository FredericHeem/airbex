CREATE DOMAIN phone_number varchar(14)
    CHECK (VALUE ~* '^\+\d{2,16}$');

CREATE DOMAIN phone_number_verify_code varchar(4)
    CHECK (VALUE ~* '^\d{4}$');

ALTER TABLE "user"
    ADD COLUMN phone_number phone_number,
    ADD COLUMN phone_number_verify_code phone_number_verify_code,
    ADD COLUMN phone_number_verify_attempts int,
    ADD COLUMN phone_number_verify_attempt_at timestamptz,
    ADD COLUMN phone_number_unverified phone_number;

CREATE OR REPLACE FUNCTION create_phone_number_verify_code (
) RETURNS varchar AS $$
    SELECT floor(random() * 10)::varchar || floor(random() * 10)::varchar ||
        floor(random() * 10)::varchar || floor(random() * 10)::varchar;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION create_phone_number_verify_code (
    pn phone_number,
    uid int
) RETURNS phone_number_verify_code AS $$
DECLARE
    attempts int;
    recent_attempt timestamptz;
    lockout interval;
    code phone_number_verify_code;
BEGIN
    -- does user already have a verified phone number?
    IF (SELECT phone_number FROM "user" WHERE user_id = uid) IS NOT NULL THEN
        RAISE 'User already has a verified phone number.';
    END IF;

    -- does another user have that phone number verified?
    IF EXISTS (SELECT 1 FROM "user" WHERE phone_number = pn) THEN
        RAISE 'Another user has already verified that phone number.';
    END IF;

    SELECT
        phone_number_verify_attempts,
        phone_number_verify_attempt_at
    INTO
        attempts,
        recent_attempt
    FROM "user"
    WHERE user_id = uid;

    IF attempts IS NULL THEN
        attempts := 0;
    END IF;

    lockout := CASE attempts
        WHEN 0 THEN NULL
        WHEN 1 THEN '1 minute'::interval
        WHEN 2 THEN '5 minutes'::interval
        WHEN 3 THEN '1 day'::interval
        ELSE '7 days'::interval
    END;

    RAISE NOTICE 'Lockout is %', lockout;
    RAISE NOTICE 'Recent attempt is %', recent_attempt;
    RAISE NOTICE 'Delta is %', current_timestamp - recent_attempt;
    RAISE NOTICE 'Recent attempt at is %', recent_attempt;

    IF lockout IS NOT NULL AND current_timestamp - recent_attempt < lockout THEN
        RAISE 'User is locked out for %', current_timestamp - recent_attempt;
    END IF;

    code := create_phone_number_verify_code();

    UPDATE "user"
    SET
        phone_number_verify_attempts = attempts + 1,
        phone_number_unverified = pn,
        phone_number_verify_attempt_at = current_timestamp,
        phone_number_verify_code = code
    WHERE
        user_id = uid;

    RETURN code;
END; $$ LANGUAGE plpgsql VOLATILE;

CREATE FUNCTION verify_phone (
    uid int,
    code phone_number_verify_code
) RETURNS boolean AS $$
BEGIN
    IF (SELECT phone_number_verify_code FROM "user" WHERE user_id = uid) <> code THEN
        UPDATE "user"
        SET
            phone_number_verify_code = NULL,
            phone_number_unverified = NULL
        WHERE
            user_id = uid;

        RETURN FALSE;
    END IF;

    UPDATE "user"
    SET
        phone_number = phone_number_unverified,
        phone_number_unverified = NULL,
        phone_number_verify_attempts = NULL,
        phone_number_verify_attempt_at = NULL,
        phone_number_verify_code = NULL
    WHERE user_id = uid;

    IF NOT FOUND THEN
        RAISE 'Failed to set phone number, not found.';
    END IF;

    RETURN TRUE;
END; $$ LANGUAGE plpgsql VOLATILE;
