DROP VIEW account_transaction_view;
DROP VIEW transaction_view;

CREATE OR REPLACE VIEW transaction_view AS
WITH transaction_cte AS (
    SELECT
        t.transaction_id,
        t.debit_account_id,
        t.credit_account_id,
        t.amount,
        c.currency_id,
        t.created_at,
        t.type,
        da.type debit_account_type,
        ca.type credit_account_type,
        da.user_id debit_user_id,
        ca.user_id credit_user_id,
        format_decimal(t.amount, c.scale) amount_decimal,
        t.details,
        cu.email credit_user_email,
        du.email debit_user_email,
        du.first_name || ' ' || du.last_name debit_user_name,
        cu.first_name || ' ' || cu.last_name credit_user_name,
        CASE
            WHEN da.currency_id = 'BTC' THEN t.amount
            ELSE (t.amount * (10^(8 + mv.scale - c.scale)::int)) / mv.last
        END::bigint amount_btc
    FROM transaction t
    JOIN account da ON da.account_id = t.debit_account_id
    JOIN account ca ON ca.account_id = t.credit_account_id
    JOIN currency c ON c.currency_id = da.currency_id
    LEFT JOIN market_summary_view mv ON mv.base_currency_id = 'BTC' AND mv.quote_currency_id = da.currency_id
    LEFT JOIN "user" cu ON cu.user_id = ca.user_id
    LEFT JOIN "user" du ON du.user_id = da.user_id
)
SELECT
    *,
    format_decimal(amount_btc, 8) amount_btc_decimal
FROM
    transaction_cte;

CREATE OR REPLACE VIEW account_transaction_view AS
SELECT
    t.transaction_id,
    t.created_at,
    t.amount,
    t.account_id,
    t.currency_id,
    t.user_id
FROM
    (SELECT dt.transaction_id, dt.created_at,
                    - dt.amount AS amount,
                    dt.debit_account_id AS account_id, a.currency_id, a.user_id
                   FROM transaction_view dt
              JOIN account a ON a.account_id = dt.debit_account_id
        UNION
                 SELECT ct.transaction_id, ct.created_at, ct.amount,
                    ct.credit_account_id AS account_id, a.currency_id, a.user_id
                   FROM transaction_view ct
              JOIN account a ON a.account_id = ct.credit_account_id) t
ORDER BY t.transaction_id;
