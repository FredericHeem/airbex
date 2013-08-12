DROP FUNCTION reset_password_end(character varying, phone_number_verify_code, character varying);

CREATE OR REPLACE FUNCTION reset_password_end(e character varying, pc phone_number_verify_code, k character varying)
  RETURNS boolean AS
$BODY$
DECLARE
    u "user"%ROWTYPE;
    ok varchar(64);
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

    IF U.reset_phone_code IS NULL THEN
        RAISE 'Not in a reset.';
    END IF;

    IF u.reset_phone_code <> pc THEN
        UPDATE "user"
        SET reset_phone_code = NULL
        WHERE user_id = u.user_id;

        RETURN false;
    END IF;

    ok := (SELECT api_key_id FROM api_key WHERE user_id = u.user_id AND "primary" = TRUE);

    IF ok IS NULL THEN
        RAISE 'Failed to find the old api key.';
    END IF;

    PERFORM replace_api_key(ok, k);

    UPDATE "user"
    SET
        reset_phone_code = NULL,
        two_factor = NULL
    WHERE
        user_id = u.user_id;

    RETURN true;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
