BEGIN; DO $$ <<fn>>
DECLARE
    uid int;
    mid int;
    oid int;
    fr decimal(6, 4);
BEGIN
    INSERT INTO currency (currency_id, scale, fiat)
    VALUES ('BTC', 8, FALSE), ('USD', 5, TRUE);

    INSERT INTO account (currency_id, type)
    VALUES ('BTC', 'edge');

    INSERT INTO market (base_currency_id, quote_currency_id, scale)
    VALUES ('BTC', 'USD', 3)
    RETURNING market_id INTO mid;

    uid := create_user('a@a', repeat('x', 64));

    PERFORM edge_credit(uid, 'BTC', 5e8::bigint);

    INSERT INTO "order" (user_id, market_id, type, volume, price)
    VALUES (uid, mid, 'ask', 5e5, 200e3)
    RETURNING order_id INTO oid;

    SELECT fee_ratio
    FROM "order"
    INTO fr
    WHERE order_id = oid;

    IF fr <> 0 THEN
        RAISE 'Fee ratio % not expected', fr;
    END IF;
END; $$; ROLLBACK;
