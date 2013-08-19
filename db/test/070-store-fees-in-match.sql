BEGIN;

SAVEPOINT before_tests;

DO $$ <<fn>>
DECLARE
    ask_uid int;
    bid_uid int;
    ask_oid int;
    bid_oid int;
    mrid int;
    ask_fee_expected bigint := ceil(3750e5 * 0.005);
    bid_fee_expected bigint := ceil(5e8 * 0.005);
    ma "match"%ROWTYPE;
BEGIN
    INSERT INTO currency (currency_id, scale, fiat)
    VALUES ('NOK', 5, true), ('BTC', 8, false);

    INSERT INTO account (currency_id, type)
    VALUES ('NOK', 'edge'), ('BTC', 'edge'), ('NOK', 'fee'), ('BTC', 'fee');

    INSERT INTO market (base_currency_id, quote_currency_id, scale)
    VALUES ('BTC', 'NOK', 3);

    ask_uid := create_user('a@a', repeat('a', 64));
    bid_uid := create_user('b@b', repeat('b', 64));
    mrid := (SELECT market_id FROM market
        WHERE base_currency_id = 'BTC' AND quote_currency_id = 'NOK');

    PERFORM edge_credit(ask_uid, 'BTC', 10e8::bigint);
    PERFORM edge_credit(bid_uid, 'NOK', 5000e5::bigint);

    -- ASK 10 BTC @ 750 NOK (7500 NOK)
    INSERT INTO "order" (user_id, market_id, type, volume, price)
    VALUES (ask_uid, mrid, 'ask', 10e5, 750e3); -- = 7500 NOK
    ask_oid := currval('order_order_id_seq');

    -- BID 5 BTC @ 800 NOK (4000 NOK)
    INSERT INTO "order" (user_id, market_id, type, volume, price)
    VALUES (bid_uid, mrid, 'bid', 5e5, 800e3); -- = 4000 NOK
    bid_oid := currval('order_order_id_seq');

    -- Match will be 5 BTC @ 750 NOK (3750 NOK)

    SELECT * INTO ma FROM "match" WHERE bid_order_id = bid_oid AND
        ask_order_id = ask_oid;

    IF ma IS NULL THEN
        RAISE 'Match not found.';
    END IF;

    IF ma.ask_fee <> ask_fee_expected THEN
        RAISE 'Expected ask fee % to equal %', ma.ask_fee, ask_fee_expected;
    END IF;

    IF ma.bid_fee <> bid_fee_expected THEN
        RAISE 'Expected bid fee % to equal %', ma.bid_fee, bid_fee_expected;
    END IF;
END; $$;

ROLLBACK TO before_tests;

-- The bidder does not have to pay fees. The asker pays 0.25%
DO $$ <<fn>>
DECLARE
    ask_uid int;
    bid_uid int;
    ask_oid int;
    bid_oid int;
    mrid int ;
    ask_fee_expected bigint := ceil(3750e5 * 0.0025);
    bid_fee_expected bigint := 0;
    ma "match"%ROWTYPE;
BEGIN
    INSERT INTO currency (currency_id, scale, fiat)
    VALUES ('NOK', 5, true), ('BTC', 8, false);

    INSERT INTO account (currency_id, type)
    VALUES ('NOK', 'edge'), ('BTC', 'edge'), ('NOK', 'fee'), ('BTC', 'fee');

    INSERT INTO market (base_currency_id, quote_currency_id, scale)
    VALUES ('BTC', 'NOK', 3);

    UPDATE "user" SET fee_ratio = 0 WHERE user_id = bid_uid;
    UPDATE "user" SET fee_ratio = 0.0025 WHERE user_id = ask_uid;

    ask_uid := create_user('a@a', repeat('a', 64));
    bid_uid := create_user('b@b', repeat('b', 64));

    mrid := (SELECT market_id FROM market
        WHERE base_currency_id = 'BTC' AND quote_currency_id = 'NOK');

    PERFORM edge_credit(ask_uid, 'BTC', 10e8::bigint);
    PERFORM edge_credit(bid_uid, 'NOK', 5000e5::bigint);

    -- ASK 10 BTC @ 750 NOK (7500 NOK)
    INSERT INTO "order" (user_id, market_id, type, volume, price)
    VALUES (ask_uid, mrid, 'ask', 10e5, 750e3); -- = 7500 NOK
    ask_oid := currval('order_order_id_seq');

    -- BID 5 BTC @ 800 NOK (4000 NOK)
    INSERT INTO "order" (user_id, market_id, type, volume, price)
    VALUES (bid_uid, mrid, 'bid', 5e5, 800e3); -- = 4000 NOK
    bid_oid := currval('order_order_id_seq');

    -- Match will be 5 BTC @ 750 NOK (3750 NOK)

    SELECT * INTO ma FROM "match" WHERE bid_order_id = bid_oid AND
        ask_order_id = ask_oid;

    IF ma IS NULL THEN
        RAISE 'Match not found.';
    END IF;

    IF ma.ask_fee <> ask_fee_expected THEN
        RAISE 'Expected ask fee % to equal %', ma.ask_fee, ask_fee_expected;
    END IF;

    IF ma.bid_fee <> bid_fee_expected THEN
        RAISE 'Expected bid fee % to equal %', ma.bid_fee, bid_fee_expected;
    END IF;
END; $$;

ROLLBACK TO before_tests;

ROLLBACK;
