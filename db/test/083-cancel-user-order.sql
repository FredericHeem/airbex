BEGIN; SAVEPOINT before_tests;

DO $$
DECLARE
    uid int;
    oid int;
    mid int;
    vol bigint;
BEGIN
    uid := create_user('a@a', repeat('x', 64));
    mid := (SELECT market_id FROM market WHERE
        base_currency_id || quote_currency_id = 'BTCNOK');
    PERFORM edge_credit(uid, 'BTC', 1e8::bigint);

    INSERT INTO "order" (user_id, market_id, type, price, volume)
    VALUES (uid, mid, 'ask', 700e3, 1e5)
    RETURNING order_id INTO oid;

    PERFORM cancel_user_order(uid, oid);

    SELECT volume
    INTO vol
    FROM "order"
    WHERE order_id = oid;

    IF NOT FOUND THEN
        RAISE 'Order not found.';
    END IF;

    IF vol > 0 THEN
        RAISE 'Order was not cancelled.';
    END IF;
END; $$; ROLLBACK TO before_tests;

ROLLBACK;
