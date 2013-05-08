UPDATE
    withdraw_request
SET
    state = 'completed'
WHERE
    state = 'processing' AND
    hold_id IS NULL;

ALTER TABLE withdraw_request
ADD CONSTRAINT state_check CHECK (state IN ('requested', 'processing', 'cancelled', 'completed'));

ALTER TABLE withdraw_request
ADD CONSTRAINT completed_state CHECK (completed IS NULL OR state IN ('completed', 'cancelled'));

ALTER TABLE withdraw_request
ADD CONSTRAINT error_state CHECK (error IS NULL OR state = 'cancelled');

ALTER TABLE withdraw_request
ADD CONSTRAINT hold_released CHECK (hold_id IS NULL OR state IN ('requested', 'processing'));

CREATE OR REPLACE FUNCTION confirm_withdraw(rid integer)
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
            completed = current_timestamp,
            state = 'completed'
        WHERE request_id = rid;

        DELETE from hold WHERE hold_id = hid;

        INSERT INTO transaction (debit_account_id, credit_account_id, amount)
        VALUES (aid, special_account('edge', cid), hmnt);

        itid := currval('transaction_transaction_id_seq');

        RETURN itid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
