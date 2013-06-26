-- PostgreSQL has no unsigned integer types, so bigint must be used.
-- It's possibly to have a collision, but not very likely.
ALTER TABLE "user"
    ADD COLUMN tag bigint NOT NULL DEFAULT(1 + trunc(random() * 2^32 - 2)),
    ADD UNIQUE (tag);

DROP FUNCTION ripple_credit(h character varying, s currency_id, u integer, amnt bigint);

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

    INSERT INTO ripple_credited (hash, transaction_id)
    VALUES (h, tid);

    RETURN tid;
END; $BODY$
  LANGUAGE plpgsql;
