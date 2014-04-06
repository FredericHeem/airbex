BEGIN;

DO $$
DECLARE
    u1 int;
    u2 int;
    o1 int;
    o2 int;
    mid int;
    u1h bigint;
BEGIN
    INSERT INTO currency (currency_id, scale, fiat)
    VALUES ('USD', 5, true), ('BTC', 8, true);

    INSERT INTO account (currency_id, type)
    VALUES ('USD', 'edge'), ('BTC', 'edge');

    INSERT INTO market (base_currency_id, quote_currency_id, scale)
    VALUES ('BTC', 'USD', 3)
    RETURNING market_id INTO mid;

    u1 := create_user('a@a', repeat('a', 64));
    u2 := create_user('b@b', repeat('b', 64));

    PERFORM edge_credit(u1, 'BTC', 5e8::bigint);
    PERFORM edge_credit(u2, 'USD', 1000e5::bigint);

    UPDATE "user" SET fee_ratio = 0
    WHERE user_id IN (u1, u2);

    -- User 1: ASK 5 BTC @ 130 USD (650 USD)
    INSERT INTO "order" (market_id, user_id, type, volume, price)
    VALUES (mid, u1, 'ask', 5e5, 130e3);

    SELECT hold INTO u1h FROM account WHERE account_id = user_currency_account(u1, 'BTC');

    IF u1h <> 5e8 THEN
        RAISE 'Unexpected before-hold for u1, %', u1h / 1e8;
    END IF;

    -- User 2: BID 2 BTC @ 130 USD (260 USD)
    INSERT INTO "order" (market_id, user_id, type, volume, price)
    VALUES (mid, u2, 'bid', 2e5, 130e3);

    SELECT hold INTO u1h FROM account WHERE account_id = user_currency_account(u1, 'BTC');

    IF u1h <> 3e8 THEN
        RAISE 'Unexpected after-hold for u1, %', u1h / 1e8;
    END IF;
END; $$ LANGUAGE plpgsql;

ROLLBACK;
