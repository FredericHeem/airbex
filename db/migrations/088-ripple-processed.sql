CREATE TABLE ripple_processed
(
  hash character varying(64) primary key,
  returned boolean not null,
  CONSTRAINT check_hash_length CHECK (hash::text ~ '^[A-Z\d]{64}$'::text)
);

INSERT INTO ripple_processed (hash, returned)
SELECT hash, false
FROM ripple_credited;

CREATE OR REPLACE FUNCTION ripple_credit(h character varying, s currency_id, t integer, amnt bigint)
  RETURNS integer AS
$BODY$
DECLARE
        tid int;
        uid int;
BEGIN
    SELECT user_id
    INTO uid
    FROM "user"
    WHERE tag = t;

    IF NOT FOUND THEN
        RAISE 'User with tag % not found.', t;
    END IF;

    INSERT INTO transaction (debit_account_id, credit_account_id, amount)
    VALUES (special_account('edge', s), user_currency_account(uid, s), amnt);

    tid := currval('transaction_transaction_id_seq');

    INSERT INTO ripple_processed (hash, returned)
    VALUES (h, false);

    INSERT INTO ripple_credited (hash, transaction_id)
    VALUES (h, tid);

    RETURN tid;
END; $BODY$
  LANGUAGE plpgsql;
