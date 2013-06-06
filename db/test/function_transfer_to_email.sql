BEGIN; DO $$ <<fn>>
DECLARE
    u1 int;
    u2 int;
BEGIN
    u1 := create_user('u1@mail.com', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBBB', FALSE);
    u2 := create_user('u2@mail.com', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBBC', FALSE);

    INSERT INTO "transaction" (debit_account_id, credit_account_id, amount)
    VALUES (special_account('edge', 'BTC'), user_currency_account(u1, 'BTC'), 1e8::bigint);

    PERFORM user_transfer_to_email(u1, 'u2@mail.com', 'BTC', 1e8::bigint);

    IF (SELECT balance FROM account WHERE account_id = user_currency_account(u2, 'BTC')) <> 1e8 THEN
        RAISE 'Failed to credit';
    END IF;
END; $$; ROLLBACK;
