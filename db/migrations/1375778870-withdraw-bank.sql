CREATE OR REPLACE FUNCTION withdraw_bank(baid integer, cid currency_id, amnt bigint)
  RETURNS integer AS
$BODY$ <<fn>>
DECLARE
    aid int;
    hid int;
    rid int;
    uid int;
BEGIN
    SELECT user_id
    INTO uid
    FROM bank_account
    WHERE bank_account_id = baid;

    IF NOT FOUND THEN
        RAISE 'Bank account not found.';
    END IF;

    aid := user_currency_account(uid, cid);

    INSERT INTO hold (account_id, amount)
    VALUES (aid, amnt);

    hid := currval('hold_hold_id_seq');

    INSERT INTO withdraw_request(method, hold_id, account_id, amount)
    VALUES ('bank', hid, aid, amnt);

    rid := currval('withdraw_request_request_id_seq');

    INSERT INTO bank_withdraw_request(request_id, bank_account_id)
    VALUES (rid, baid);

    RETURN rid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
