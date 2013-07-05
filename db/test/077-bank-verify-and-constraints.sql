BEGIN;

SAVEPOINT before_tests;

-- Successfully verify bank account
DO $$
DECLARE
    uid int;
    bid int;
    vat timestamptz;
BEGIN
    uid := create_user('a@a', repeat('a', 64));

    INSERT INTO bank_account (user_id, account_number, verify_code, verify_attempts)
    VALUES (uid, '12345678', 'ABCD', 0);

    bid := currval('bank_account_bank_account_id_seq');

    -- Admin starts the verification
    UPDATE bank_account
    SET verify_started_at = current_timestamp
    WHERE bank_account_id = bid;

    PERFORM verify_bank_account(uid, bid, 'ABCD'::varchar(4));

    vat := (SELECT verified_at FROM bank_account WHERE bank_account_id = bid);

    IF vat IS NULL THEN
        RAISE 'Failed to verify bank account.';
    END IF;
END; $$; ROLLBACK TO before_tests;

-- Successfully verify bank account after one failure
DO $$
DECLARE
    uid int;
    bid int;
    vat timestamptz;
BEGIN
    uid := create_user('a@a', repeat('a', 64));

    INSERT INTO bank_account (user_id, account_number, verify_code, verify_attempts)
    VALUES (uid, '12345678', 'ABCD', 0);

    bid := currval('bank_account_bank_account_id_seq');

    -- Admin starts the verification
    UPDATE bank_account
    SET verify_started_at = current_timestamp
    WHERE bank_account_id = bid;

    IF verify_bank_account(uid, bid, 'ABCQ'::varchar(4)) = TRUE THEN
        RAISE 'Failed';
    END IF;

    PERFORM verify_bank_account(uid, bid, 'ABCD'::varchar(4));

    vat := (SELECT verified_at FROM bank_account WHERE bank_account_id = bid);

    IF vat IS NULL THEN
        RAISE 'Failed to verify bank account.';
    END IF;
END; $$; ROLLBACK TO before_tests;

DO $$
DECLARE
    uid int;
    bid int;
BEGIN
    RAISE NOTICE 'Test: Unable to verify before started';
    uid := create_user('a@a', repeat('a', 64));

    INSERT INTO bank_account (user_id, account_number, verify_code, verify_attempts)
    VALUES (uid, '12345678', 'ABCD', 0);

    bid := currval('bank_account_bank_account_id_seq');

    BEGIN
        PERFORM verify_bank_account(uid, bid, 'ABCC'::varchar(4));
        RAISE 'Failed';
    EXCEPTION WHEN OTHERS THEN
        IF NOT SQLERRM LIKE '%started%' THEN
            RAISE 'Unexpected error %', SQLERRM;
        END IF;
    END;
END; $$; ROLLBACK TO before_tests;

-- Unable to try verification too many times
DO $$
DECLARE
    uid int;
    bid int;
    vat timestamptz;
BEGIN
    RAISE NOTICE 'Test: Unable to try verification too many times';

    uid := create_user('a@a', repeat('a', 64));

    INSERT INTO bank_account (user_id, account_number, verify_code, verify_attempts)
    VALUES (uid, '12345678', 'ABCD', 0);

    bid := currval('bank_account_bank_account_id_seq');

    -- Admin starts the verification
    UPDATE bank_account
    SET verify_started_at = current_timestamp
    WHERE bank_account_id = bid;

    IF verify_bank_account(uid, bid, 'ABCQ'::varchar(4)) = TRUE THEN
        RAISE 'Failed';
    END IF;

    -- 2
    IF verify_bank_account(uid, bid, 'ABCQ'::varchar(4)) = TRUE THEN
        RAISE 'Failed';
    END IF;

    -- 3
    IF verify_bank_account(uid, bid, 'ABCQ'::varchar(4)) = TRUE THEN
        RAISE 'Failed';
    END IF;

    -- 4
    BEGIN
        PERFORM verify_bank_account(uid, bid, 'ABCQ'::varchar(4));
        RAISE 'Failed';
    EXCEPTION WHEN OTHERS THEN
        IF NOT SQLERRM LIKE '%Too many%' THEN
            RAISE 'Unexpected error %', SQLERRM;
        END IF;
    END;
END; $$; ROLLBACK TO before_tests;

ROLLBACK;
