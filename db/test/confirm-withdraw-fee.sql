BEGIN;

SAVEPOINT before_tests;

-- Withdraw 1000 NOK and pay 10 NOK in fee
DO $$
DECLARE
    uid int;
    baid int;
    wr int;
    eub bigint := 500e5::bigint;
    efb bigint := 10e5::bigint;
    eeb bigint := (-1500e5 + 990e5)::bigint;
    aub bigint;
    afb bigint;
    aeb bigint;
BEGIN
    uid := create_user('a@a', repeat('a', 64));
    PERFORM edge_credit(uid, 'NOK', 1500e5::bigint);

    INSERT INTO bank_account (account_number, user_id)
    VALUES ('1234', uid)
    RETURNING bank_account_id
    INTO baid;

    wr := withdraw_bank(baid, 'NOK', 1000e5::bigint);

    PERFORM confirm_withdraw(wr, 10e5::bigint);

    SELECT balance
    FROM account
    WHERE account_id = user_currency_account(uid, 'NOK')
    INTO aub;

    SELECT balance
    FROM account
    WHERE account_id = special_account('fee', 'NOK')
    INTO afb;

    SELECT balance
    FROM account
    WHERE account_id = special_account('edge', 'NOK')
    INTO aeb;

    IF aub <> eub THEN
        RAISE 'Actual user balance % <> expected %', aub, eub;
    END IF;

    IF afb <> efb THEN
        RAISE 'Actual fee balance % <> expected %', afb, efb;
    END IF;

    IF aeb <> eeb THEN
        RAISE 'Actual edge balance % <> expected %', aeb, eeb;
    END IF;
END; $$;

ROLLBACK TO before_tests;

ROLLBACK;
