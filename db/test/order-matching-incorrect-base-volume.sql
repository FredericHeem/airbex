-- Bob will sell 1 BTC @ 150,000 XRP
-- Alice will buy 0.05 BTC @ 175,000 XRP
-- Bob's order should remain with 0.95 volume (BTC)
BEGIN; DO $$
DECLARE
    bob int;
    bob_oid int;
    alice_oid int;
    alice int;
    bid int;
    mid int;
BEGIN
    bob := create_user('bob@gmail.com', repeat('a', 64));
    alice := create_user('alice@hotmail.com', repeat('b', 64));
    bid := (SELECT market_id FROM market WHERE base_currency_id = 'BTC' AND quote_currency_id = 'XRP');

    UPDATE "user" SET fee_ratio = 0 WHERE user_id IN (bob, alice);

    -- Fund Bob with 10 BTC
    INSERT INTO "transaction" (debit_account_id, credit_account_id, amount)
    VALUES (special_account('edge', 'BTC'), user_currency_account(bob, 'BTC'), 10e8);

    -- Fund Alice with 10,000 XRP
    INSERT INTO "transaction" (debit_account_id, credit_account_id, amount)
    VALUES (special_account('edge', 'XRP'), user_currency_account(alice, 'XRP'), 10000e6);

    -- Create Bob's order
    INSERT INTO "order" (market_id, user_id, type, price, volume)
    VALUES (bid, bob, 'ask', 150000e3, 1*10^(8-3));

    -- Bob, should now have a hold of 1 BTC
    IF (SELECT hold FROM "account" WHERE account_id = user_currency_account(bob, 'BTC')) <> 1e8 THEN
        RAISE 'Mismatch held for Bob';
    END IF;

    -- Create Alice's order
    INSERT INTO "order" (market_id, user_id, type, price, volume)
    VALUES (bid, alice, 'bid', 175000e3, 0.05*10^(8-3));

    mid := currval('match_match_id_seq');

    -- Match should be 0.05 BTC @ 150,000 XRP (7,500 XRP)
    IF (SELECT volume FROM "match" WHERE match_id = mid) <> 0.05*10^(8-3) THEN
        RAISE 'Match volume incorrect';
    END IF;

    IF (SELECT price FROM "match" WHERE match_id = mid) <> 150000e3 THEN
        RAISE 'Match price incorrect. Expeted 150000e3 actual %', (SELECT price FROM "match" WHERE match_id = mid);
    END IF;

    -- Bob should have 0.05 BTC * 150,000 XRP/BTC = 7,500 XRP
    IF (SELECT balance FROM "account" WHERE account_id = user_currency_account(bob, 'XRP')) <> 7500e6 THEN
        RAISE 'Bob did not receive the correct amount of XRP';
    END IF;

    -- Alice should have 0.05 BTC
    IF (SELECT balance FROM "account" WHERE account_id = user_currency_account(alice, 'BTC')) <> 0.05e8 THEN
        RAISE 'Alice did not receive the correct amount of BTC. Expected %, actual %',
            0.05e8, (SELECT balance FROM "account" WHERE account_id = user_currency_account(alice, 'BTC'));
    END IF;
END; $$; ROLLBACK;
