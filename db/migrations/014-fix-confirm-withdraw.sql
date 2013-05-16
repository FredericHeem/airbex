CREATE OR REPLACE FUNCTION confirm_withdraw(rid integer)
  RETURNS integer AS
$BODY$
DECLARE
        aid int;
        hmnt bigint;
        itid int;
        hid int;
        sid security_id;
BEGIN
        SELECT h.account_id, h.amount, h.hold_id, a.security_id INTO aid, hmnt, hid, sid
        FROM withdraw_request wr
        INNER JOIN hold h ON wr.hold_id = h.hold_id
        INNER JOIN account a ON h.account_id = a.account_id
        WHERE wr.request_id = rid;

        IF NOT FOUND THEN
                RAISE EXCEPTION 'request/hold not found';
        END IF;

        UPDATE withdraw_request
        SET hold_id = NULL, completed = current_timestamp
        WHERE request_id = rid;

        DELETE from hold WHERE hold_id = hid;

        INSERT INTO transaction (debit_account_id, credit_account_id, amount)
        VALUES (aid, special_account('edge', sid), hmnt);

        itid := currval('transaction_transaction_id_seq');

        RETURN itid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
