SAVEPOINT before_test;

-- Test: Create market order that cannot be entirely matched.
DO $$ <<fn>>
DECLARE
    mid int; -- BTCNOK
    ask_oid int;
    ask_uid int;
    bid_uid int;
BEGIN
    SELECT market_id INTO mid FROM market WHERE base_currency_id = 'BTC'
        AND quote_currency_id = 'NOK';

    ask_uid := create_user('a@a', repeat('a', 64), false);
    bid_uid := create_user('b@b', repeat('b', 64), false);

    PERFORM edge_credit(ask_uid, 'BTC', 10e8::bigint);
    PERFORM edge_credit(bid_uid, 'NOK', 5000e5::bigint);

    -- ASK 1 BTC @ 800 NOK (800 NOK)
    ask_oid := create_order(ask_uid, mid, 1, 800::numeric, 1::numeric);

    -- BID 7.15 @ ? NOK (? NOK)
    BEGIN
        PERFORM create_order(bid_uid, mid, 0, NULL, 7.15::numeric);
        RAISE 'Fail';
    EXCEPTION WHEN others THEN
        IF NOT SQLERRM ~* 'could not fill entire' THEN
            RAISE 'Unexpected exception %', SQLERRM;
        END IF;
    END;
END; $$; ROLLBACK TO SAVEPOINT before_test;

-- Test: Create market order that cannot be entirely matched
-- Ask is 10 BTC @ 1000 (10000 NOK). Asker has 10 BTC
-- Bid is: 5 BTC @ ? NOK (? NOK). Bidder has 5000 NOK
-- Match would be 5 BTC @ 1000 NOK (5000 NOK)
DO $$ <<fn>>
DECLARE
    mid int; -- BTCNOK
    ask_oid int;
    ask_uid int;
    ask_nok_balance bigint;
    bid_uid int;
BEGIN
    SELECT market_id INTO mid FROM market WHERE base_currency_id = 'BTC'
        AND quote_currency_id = 'NOK';

    ask_uid := create_user('a@a', repeat('a', 64), false);
    bid_uid := create_user('b@b', repeat('b', 64), false);

    PERFORM edge_credit(ask_uid, 'BTC', 10e8::bigint);
    PERFORM edge_credit(bid_uid, 'NOK', 5000e5::bigint);

    -- ASK 10 BTC @ 1000 NOK (10000 NOK)
    ask_oid := create_order(ask_uid, mid, 1, 1000::numeric, 10::numeric);

    RAISE NOTICE '--------------------------------------------------';

    -- BID 5 @ ? NOK (? NOK)
    PERFORM create_order(bid_uid, mid, 0, NULL, 5::numeric);

    IF (SELECT balance FROM "account"
        WHERE user_id = ask_uid AND currency_id = 'BTC') <> 5e8 THEN
        RAISE 'Unexpected BTC after for asker';
    END IF;

    ask_nok_balance = (SELECT balance FROM "account"
        WHERE user_id = ask_uid AND currency_id = 'NOK');

    IF ask_nok_balance <> (5000e5 * 0.995)::bigint THEN
        RAISE 'Unexpected NOK after for asker, %. Expected %', ask_nok_balance, (5000e8 * 0.995)::bigint;
    END IF;
END; $$; ROLLBACK TO SAVEPOINT before_test;

DO $$ <<fn>>
DECLARE
    uid1 int := create_user('a@a', repeat('a', 64), TRUE); -- simple
    mid int := (SELECT market_id FROM market WHERE base_currency_id = 'BTC' AND quote_currency_id = 'NOK');
    oid int;
    uid2 int := create_user('b@b', repeat('b', 64), FALSE); -- advanced
    tid1 int;
BEGIN
    tid1 := edge_credit(uid1, 'NOK', 1000e5::bigint);
    PERFORM edge_credit(uid2, 'BTC', 10e8::bigint);

    BEGIN
        PERFORM spend_credit(tid1);
        RAISE 'Expected fail';
    EXCEPTION WHEN OTHERS THEN
        -- Should fail, nothing to match against.
    END;

    -- User 2: ASK 0.1 BTC @ 772.122 NOK ( =77.2122 NOK)
    INSERT INTO "order" (user_id, market_id, price, side, volume)
    VALUES (uid2, mid, (772.122*1e3)::bigint, 1, (0.1*1e5)::bigint);

    BEGIN
        PERFORM spend_credit(tid1);
        RAISE 'Expected fail';
    EXCEPTION WHEN OTHERS THEN
        -- Should fail, cannot fill entire.
    END;

    -- User 2: ASK 0.1 BTC @ 772.122 NOK (= 872.61 NOK)
    INSERT INTO "order" (user_id, market_id, price, side, volume)
    VALUES (uid2, mid, (870*1e3)::bigint, 1, (1.003*1e5)::bigint);

    BEGIN
        PERFORM spend_credit(tid1);
        RAISE 'Expected fail';
    EXCEPTION WHEN OTHERS THEN
        -- Still not enough to fill, missing 1000 - (77.2122 + 872.61) = 50.1778
    END;

    -- User 2: ASK 0.956 BTC @ 876.3 NOK (= 837.7428 NOK)
    INSERT INTO "order" (user_id, market_id, price, side, volume)
    VALUES (uid2, mid, (876.3*1e3)::bigint, 1, (0.956*1e5)::bigint);

    PERFORM spend_credit(tid1);
END; $$; ROLLBACK TO SAVEPOINT before_test;

ROLLBACK;
