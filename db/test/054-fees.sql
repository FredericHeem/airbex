BEGIN; DO $$ <<fn>>
DECLARE
    uid1 int;
    uid2 int;
    o1 int;
    o2 int;
    mid int;
    u1_ltc_actual bigint;
    u1_ltc_expected bigint := (24.80653172 * 1e8)::bigint;
    u2_btc_actual bigint;
    u2_btc_expected bigint := (0.70877830 * 1e8)::bigint;
BEGIN
    -- create users
    uid1 := create_user('u1@g', REPEAT('x', 64), FALSE);
    uid2 := create_user('u2@g', REPEAT('y', 64), FALSE);

    -- credit user1 with 1 btc
    INSERT INTO "transaction" (debit_account_id, credit_account_id, amount)
    VALUES (special_account('edge', 'BTC'), user_currency_account(uid1, 'BTC'), 1e8);

    -- credit user2 with 35 ltc
    INSERT INTO "transaction" (debit_account_id, credit_account_id, amount)
    VALUES (special_account('edge', 'LTC'), user_currency_account(uid2, 'LTC'), 35e8);

    -- fee should default to 0.5%
    mid := (SELECT market_id FROM market WHERE base_currency_id = 'BTC' AND
        quote_currency_id = 'LTC');

    -- create order for user1 to sell 0.71234 btc @ 34.999
    o1 := create_order(uid1, mid, 1, 34.999, 0.71234);

    -- create order for user2 to buy 1 btc for 35 ltc
    o2 := create_order(uid2, mid, 0, 35, 1);

    u1_ltc_actual := (SELECT balance FROM account WHERE user_id = uid1 AND currency_id = 'LTC');

    IF @(u1_ltc_actual - u1_ltc_expected) > 1 THEN
        RAISE 'Expected user 1 to get % LTC, but has % LTC', u1_ltc_expected / 1e8, u1_ltc_actual / 1e8;
    END IF;

    u2_btc_actual := (SELECT balance FROM account WHERE user_id = uid2 AND currency_id = 'BTC');

    IF u2_btc_actual <> u2_btc_expected THEN
        RAISE 'Expected user 2 to get % BTC, but has % BTC', u2_btc_expected / 1e8, u2_btc_actual / 1e8;
    END IF;
END; $$; ROLLBACK;
