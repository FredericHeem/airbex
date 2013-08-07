BEGIN;

SAVEPOINT before_tests;

DO $$
DECLARE
    bid_uid int := create_user('a@a', repeat('a', 64));
    ask_uid int := create_user('b@b', repeat('b', 64));
    bid_oid int;
    ask_oid int;
    bid int;
    amnt bigint;
    mid int;
    wrid int;
    qamnt bigint;
BEGIN
    mid := (SELECT market_id FROM market WHERE base_currency_id = 'BTC' AND
        quote_currency_id = 'NOK');

    PERFORM edge_credit(bid_uid, 'NOK', 10000e5::bigint);
    PERFORM edge_credit(ask_uid, 'BTC', 5e8::bigint);

    INSERT INTO "order" (user_id, market_id, type, volume, price)
    VALUES (bid_uid, mid, 'bid', 10e5, 750e3);

    INSERT INTO bank_account (account_number, user_id)
    VALUES ('12345', ask_uid);

    bid := currval('bank_account_bank_account_id_seq');

    RAISE NOTICE '------------------------------------------------';

    -- Convert to market volume scale
    wrid := convert_and_withdraw(ask_uid, bid, mid, (5e8 / 10^3)::bigint);

    qamnt := (SELECT amount
        FROM withdraw_request wr
        INNER JOIN account a ON a.account_id = wr.account_id
        INNER JOIN currency c ON c.currency_id = a.currency_id
        WHERE wr.request_id = wrid
    );

    IF qamnt <> (3731.25 * 1e5)::bigint THEN
        RAISE 'Expected 3731.25 to be withdrawn.';
    END IF;
END; $$; ROLLBACK TO before_tests;

ROLLBACK;
