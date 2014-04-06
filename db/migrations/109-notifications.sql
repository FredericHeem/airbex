UPDATE settings
SET
    notify_email_default = (
        'FillOrder => true,' ||
        'ReceiveFromUser => true,' ||
        'WithdrawComplete => true,' ||
        'Credit => true,' ||
        'ChangePassword => true'
    )::hstore,
    notify_user_visible = (
        ''
    )
    ::hstore;

-- Add audit to edge_credit
DROP FUNCTION edge_credit(user_id integer, currency_id currency_id, amount bigint);

CREATE OR REPLACE FUNCTION edge_credit(uid integer, cid currency_id, amnt bigint)
  RETURNS integer AS $$
BEGIN
    INSERT INTO "transaction" (debit_account_id, credit_account_id, amount)
    VALUES (special_account('edge', cid), user_currency_account(uid, cid), amnt);

    -- Log activity
    INSERT INTO activity (user_id, type, details)
    SELECT
        uid,
        'Credit',
        (SELECT row_to_json(v) FROM (
            SELECT
                cid currency,
                (amnt::numeric / 10^c.scale)::varchar amount
            FROM currency c
            WHERE c.currency_id = cid
        ) v);

    RETURN currval('transaction_transaction_id_seq');
END; $$
  LANGUAGE plpgsql VOLATILE
  COST 100;
