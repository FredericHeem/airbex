CREATE OR REPLACE FUNCTION verify_phone(uid integer, code phone_number_verify_code)
  RETURNS boolean AS
$BODY$
DECLARE
    correct phone_number_verify_code;
BEGIN
    SELECT phone_number_verify_code
    INTO correct
    FROM "user"
    WHERE user_id = uid;

    IF NOT FOUND THEN
        RAISE 'User % not found', uid;
    END IF;

    IF correct IS NULL THEN
        RAISE 'User has not started phone verification';
    END IF;

    IF correct <> code THEN
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
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
