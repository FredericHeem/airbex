BEGIN;

SAVEPOINT before_tests;

-- Must be twelve characters.
DO $$
DECLARE
    vid voucher_id;
BEGIN
    BEGIN
        vid := 'a';
        RAISE 'Fail';
    EXCEPTION WHEN others THEN
    END;

    vid := repeat('a', 12);
END; $$; ROLLBACK TO before_tests;

-- Can transfer to other.
DO $$
DECLARE
    vid voucher_id;
    fuid int;
    tuid int;
    favail bigint;
    tavail bigint;
BEGIN
    INSERT INTO currency (currency_id, scale, fiat)
    VALUES ('BTC', 8, false);

    INSERT INTO account (currency_id, type)
    VALUES ('BTC', 'edge');

    vid := repeat('a', 12);
    fuid := create_user('a@a', repeat('a', 64));
    tuid := create_user('b@b', repeat('b', 64));
    PERFORM edge_credit(fuid, 'BTC', 10e8::bigint);

    PERFORM create_voucher(repeat('a', 12), fuid, 'BTC', 10e8::bigint);
    PERFORM redeem_voucher(repeat('a', 12), tuid);

    favail := (
        SELECT balance - "hold"
        FROM account
        WHERE account_id = user_currency_account(fuid, 'BTC')
    );

    tavail := (
        SELECT balance - "hold"
        FROM account
        WHERE account_id = user_currency_account(tuid, 'BTC')
    );

    IF favail <> 0 THEN
        RAISE 'Incorrect from-user available %', favail;
    END IF;

    IF tavail <> 10e8 THEN
        RAISE 'Incorrect to-user available %', tavail;
    END IF;
END; $$; ROLLBACK TO before_tests;

-- Can transfer to self.
DO $$
DECLARE
    vid voucher_id;
    uid int;
    avail bigint;
BEGIN
    INSERT INTO currency (currency_id, scale, fiat)
    VALUES ('BTC', 8, false);

    INSERT INTO account (currency_id, type)
    VALUES ('BTC', 'edge');

    vid := repeat('a', 12);
    uid := create_user('a@a', repeat('a', 64));
    PERFORM edge_credit(uid, 'BTC', 10e8::bigint);

    PERFORM create_voucher(repeat('a', 12), uid, 'BTC', 10e8::bigint);

    avail := (
        SELECT balance - "hold"
        FROM account
        WHERE account_id = user_currency_account(uid, 'BTC')
    );

    IF avail <> 0 THEN
        RAISE 'Incorrect from-user available %', avail;
    END IF;
END; $$; ROLLBACK TO before_tests;

-- Cannot redeem twice
DO $$
DECLARE
    vid voucher_id;
    uid int;
    avail bigint;
BEGIN
    INSERT INTO currency (currency_id, scale, fiat)
    VALUES ('BTC', 8, false);

    INSERT INTO account (currency_id, type)
    VALUES ('BTC', 'edge');

    vid := repeat('a', 12);
    uid := create_user('a@a', repeat('a', 64));
    PERFORM edge_credit(uid, 'BTC', 10e8::bigint);

    PERFORM create_voucher(repeat('a', 12), uid, 'BTC', 10e8::bigint);

    BEGIN
        PERFORM create_voucher(repeat('a', 12), uid, 'BTC', 10e8::bigint);
        RAISE 'Fail';
    EXCEPTION WHEN others THEN
        IF SQLERRM ~* '/not found/i' THEN
            RAISE 'Unexpected exception %', SQLERRM;
        END IF;
    END;
END; $$; ROLLBACK TO before_tests;

ROLLBACK;
