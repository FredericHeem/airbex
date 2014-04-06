CREATE VIEW user_transaction_view AS
SELECT
    transaction_id,
    created_at,
    amount,
    type,
    currency_id,
    user_id,
    COUNT(*) OVER() full_row_count
FROM
(
    SELECT
        t.transaction_id,
        -t.amount amount,
        t.created_at,
        t.type,
        a.user_id,
        a.currency_id
    FROM
        transaction t
    INNER JOIN account a
        ON a.account_id = t.debit_account_id
    UNION
    SELECT
        t.transaction_id,
        t.amount,
        t.created_at,
        t.type,
        a.user_id,
        a.currency_id
    FROM
        transaction t
    INNER JOIN account a
        ON a.account_id = t.credit_account_id
) t
ORDER BY
    transaction_id
