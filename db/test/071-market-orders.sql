BEGIN;

SAVEPOINT before_tests;

-- Test: Market order bid (success)
-------------------------------------------------------------------------------------

DO $$ <<fn>>
DECLARE
    ask_uid int;
    bid_uid int;
    ask_oid int;
    bid_oid int;
    mrid int;
    ma "match"%ROWTYPE;
BEGIN
    INSERT INTO currency (currency_id, scale, fiat)
    VALUES ('BTC', 8, false), ('NOK', 5, true);

    INSERT INTO account (currency_id, type)
    VALUES ('BTC', 'edge'), ('NOK', 'edge'), ('BTC', 'fee'), ('NOK', 'fee');

    INSERT INTO market (base_currency_id, quote_currency_id, scale)
    VALUES ('BTC', 'NOK', 3)
    RETURNING market_id INTO mrid;

    ask_uid := create_user('a@a', repeat('a', 64));
    bid_uid := create_user('b@b', repeat('b', 64));

    PERFORM edge_credit(ask_uid, 'BTC', 10.1e8::bigint);
    PERFORM edge_credit(bid_uid, 'NOK', 5000e5::bigint);

    -- ASK 10 BTC @ 750 NOK (7500 NOK)
    INSERT INTO "order" (user_id, market_id, type, volume, price)
    VALUES (ask_uid, mrid, 'ask', 10e5, 750e3); -- = 7500 NOK
    ask_oid := currval('order_order_id_seq');

    -- BID 5 BTC @ ? NOK (? NOK)
    INSERT INTO "order" (user_id, market_id, type, volume, price)
    VALUES (bid_uid, mrid, 'bid', 5e5, NULL); -- = ? NOK
    bid_oid := currval('order_order_id_seq');

    -- Match will be 5 BTC @ 750 NOK (3750 NOK)

    SELECT * INTO ma FROM "match" WHERE bid_order_id = bid_oid AND
        ask_order_id = ask_oid;

    IF ma IS NULL THEN
        RAISE 'Match not found.';
    END IF;

    IF ma.price <> 750e3 THEN
        RAISE 'Unexpected match price %', ma.price;
    END IF;

    IF ma.volume <> 5e5 THEN
        RAISE 'Unexpected match volume %', ma.volume;
    END IF;
END; $$; ROLLBACK TO before_tests;


-- Test: Market order ask (success)
-------------------------------------------------------------------------------------

DO $$ <<fn>>
DECLARE
    ask_uid int;
    bid_uid int;
    ask_oid int;
    bid_oid int;
    mrid int;
    ma "match"%ROWTYPE;
BEGIN
    INSERT INTO currency (currency_id, scale, fiat)
    VALUES ('BTC', 8, false), ('NOK', 5, true);

    INSERT INTO account (currency_id, type)
    VALUES ('BTC', 'edge'), ('NOK', 'edge'), ('BTC', 'fee'), ('NOK', 'fee');

    INSERT INTO market (base_currency_id, quote_currency_id, scale)
    VALUES ('BTC', 'NOK', 3)
    RETURNING market_id INTO mrid;

    ask_uid := create_user('a@a', repeat('a', 64));
    bid_uid := create_user('b@b', repeat('b', 64));

    PERFORM edge_credit(ask_uid, 'BTC', 10.5e8::bigint);
    PERFORM edge_credit(bid_uid, 'NOK', 10000e5::bigint);

    -- BID 10 BTC @ 800 NOK (8000 NOK)
    INSERT INTO "order" (user_id, market_id, type, volume, price)
    VALUES (bid_uid, mrid, 'bid', 10e5, 800e3); -- = 8000 NOK
    bid_oid := currval('order_order_id_seq');

    -- ASK 10 BTC @ ? NOK (? NOK)
    INSERT INTO "order" (user_id, market_id, type, volume, price)
    VALUES (ask_uid, mrid, 'ask', 10e5, NULL);
    ask_oid := currval('order_order_id_seq');

    -- Match will be 10 BTC @ 800 NOK (8000 NOK)

    SELECT * INTO ma FROM "match" WHERE bid_order_id = bid_oid AND
        ask_order_id = ask_oid;

    IF ma IS NULL THEN
        RAISE 'Match not found.';
    END IF;

    IF ma.price <> 800e3 THEN
        RAISE 'Unexpected match price %', ma.price;
    END IF;

    IF ma.volume <> 10e5 THEN
        RAISE 'Unexpected match volume %', ma.volume;
    END IF;
END; $$; ROLLBACK TO before_tests;

-- Test: Market order bid (fails, not enough to match vs)
-------------------------------------------------------------------------------------

DO $$ <<fn>>
DECLARE
    ask_uid int;
    bid_uid int;
    ask_oid int;
    bid_oid int;
    mrid int := (SELECT market_id FROM market
        WHERE base_currency_id = 'BTC' AND quote_currency_id = 'NOK');
    ma "match"%ROWTYPE;
BEGIN
    INSERT INTO currency (currency_id, scale, fiat)
    VALUES ('BTC', 8, false), ('NOK', 5, true);

    INSERT INTO account (currency_id, type)
    VALUES ('BTC', 'edge'), ('NOK', 'edge'), ('BTC', 'fee'), ('NOK', 'fee');

    INSERT INTO market (base_currency_id, quote_currency_id, scale)
    VALUES ('BTC', 'NOK', 3)
    RETURNING market_id INTO mrid;

    ask_uid := create_user('a@a', repeat('a', 64));
    bid_uid := create_user('b@b', repeat('b', 64));

    PERFORM edge_credit(ask_uid, 'BTC', 10.5e8::bigint);
    PERFORM edge_credit(bid_uid, 'NOK', 10000e5::bigint);

    -- BID 8 BTC @ 800 NOK (8000 NOK)
    INSERT INTO "order" (user_id, market_id, type, volume, price)
    VALUES (bid_uid, mrid, 'bid', 8e5, 800e3); -- = 6400 NOK
    bid_oid := currval('order_order_id_seq');

    -- ASK 10 BTC @ ? NOK (? NOK)
    BEGIN
        INSERT INTO "order" (user_id, market_id, type, volume, price)
        VALUES (ask_uid, mrid, 'ask', 10e5, NULL);
        ask_oid := currval('order_order_id_seq');

        RAISE 'Expected exception';
    EXCEPTION WHEN others THEN
        IF SQLERRM <> 'Could not fill entire market order. 200000 remains.' THEN
            RAISE 'Unexpected exception.';
        END IF;
    END;
END; $$; ROLLBACK TO before_tests;

-- Test: Market order bid (fails, cant afford it)
-------------------------------------------------------------------------------------

DO $$ <<fn>>
DECLARE
    ask_uid int;
    bid_uid int;
    ask_oid int;
    bid_oid int;
    mrid int;
BEGIN
    INSERT INTO currency (currency_id, scale, fiat)
    VALUES ('BTC', 8, false), ('NOK', 5, true);

    INSERT INTO account (currency_id, type)
    VALUES ('BTC', 'edge'), ('NOK', 'edge'), ('BTC', 'fee'), ('NOK', 'fee');

    INSERT INTO market (base_currency_id, quote_currency_id, scale)
    VALUES ('BTC', 'NOK', 3)
    RETURNING market_id INTO mrid;

    ask_uid := create_user('a@a', repeat('a', 64));
    bid_uid := create_user('b@b', repeat('b', 64));

    PERFORM edge_credit(ask_uid, 'BTC', 10.5e8::bigint);
    PERFORM edge_credit(bid_uid, 'NOK', 5000e5::bigint);

    -- ASK 10 BTC @ 750 NOK (7500 NOK)
    INSERT INTO "order" (user_id, market_id, type, volume, price)
    VALUES (ask_uid, mrid, 'ask', 10e5, 750e3); -- = 7500 NOK
    ask_oid := currval('order_order_id_seq');

    -- BID 10 BTC @ ? NOK (? NOK)
    BEGIN
        INSERT INTO "order" (user_id, market_id, type, volume, price)
        VALUES (bid_uid, mrid, 'bid', 10e5, NULL) -- = ? NOK
        RETURNING order_id INTO bid_oid;

        RAISE 'Test failed.';
    EXCEPTION WHEN others THEN
        IF NOT SQLERRM ~* 'non_negative_available' THEN
            RAISE 'Unexpected exception %', SQLERRM;
        END IF;
    END;
END; $$; ROLLBACK TO before_tests;


-- Test: Market order ask (fails fast, cant afford it)
-------------------------------------------------------------------------------------

DO $$ <<fn>>
DECLARE
    ask_uid int;
    bid_uid int;
    ask_oid int;
    bid_oid int;
    mrid int;
    ma "match"%ROWTYPE;
BEGIN
    INSERT INTO currency (currency_id, scale, fiat)
    VALUES ('BTC', 8, false), ('NOK', 5, true);

    INSERT INTO account (currency_id, type)
    VALUES ('BTC', 'edge'), ('NOK', 'edge'), ('BTC', 'fee'), ('NOK', 'fee');

    INSERT INTO market (base_currency_id, quote_currency_id, scale)
    VALUES ('BTC', 'NOK', 3)
    RETURNING market_id INTO mrid;

    ask_uid := create_user('a@a', repeat('a', 64));
    bid_uid := create_user('b@b', repeat('b', 64));

    PERFORM edge_credit(ask_uid, 'BTC', 5e8::bigint);
    PERFORM edge_credit(bid_uid, 'NOK', 10000e5::bigint);

    -- BID 10 BTC @ 800 NOK (8000 NOK)
    INSERT INTO "order" (user_id, market_id, type, volume, price)
    VALUES (bid_uid, mrid, 'bid', 10e5, 800e3); -- = 8000 NOK
    bid_oid := currval('order_order_id_seq');

    -- ASK 10 BTC @ ? NOK (? NOK)
    -- Match would will be 10 BTC @ 800 NOK (8000 NOK)
    BEGIN
        INSERT INTO "order" (user_id, market_id, type, volume, price)
        VALUES (ask_uid, mrid, 'ask', 10e5, NULL);
        ask_oid := currval('order_order_id_seq');

        RAISE 'Test failed.';
    EXCEPTION WHEN others THEN
        IF NOT SQLERRM ~* 'non_negative_available' THEN
            RAISE 'Unexpected exception %', SQLERRM;
        END IF;
    END;
END; $$; ROLLBACK TO before_tests;

ROLLBACK;
