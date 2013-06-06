BEGIN; DO $$ <<fn>>
DECLARE
    u int;
BEGIN
    u := create_user('u1@mail.com', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBBB', FALSE);

    INSERT INTO "transaction" (debit_account_id, credit_account_id, amount)
    VALUES (special_account('edge', 'BTC'), user_currency_account(u, 'BTC'), 1e8::bigint);

    PERFORM create_order(
        u,
        (SELECT market_id FROM market WHERE base_currency_id = 'BTC' AND quote_currency_id = 'XRP'),
        1,
        '1',
        '1'
    );
END; $$; ROLLBACK;
