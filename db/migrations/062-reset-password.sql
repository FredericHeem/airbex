ALTER TABLE "user"
    ADD COLUMN reset_email_code email_verify_code,
    ADD COLUMN reset_started_at timestamp with time zone,
    ADD COLUMN reset_phone_code phone_number_verify_code;

CREATE TYPE reset_password_continue_result AS (
    phone_number phone_number,
    code phone_number_verify_code
);

CREATE OR REPLACE FUNCTION reset_password_continue (
    ec email_verify_code
)
  RETURNS reset_password_continue_result AS
$BODY$
DECLARE
    u "user"%ROWTYPE;
    result reset_password_continue_result;
BEGIN
    SELECT * INTO u FROM "user"
    WHERE reset_email_code = ec;

    IF u IS NULL THEN
        RAISE 'User not found or code already used';
    END IF;

    IF u.reset_started_at IS NULL OR u.reset_email_code IS NULL THEN
        RAISE 'Nothing to continue';
    END IF;

    IF current_timestamp - u.reset_started_at > '30 minutes'::interval THEN
        RAISE 'Codes have expired';
    END IF;

    UPDATE "user"
    SET
        reset_email_code = NULL
    WHERE
        user_id = u.user_id;

    IF NOT FOUND THEN
        RAISE 'Failed to update user.';
    END IF;

    SELECT u.phone_number, u.reset_phone_code
    INTO result.phone_number, result.code;

    RETURN result;
END; $BODY$
  LANGUAGE plpgsql VOLATILE;

-- At this point the email code is null and the phone code is not null
CREATE OR REPLACE FUNCTION reset_password_end (
    e varchar(50),
    pc phone_number_verify_code,
    k varchar(64)
)
RETURNS void AS
$BODY$
DECLARE
    u "user"%ROWTYPE;
    ok varchar(64);
BEGIN
    SELECT * INTO u FROM "user" WHERE email_lower = lower(e);

    IF u IS NULL THEN
        RAISE 'User not found';
    END IF;

    IF current_timestamp - u.reset_started_at > '30 minutes'::interval THEN
        RAISE 'Codes have expired (30 min).';
    END IF;

    IF U.reset_email_code IS NOT NULL THEN
        RAISE 'Must continue first.';
    END IF;

    IF U.reset_phone_code IS NULL THEN
        RAISE 'Not in a reset.';
    END IF;

    IF u.reset_phone_code <> pc THEN
        UPDATE "user"
        SET reset_phone_code = NULL
        WHERE user_id = u.user_id;

        RAISE 'Wrong phone code. Reset has failed.';
    END IF;

    ok := (SELECT api_key_id FROM api_key WHERE user_id = u.user_id AND "primary" = TRUE);

    IF ok IS NULL THEN
        RAISE 'Failed to find the old api key.';
    END IF;

    PERFORM replace_api_key(ok, k);

    UPDATE "user"
    SET
        reset_phone_code = NULL
    WHERE
        user_id = u.user_id;

    IF NOT FOUND THEN
        RAISE 'Failed to update user.';
    END IF;
END; $BODY$
  LANGUAGE plpgsql VOLATILE;

CREATE OR REPLACE FUNCTION replace_api_key(old_key character varying, new_key character varying)
  RETURNS void AS
$BODY$ <<fn>>
DECLARE
    user_id int := (
        SELECT a.user_id
        FROM api_key a
        WHERE
            api_key_id = old_key AND
            "primary" = TRUE
    );
BEGIN
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'The specified old_key was not found';
    END IF;

    IF old_key = new_key THEN
        RAISE EXCEPTION 'old_key must not equal new_key';
    END IF;

    DELETE FROM api_key WHERE api_key_id = old_key;

    INSERT INTO api_key (api_key_id, user_id, "primary")
    VALUES (new_key, fn.user_id, TRUE);
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;


CREATE OR REPLACE FUNCTION reset_password_begin (
    e varchar(50),
    ec email_verify_code,
    pc phone_number_verify_code
)
  RETURNS void AS
$BODY$
DECLARE
    u "user"%ROWTYPE;
BEGIN
    IF ec IS NULL THEN
        RAISE 'email code is null';
    END IF;

    IF pc IS NULL THEN
        RAISE 'phone code is null';
    END IF;

    SELECT * INTO u FROM "user" WHERE email_lower = lower(e);

    IF u IS NULL THEN
        RAISE 'User not found';
    END IF;

    -- Does the user have a phone?
    IF u.phone_number IS NULL THEN
        RAISE 'User does not have a phone number.';
    END IF;

    -- Is the email of the user verified?
    IF u.email_verified_at IS NULL THEN
        RAISE 'User does not have a verified email.';
    END IF;

    -- Does the user have another recent reset attempt?
    IF u.reset_started_at IS NOT NULL AND
        current_timestamp - u.reset_started_at < '1 day'::interval
    THEN
        RAISE 'User has a recent reset attempt.';
    END IF;

    UPDATE "user"
    SET
      reset_email_code = ec,
      reset_started_at = current_timestamp,
      reset_phone_code = pc
    WHERE user_id = u.user_id;
END; $BODY$
  LANGUAGE plpgsql VOLATILE;
