
CREATE DOMAIN email_verify_code
  AS character varying(20)
  CONSTRAINT email_verify_code_check CHECK (VALUE::text ~* '^[0-9a-f]{20}$'::text);

ALTER TABLE "user"
    ADD COLUMN email_verify_code email_verify_code,
    ADD COLUMN email_verify_code_issued_at timestamptz,
    ADD COLUMN email_verified_at timestamptz;

CREATE OR REPLACE FUNCTION create_email_verify_code(uid integer, code email_verify_code)
  RETURNS void AS
$BODY$
DECLARE
    u "user"%ROWTYPE;
BEGIN
    IF code IS NULL THEN
        RAISE 'code is null';
    END IF;

    SELECT * INTO u FROM "user" WHERE user_id = uid;

    -- Does the user exist?
    IF u IS NULL THEN
        RAISE 'User not found', uid;
    END IF;

    -- Has the user already verified his email?
    IF u.email_verified_at IS NOT NULL THEN
        RAISE 'E-mail already verified';
    END IF;

    -- Has the user been issued a code in the last day?
    IF u.email_verify_code_issued_at IS NOT NULL AND
        current_timestamp - u.email_verify_code_issued_at < '1 day'::interval
    THEN
        RAISE 'E-mail verification code issued less than one day ago.';
    END IF;

    UPDATE "user"
    SET
        email_verify_code = code,
        email_verify_code_issued_at = current_timestamp
    WHERE user_id = uid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE;

CREATE FUNCTION verify_email (
    code email_verify_code
) RETURNS void AS $$
BEGIN
    UPDATE "user"
    SET
        email_verify_code = NULL,
        email_verify_code_issued_at = NULL,
        email_verified_at = current_timestamp
    WHERE
        email_verify_code = code AND
        current_timestamp - email_verify_code_issued_at < '30 minutes'::interval;

    IF NOT FOUND THEN
        RAISE 'Code not found or expired';
    END IF;
END; $$ LANGUAGE plpgsql;
