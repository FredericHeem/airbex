ALTER TABLE crypto_credited 
  ADD column user_id int;
  
ALTER TABLE crypto_credited 
  ADD column created_at timestamptz NOT NULL DEFAULT current_timestamp;
  
--  crypto_credit
CREATE OR REPLACE FUNCTION crypto_credit(currency text, t character, a character, amnt bigint)
  RETURNS integer AS
$BODY$
DECLARE
    aid int;
    uid int;
    tid int;
BEGIN
    SELECT ac.account_id, ac.user_id
    INTO aid, uid
    FROM crypto_deposit_address cda
    INNER JOIN account ac ON ac.account_id = cda.account_id
    WHERE cda.address = a AND cda.currency_id = currency ;

    tid := edge_credit(uid, currency, amnt);

    INSERT INTO crypto_credited (currency_id, txid, address, transaction_id, user_id)
    VALUES (currency, t, a, tid, uid);

    RETURN tid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE;