CREATE OR REPLACE FUNCTION confirm_withdraw(rid integer, fee bigint)
  RETURNS integer AS
$BODY$
DECLARE
        aid int;
        hmnt bigint;
        itid int;
        hid int;
        cid currency_id;
BEGIN
    SELECT h.account_id, h.amount, h.hold_id, a.currency_id INTO aid, hmnt, hid, cid
    FROM withdraw_request wr
    INNER JOIN hold h ON wr.hold_id = h.hold_id
    INNER JOIN account a ON h.account_id = a.account_id
    WHERE wr.request_id = rid;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'request/hold not found';
    END IF;

    UPDATE withdraw_request
    SET
        hold_id = NULL,
        completed_at = current_timestamp,
        state = 'completed'
    WHERE request_id = rid;

    DELETE from hold WHERE hold_id = hid;

    INSERT INTO transaction (debit_account_id, credit_account_id, amount, type, details)
    VALUES (aid, special_account('edge', cid), hmnt - fee, 'Withdraw',
        (SELECT row_to_json(v) FROM (
            SELECT
                rid request_id
        ) v)
    )
    RETURNING transaction_id
    INTO itid;

    IF fee > 0 THEN
        INSERT INTO transaction (debit_account_id, credit_account_id, amount, type, details)
        VALUES (aid, special_account('fee', cid), fee, 'WithdrawFee',
            (SELECT row_to_json(v) FROM (
                SELECT
                    rid request_id
            ) v)
        );
    END IF;

    RETURN itid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

CREATE OR REPLACE FUNCTION confirm_withdraw(rid integer)
    RETURNS int AS $$
    SELECT confirm_withdraw(rid, 0);
$$ LANGUAGE SQL;
