ALTER TABLE bank_account
    ADD COLUMN verified_at timestamptz,
    ADD COLUMN verify_code varchar(4),
    ADD COLUMN verify_attempts int DEFAULT(0),
    ADD COLUMN verify_started_at timestamptz;

UPDATE bank_account
SET
    verify_attempts = NULL,
    verify_started_at = current_timestamp,
    verified_at = current_timestamp;

ALTER TABLE bank_account
    ALTER COLUMN verified_at DROP DEFAULT;

ALTER TABLE bank_account
    ADD CONSTRAINT verify_code_length CHECK (verify_code IS NULL OR length(verify_code) = 4),
    ADD CONSTRAINT verify_attempts_max CHECK (verify_attempts IS NULL OR verify_attempts <= 3),
    ADD CONSTRAINT verification CHECK (
        (
            verified_at IS NULL AND
            verify_code IS NOT NULL AND
            verify_attempts IS NOT NULL
        ) OR
        (
            verified_at IS NOT NULL AND
            verify_code IS NULL AND
            verify_attempts IS NULL AND
            verify_started_at IS NOT NULL
        )
    );

CREATE UNIQUE INDEX bank_account_norway_ix
    ON bank_account (account_number) WHERE (
        account_number IS NOT NULL AND
        iban IS NULL AND
        swiftbic IS NULL AND
        routing_number IS NULL
    );

CREATE UNIQUE INDEX bank_account_iban_ix
    ON bank_account (iban) WHERE (
        account_number IS NULL AND
        iban IS NOT NULL AND
        swiftbic IS NULL AND
        routing_number IS NULL
    );

CREATE UNIQUE INDEX bank_account_swiftbic_ix
    ON bank_account (account_number, swiftbic, routing_number) WHERE (
        account_number IS NOT NULL AND
        swiftbic IS NOT NULL AND
        iban IS NULL
    );

CREATE OR REPLACE FUNCTION verify_bank_account (
    uid int,
    bid int,
    code varchar(4)
) RETURNS boolean AS $$
DECLARE
    correct_code varchar(4);
    attempts int;
BEGIN
    SELECT verify_code, verify_attempts
    INTO correct_code, attempts
    FROM bank_account
    WHERE
        bank_account_id = bid AND
        user_id = uid AND
        verify_started_at IS NOT NULL;

    IF NOT FOUND THEN
        RAISE 'Bank account not found, does not belong to user or verification has not started.';
    END IF;

    IF correct_code IS NULL THEN
        RAISE 'Bank account is already verified.';
    END IF;

    RAISE NOTICE 'Attempts %', attempts;

    IF attempts >= 3 THEN
        RAISE 'Too many failed verification attempts.';
    END IF;

    IF lower(correct_code) = lower(code) THEN
        UPDATE bank_account
        SET
            verified_at = current_timestamp,
            verify_code = NULL,
            verify_attempts = NULL
        WHERE
            bank_account_id = bid;

        IF NOT FOUND THEN
            RAISE 'Failed to set bank account as verified.';
        END IF;

        RETURN TRUE;
    END IF;

    UPDATE bank_account
    SET verify_attempts = verify_attempts + 1
    WHERE bank_account_id = bid;

    IF NOT FOUND THEN
        RAISE 'Failed to increase verify_attempts.';
    END IF;

    RETURN false;
END; $$ LANGUAGE plpgsql;

-- Left over from some migration
DROP FUNCTION IF EXISTS bank_credit(integer, currency_id, bigint, integer, character varying);

CREATE OR REPLACE FUNCTION withdraw_bank(baid integer, cid currency_id, amnt bigint)
  RETURNS integer AS
$BODY$ <<fn>>
DECLARE
    aid int;
    hid int;
    rid int;
    uid int;
BEGIN
    SELECT user_id
    INTO uid
    FROM bank_account
    WHERE
        bank_account_id = baid AND
        verified_at IS NOT NULL;

    IF NOT FOUND THEN
        RAISE 'Bank account not found or not verified.';
    END IF;

    aid := user_currency_account(uid, cid);

    INSERT INTO hold (account_id, amount)
    VALUES (aid, amnt);

    hid := currval('hold_hold_id_seq');

    INSERT INTO withdraw_request(method, hold_id, account_id, amount)
    VALUES ('bank', hid, aid, amnt);

    rid := currval('withdraw_request_request_id_seq');

    INSERT INTO bank_withdraw_request(request_id, bank_account_id)
    VALUES (rid, baid);

    RETURN rid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
