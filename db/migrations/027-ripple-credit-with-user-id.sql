DROP FUNCTION ripple_credit(character varying, security_id, integer, bigint);

CREATE FUNCTION ripple_credit(h character varying, s security_id, u integer, amnt bigint)
  RETURNS integer AS
$BODY$
DECLARE
        tid int;
BEGIN
        INSERT INTO transaction (debit_account_id, credit_account_id, amount)
        VALUES (special_account('edge', s), user_security_account(u, s), amnt);

        tid := currval('transaction_transaction_id_seq');

        INSERT INTO ripple_credited (hash, transaction_id)
        VALUES (h, tid);

        RETURN tid;
END; $BODY$
  LANGUAGE plpgsql;
