DROP FUNCTION verify_email(email_verify_code);

CREATE OR REPLACE FUNCTION verify_email(code email_verify_code)
  RETURNS int AS
$BODY$
DECLARE
    uid int;
BEGIN
    UPDATE "user"
    SET
        email_verify_code = NULL,
        email_verify_code_issued_at = NULL,
        email_verified_at = current_timestamp
    WHERE
        email_verify_code = code AND
        current_timestamp - email_verify_code_issued_at < '30 minutes'::interval
    RETURNING
        user_id INTO uid;

    RETURN uid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
