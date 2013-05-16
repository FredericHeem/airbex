CREATE TABLE manual_withdraw_request (
    request_id int PRIMARY KEY NOT NULL REFERENCES withdraw_request(request_id),
    destination json NOT NULL
);

CREATE OR REPLACE FUNCTION withdraw_manual (
    user_id int,
    currency_id currency_id,
    amount bigint,
    destination json
) RETURNS integer AS $$ <<fn>>
DECLARE
    account_id int;
    hold_id int;
    request_id int;
BEGIN
    fn.account_id := user_currency_account(user_id, currency_id);

    INSERT INTO hold (account_id, amount)
    VALUES (account_id, amount);

    hold_id := currval('hold_hold_id_seq');

    INSERT INTO withdraw_request(method, hold_id, account_id, amount)
    VALUES ('manual', hold_id, account_id, amount);

    request_id := currval('withdraw_request_request_id_seq');

    INSERT INTO manual_withdraw_request(request_id, destination)
    VALUES (request_id, destination);

    RETURN request_id;
END; $$ LANGUAGE plpgsql;

DROP VIEW IF EXISTS manual_withdraw_request_view;

CREATE VIEW manual_withdraw_request_view AS
SELECT
    mwr.request_id,
    wr.amount,
    a.user_id,
    a.currency_id,
    state,
    error,
    created,
    completed,
    mwr.destination
FROM
    manual_withdraw_request mwr
INNER JOIN
    withdraw_request wr ON wr.request_id = mwr.request_id
INNER JOIN
    account a ON a.account_id = wr.account_id
ORDER BY
    mwr.request_id DESC;

CREATE OR REPLACE FUNCTION edge_credit (
    user_id int,
    currency_id currency_id,
    amount bigint
) RETURNS integer AS $$ <<fn>>
DECLARE
    account_id int;
    hold_id int;
    request_id int;
BEGIN
    INSERT INTO "transaction" (debit_account_id, credit_account_id, amount)
    VALUES (special_account('edge', currency_id), user_currency_account(user_id, currency_id), amount);

    RETURN currval('transaction_transaction_id_seq');
END; $$ LANGUAGE plpgsql;
