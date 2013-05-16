CREATE OR REPLACE FUNCTION user_transfer_to_email(fuid int, temail varchar, s security_id, amnt bigint)
  RETURNS int AS
$BODY$
DECLARE
        tuid int;
BEGIN
    tuid := (SELECT user_id FROM "user" WHERE email_lower = LOWER(temail));

    IF tuid IS NULL THEN
        RAISE 'User with email % not found', temail;
    END IF;

    INSERT INTO "transaction" (debit_account_id, credit_account_id, amount)
    VALUES (user_security_account(fuid, s), user_security_account(tuid, s), amnt);

    RETURN currval('transaction_transaction_id_seq');
END; $BODY$
  LANGUAGE plpgsql;
