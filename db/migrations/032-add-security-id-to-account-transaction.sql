DROP VIEW account_transaction;

CREATE OR REPLACE VIEW account_transaction AS
SELECT
    t.transaction_id,
    t.created,
    t.amount,
    t.amount_decimal,
    t.account_id,
    security_id,
    user_id
FROM
    (SELECT
        dt.transaction_id,
        dt.created,
        -dt.amount amount,
        -dt.amount_decimal amount_decimal,
        dt.debit_account_id account_id,
        security_id,
        user_id
    FROM transaction_view dt
    JOIN account a ON a.account_id = dt.debit_account_id
    UNION
    SELECT
        ct.transaction_id,
        ct.created,
        ct.amount,
        ct.amount_decimal,
        ct.credit_account_id account_id,
        security_id,
        user_id
    FROM transaction_view ct
    JOIN account a ON a.account_id = ct.credit_account_id) t
ORDER BY t.transaction_id;
