BEGIN;

SAVEPOINT before_tests;

DO $$
DECLARE
    uid int;
    tid int;
    t varchar := repeat('d', 64);
    a varchar := repeat('1', 30);
    amnt bigint := 123456789;
    actual bigint;
    atid int;
BEGIN
    INSERT INTO currency (currency_id, scale, fiat)
    VALUES ('BTC', 8, false);

    INSERT INTO account (currency_id, type)
    VALUES ('BTC', 'edge');

    uid := create_user('a@a', repeat('a', 64));

    INSERT INTO btc_deposit_address (address, account_id)
    VALUES (a, user_currency_account(uid, 'BTC'));

    tid := btc_credit(t, a, amnt::bigint);

    SELECT balance - hold
    INTO actual
    FROM account
    WHERE account_id = user_currency_account(uid, 'BTC');

    IF actual <> amnt THEN
        RAISE 'actual % <> amnt %', actual, amnt;
    END IF;

    SELECT transaction_id
    INTO atid
    FROM btc_credited
    WHERE txid = t;

    IF atid <> tid THEN
        RAISE 'atid % <> tid %', atid, tid;
    END IF;
END; $$;

ROLLBACK TO before_tests;

ROLLBACK;
