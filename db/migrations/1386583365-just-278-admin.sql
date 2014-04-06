CREATE VIEW admin_transaction_view AS
WITH account_with_user AS (
    SELECT
        a.account_id,
        a.currency_id,
        u.user_id,
        u.email user_email,
        u.first_name || ' ' || u.last_name user_name
    FROM
        account a
    LEFT JOIN "user" u
        ON u.user_id = a.user_id
)
SELECT
    t.transaction_id,
    t.amount,
    da.currency_id,
    t.created_at,
    da.user_id debit_user_id,
    ca.user_id credit_user_id,
    da.user_name debit_user_name,
    ca.user_name credit_user_name,
    da.user_email debit_user_email,
    ca.user_email credit_user_email,
    t.type
FROM
    transaction t
INNER JOIN account_with_user da
    ON da.account_id = t.debit_account_id
INNER JOIN account_with_user ca
    ON ca.account_id = t.credit_account_id;
