BEGIN;

SAVEPOINT before_tests;

-- Test: Convert bid
-------------------------------------------------------------------------------------

DO $$ <<fn>>
DECLARE
    ask_uid int;
    bid_uid int;
    ask_oid int;
    bid_oid int;
    mrid int;
    ma "match"%ROWTYPE;
    bid_expected_btc_balance bigint := 8.93662000e8;
    bid_actual_btc_balance bigint;
    bid_expected_xrp_balance bigint := 0.126828e6e6;
    bid_actual_xrp_balance bigint;
    fee_expected_btc_balance bigint := 0.0446831e8;
    fee_actual_btc_balance bigint;
    fee_expected_xrp_balance bigint := 24.874991e6;
    fee_actual_xrp_balance bigint;
BEGIN
    INSERT INTO currency (currency_id, scale, fiat)
    VALUES ('BTC', 8, false), ('XRP', 6, false);

    INSERT INTO account (currency_id, type)
    VALUES ('BTC', 'edge'), ('XRP', 'edge'), ('BTC', 'fee'), ('XRP', 'fee');

    INSERT INTO market (base_currency_id, quote_currency_id, scale)
    VALUES ('BTC', 'XRP', 3)
    RETURNING market_id INTO mrid;

    ask_uid := create_user('a@a', repeat('a', 64));
    bid_uid := create_user('b@b', repeat('b', 64));

    PERFORM edge_credit(ask_uid, 'BTC', 30e8::bigint);
    PERFORM edge_credit(bid_uid, 'XRP', 5000e6::bigint);

    -- ASK 2.98765 BTC @ 550.123 XRP (1643.574981 XRP)
    INSERT INTO "order" (user_id, market_id, type, volume, price)
    VALUES (ask_uid, mrid, 'ask', 2.98765e5, 550.123e3);

    -- ASK 20 BTC @ 560 XRP (6600 XRP)
    INSERT INTO "order" (user_id, market_id, type, volume, price)
    VALUES (ask_uid, mrid, 'ask', 20e5, 560e3);

    RAISE NOTICE '-----------------------------------------------------------------------------------';

    PERFORM convert_bid(bid_uid, mrid, floor(0.995 * 5000e6)::bigint);

    SELECT balance FROM account WHERE account_id = user_currency_account(bid_uid, 'BTC') INTO bid_actual_btc_balance;
    SELECT balance FROM account WHERE account_id = user_currency_account(bid_uid, 'XRP') INTO bid_actual_xrp_balance;
    SELECT balance FROM account WHERE account_id = special_account('fee', 'BTC') INTO fee_actual_btc_balance;
    SELECT balance FROM account WHERE account_id = special_account('fee', 'XRP') INTO fee_actual_xrp_balance;

    IF (ABS(bid_actual_btc_balance - bid_expected_btc_balance) = 0) IS NOT TRUE THEN
        RAISE 'Bidder actual btc balance % <> %', bid_actual_btc_balance, bid_expected_btc_balance;
    END IF;

    IF (ABS(bid_actual_xrp_balance - bid_expected_xrp_balance) <= 1) IS NOT TRUE THEN
        RAISE 'Bidder actual xrp balance % <> %', bid_actual_xrp_balance, bid_expected_xrp_balance;
    END IF;

    IF (ABS(fee_actual_btc_balance - fee_expected_btc_balance) = 0) IS NOT TRUE THEN
        RAISE 'Fee actual btc balance % <> %', fee_actual_btc_balance, fee_expected_btc_balance;
    END IF;

    IF (ABS(fee_actual_xrp_balance - fee_expected_xrp_balance) = 0) IS NOT TRUE THEN
        RAISE 'Fee actual xrp balance % <> %', fee_actual_xrp_balance, fee_expected_xrp_balance;
    END IF;
END; $$; ROLLBACK TO before_tests;

ROLLBACK;
