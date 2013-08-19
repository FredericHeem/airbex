BEGIN;
DO $$
DECLARE
  uid int;
  bid int;
  oid int;
BEGIN
    INSERT INTO currency (currency_id, scale, fiat)
    VALUES ('BTC', 8, false), ('XRP', 6, false);

    INSERT INTO market (base_currency_id, quote_currency_id, scale)
    VALUES ('BTC', 'XRP', 3);

    INSERT INTO account (currency_id, type)
    VALUES ('BTC', 'edge'), ('XRP', 'edge');

  uid := create_user('t@t', repeat('x', 64));

  bid := (SELECT market_id FROM "market" WHERE base_currency_id = 'BTC' AND quote_currency_id = 'XRP');

  RAISE NOTICE 'market id = %', bid;

  INSERT INTO "transaction" (debit_account_id, credit_account_id, amount)
  VALUES (special_account('edge', 'BTC'), user_currency_account(uid, 'BTC'), 1e8);

  RAISE NOTICE 'balance %', (SELECT balance FROM "account" WHERE account_id = user_currency_account(uid, 'BTC'));

  INSERT INTO "order" (market_id, type, price, volume, user_id)
  VALUES (bid, 'ask', 100, 1e8 / 1e3, uid);

  oid := currval('order_order_id_seq');

  RAISE NOTICE 'order #% created', oid;
  RAISE NOTICE 'balance %', (SELECT balance-hold FROM "account" WHERE account_id = user_currency_account(uid, 'BTC'));

END; $$;

ROLLBACK;
