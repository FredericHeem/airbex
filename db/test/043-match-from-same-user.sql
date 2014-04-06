-- Match with where bid and ask is the same user without crashing.
BEGIN; DO $$ <<fn>>
DECLARE
    user_id int;
    api_key varchar := 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBBB';
    ask_order_id int;
    bid_order_id int;
    match_id int;
    market_id int;
BEGIN
    INSERT INTO currency (currency_id, scale, fiat)
    VALUES ('BTC', 8, false), ('XRP', 6, false);

    INSERT INTO account (currency_id, type)
    VALUES ('BTC', 'edge'), ('XRP', 'edge');

    INSERT INTO market (base_currency_id, quote_currency_id, scale)
    VALUES ('BTC', 'XRP', 3);

    fn.user_id := create_user('bob@gmail.com', fn.api_key);
    fn.market_id := (SELECT m.market_id FROM market m WHERE base_currency_id || quote_currency_id = 'BTCXRP');

    UPDATE "user" SET fee_ratio = 0;

    -- Fund user with 10 BTC
    INSERT INTO "transaction" (debit_account_id, credit_account_id, amount)
    VALUES (special_account('edge', 'BTC'), user_currency_account(fn.user_id, 'BTC'), 10e8);

    -- ...and 10 XRP
    INSERT INTO "transaction" (debit_account_id, credit_account_id, amount)
    VALUES (special_account('edge', 'XRP'), user_currency_account(fn.user_id, 'XRP'), 10e6);

    -- Create bid order (BID 1 BTC @ 10 XRP)
    INSERT INTO "order" (market_id, user_id, type, price, volume)
    VALUES (fn.market_id, fn.user_id, 'bid', 10e3, 1*10^(8-3));

    -- Create ask order (ASK 1 BTC @ 10 XRP)
    INSERT INTO "order" (market_id, user_id, type, price, volume)
    VALUES (fn.market_id, fn.user_id, 'ask', 10e3, 1*10^(8-3));
END; $$; ROLLBACK;
