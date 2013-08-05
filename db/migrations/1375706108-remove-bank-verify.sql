UPDATE "user" u
SET
    poa_approved_at = ba.verified_at,
    poi_approved_at = ba.verified_at
FROM bank_account ba
WHERE
    ba.user_id = u.user_id AND
    ba.verified_at IS NOT NULL;

ALTER TABLE bank_account
    DROP CONSTRAINT verify_code_length,
    DROP CONSTRAINT verify_attempts_max,
    DROP CONSTRAINT verification,
    DROP verify_started_at,
    DROP verified_at,
    DROP verify_code,
    DROP verify_attempts;

DROP FUNCTION verify_bank_account(integer, integer, character varying);
