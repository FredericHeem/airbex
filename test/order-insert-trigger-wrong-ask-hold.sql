BEGIN;
DO $$
DECLARE
  uid int;
  bid int;
  oid int;
BEGIN

  INSERT INTO "user" (email, email_lower)
  VALUES ('test@test.com', 'test@test.com');
  uid := currval('user_user_id_seq');

  bid := (SELECT book_id FROM "book" WHERE base_security_id = 'BTC' AND quote_security_id = 'XRP');

  RAISE NOTICE 'book id = %', bid;

  INSERT INTO "transaction" (debit_account_id, credit_account_id, amount)
  VALUES (special_account('edge', 'BTC'), user_security_account(uid, 'BTC'), 500);

  RAISE NOTICE 'balance %', (SELECT balance FROM "account" WHERE account_id = user_security_account(uid, 'BTC'));

  INSERT INTO "order" (book_id, side, price, volume, user_id)
  VALUES (bid, 1, 100, 500, uid);

  oid := currval('order_order_id_seq');

  RAISE NOTICE 'order #% created', oid;

END; $$;

ROLLBACK;
