DROP VIEW admin_transaction_view;

CREATE OR REPLACE VIEW admin_transaction_view AS
 WITH account_with_user AS (
         SELECT a.account_id, a.currency_id, u.user_id, u.email AS user_email,
            (u.first_name::text || ' '::text) || u.last_name::text AS user_name,
            a.type
           FROM account a
      LEFT JOIN "user" u ON u.user_id = a.user_id
        )
 SELECT t.transaction_id, t.amount, da.currency_id, t.created_at,
    da.user_id AS debit_user_id, ca.user_id AS credit_user_id,
    da.user_name AS debit_user_name, ca.user_name AS credit_user_name,
    da.user_email AS debit_user_email, ca.user_email AS credit_user_email,
    t.type, da.type AS debit_account_type, ca.type AS credit_account_type
   FROM transaction t
   JOIN account_with_user da ON da.account_id = t.debit_account_id
   JOIN account_with_user ca ON ca.account_id = t.credit_account_id;
