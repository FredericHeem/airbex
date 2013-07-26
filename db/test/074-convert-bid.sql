BEGIN;

SAVEPOINT before_tests;

DO $$
DECLARE
    bid_uid int := create_user('a@a', repeat('a', 64));
    ask_uid int := create_user('b@b', repeat('b', 64));
    sold bigint;
    mid int;
BEGIN
    -- BTCXRP market
    PERFORM edge_credit(bid_uid, 'XRP', 20000e6::bigint);
    PERFORM edge_credit(ask_uid, 'BTC', 1e8::bigint);

    mid := (SELECT market_id FROM market WHERE base_currency_id = 'BTC' AND
        quote_currency_id = 'XRP');

    INSERT INTO "order" (user_id, market_id, type, volume, price)
    VALUES (bid_uid, mid, 'bid', 2e5, 10000e3);

    sold := convert_ask(ask_uid, mid, (1e8 / 1e3)::bigint);

    RAISE NOTICE 'Sold %', sold / 1e6;
END; $$; ROLLBACK TO before_tests;

ROLLBACK;
