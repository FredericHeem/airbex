BEGIN;

SAVEPOINT before_tests;

DO $$
DECLARE
    uid1 int;
    uid2 int;
    o1 "order"%ROWTYPE;
    o2 "order"%ROWTYPE;
    mid int;
BEGIN
    RAISE NOTICE '------------------------------------------------------';

    INSERT INTO currency (currency_id, scale, fiat)
    VALUES ('BTC', 8, false), ('NOK', 5, true);

    INSERT INTO market (base_currency_id, quote_currency_id, scale)
    VALUES ('BTC', 'NOK', 3)
    RETURNING market_id INTO mid;

    INSERT INTO account (type, currency_id)
    VALUES ('edge', 'BTC'), ('edge', 'NOK'), ('fee', 'BTC'), ('fee', 'NOK');

    uid1 := create_user('a@x', repeat('a', 64));
    uid2 := create_user('b@x', repeat('b', 64));

    PERFORM edge_credit(uid1, 'BTC', 10e8::bigint);
    PERFORM edge_credit(uid2, 'NOK', 8000e5::bigint);

    -- ASK 7 BTC @ 600 NOK (4200 NOK)
    INSERT INTO "order" (user_id, market_id, type, volume, price, fee_ratio)
    VALUES (uid1, mid, 'ask', 7e5, 600e3, 0.005)
    RETURNING * INTO o1;

    -- BID 7 BTC @ 700 NOK (4900 NOK)
    INSERT INTO "order" (user_id, market_id, type, volume, price, fee_ratio)
    VALUES (uid2, mid, 'bid', 7e5, 700e3, 0.005)
    RETURNING * INTO o2;

    IF ((SELECT balance FROM account WHERE account_id = user_currency_account(uid1, 'BTC')) = 2.965e8) IS NOT TRUE THEN
        RAISE 'Wrong user 1 BTC balance';
    END IF;

    IF ((SELECT balance FROM account WHERE account_id = user_currency_account(uid2, 'NOK')) = 3779e5) IS NOT TRUE THEN
        RAISE 'Wrong user 2 NOK balance';
    END IF;

    IF ((SELECT balance FROM account WHERE account_id = special_account('fee', 'BTC')) = 0.035e8) IS NOT TRUE THEN
        RAISE 'Wrong fee balance';
    END IF;

    IF ((SELECT balance FROM account WHERE account_id = special_account('fee', 'NOK')) = 21e5) IS NOT TRUE THEN
        RAISE 'Wrong fee balance';
    END IF;

    IF ((SELECT hold FROM account WHERE account_id = user_currency_account(uid1, 'BTC')) = 0) IS NOT TRUE THEN
        RAISE 'Wrong user 1 BTC held';
    END IF;

    IF ((SELECT hold FROM account WHERE account_id = user_currency_account(uid2, 'NOK')) = 0) IS NOT TRUE THEN
        RAISE 'Wrong user 2 NOK held';
    END IF;
END; $$ LANGUAGE plpgsql;

ROLLBACK TO before_tests;

DO $$
DECLARE
    uid1 int;
    uid2 int;
    o1 "order"%ROWTYPE;
    o2 "order"%ROWTYPE;
    mid int;
BEGIN
    RAISE NOTICE '------------------------------------------------------';

    INSERT INTO currency (currency_id, scale, fiat)
    VALUES ('BTC', 8, false), ('XRP', 6, false);

    INSERT INTO market (base_currency_id, quote_currency_id, scale)
    VALUES ('BTC', 'XRP', 3)
    RETURNING market_id INTO mid;

    INSERT INTO account (type, currency_id)

    VALUES ('edge', 'BTC'), ('edge', 'XRP'), ('fee', 'BTC'), ('fee', 'XRP');

    uid1 := create_user('a@x', repeat('a', 64));
    uid2 := create_user('b@x', repeat('b', 64));

    PERFORM edge_credit(uid1, 'XRP', 200000e6::bigint);
    PERFORM edge_credit(uid2, 'BTC', 5e8::bigint);

    -- BID 7.51399 BTC @ 15 250 XRP (114 588.3475 NOK)
    INSERT INTO "order" (user_id, market_id, type, volume, price, fee_ratio)
    VALUES (uid1, mid, 'bid', 7.51399e5, 15250e3, 0.005)
    RETURNING * INTO o1;

    -- ASK 1.96 BTC @ 1 15 250 (28 890 NOK)
    INSERT INTO "order" (user_id, market_id, type, volume, price, fee_ratio)
    VALUES (uid2, mid, 'ask', 1.96e5, 15250e3, 0.003)
    RETURNING * INTO o2;

    -- User 1 receives 1.96 BTC
    IF ((SELECT balance FROM account WHERE account_id = user_currency_account(uid1, 'BTC')) = 1.96e8) IS NOT TRUE THEN
        RAISE 'Wrong user 1 BTC balance';
    END IF;

    -- User 1 has 16 9960.55 XRP balance
    IF ((SELECT balance FROM account WHERE account_id = user_currency_account(uid1, 'XRP')) = 169960.55e6) IS NOT TRUE THEN
        RAISE 'Wrong user 1 XRP balance';
    END IF;

    IF ((SELECT balance FROM account WHERE account_id = user_currency_account(uid2, 'XRP')) = 29890e6) IS NOT TRUE THEN
        RAISE 'Wrong user 2 XRP balance';
    END IF;

    IF ((SELECT balance FROM account WHERE account_id = special_account('fee', 'BTC')) = 0.00588e8) IS NOT TRUE THEN
        RAISE 'Wrong fee balance';
    END IF;

    IF ((SELECT balance FROM account WHERE account_id = special_account('fee', 'XRP')) = 149.45e6) IS NOT TRUE THEN
        RAISE 'Wrong fee balance';
    END IF;

    IF ((SELECT hold FROM account WHERE account_id = user_currency_account(uid1, 'BTC')) = 0) IS NOT TRUE THEN
        RAISE 'Wrong user 1 BTC held';
    END IF;

    IF ((SELECT hold FROM account WHERE account_id = user_currency_account(uid2, 'XRP')) = 0) IS NOT TRUE THEN
        RAISE 'Wrong user 2 NOK held';
    END IF;

    -- There should only be a single hold left (for the bidder)
    IF (SELECT COUNT(*) FROM "hold") <> 1 THEN
        RAISE 'Unexpected hold count';
    END IF;

    IF ((SELECT hold FROM account WHERE account_id = user_currency_account(uid1, 'XRP')) = 85121.839238e6) IS NOT TRUE THEN
        RAISE 'Wrong user 1 XRP held: %',
            (SELECT hold FROM account WHERE account_id = user_currency_account(uid1, 'XRP')) / 1e6;
    END IF;
END; $$ LANGUAGE plpgsql;

ROLLBACK TO before_tests;

ROLLBACK;
