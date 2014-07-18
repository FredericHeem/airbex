CREATE OR REPLACE FUNCTION reset_password_begin(e character varying, ec email_verify_code, pc phone_number_verify_code)
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
  LANGUAGE plpgsql VOLATILE
  COST 100;

CREATE OR REPLACE FUNCTION reset_password_end(e character varying, pc phone_number_verify_code, k character varying)
  RETURNS boolean AS
$BODY$
DECLARE
    u "user"%ROWTYPE;
BEGIN
    SELECT * INTO u FROM "user" WHERE email_lower = lower(e);

    IF u IS NULL THEN
        RAISE NOTICE 'User not found';
    END IF;

    IF current_timestamp - u.reset_started_at > '30 minutes'::interval THEN
        RAISE 'Codes have expired (30 min).';
    END IF;

    IF U.reset_email_code IS NOT NULL THEN
        RAISE 'Must continue first.';
    END IF;

    IF u.phone_number IS NOT NULL THEN
        IF U.reset_phone_code IS NULL THEN
            RAISE 'Not in a reset.';
        END IF;
    
        IF u.reset_phone_code <> pc THEN
            UPDATE "user"
            SET reset_phone_code = NULL
            WHERE user_id = u.user_id;
    
            RETURN false;
        END IF;
    END IF;

    UPDATE api_key
    SET api_key_id = k
    WHERE
        user_id = u.user_id AND
        "primary" = TRUE;

    IF NOT FOUND THEN
        RAISE 'Failed to replace api key.';
    END IF;

    UPDATE "user"
    SET
        reset_phone_code = NULL
        -- two_factor = NULL
    WHERE
        user_id = u.user_id;

    RETURN true;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
