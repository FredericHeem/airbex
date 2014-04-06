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

    -- Does the user have a phone?
    IF u.phone_number IS NULL THEN
        RAISE 'User does not have a phone number.';
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
