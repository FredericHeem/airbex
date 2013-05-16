CREATE OR REPLACE FUNCTION btc_withdraw(uid integer, a character, amount bigint)
  RETURNS integer AS
$BODY$
DECLARE
        hid int;
        rid int;
BEGIN
        INSERT INTO hold (account_id, amount)
        VALUES (user_security_account(uid, 'BTC'), amount);

        hid := currval('hold_hold_id_seq');

        INSERT INTO withdraw_request(method, hold_id, account_id, amount)
        VALUES ('BTC', hid, user_security_account(uid, 'BTC'), amount);

        rid := currval('withdraw_request_request_id_seq');

        INSERT INTO BTC_withdraw_request (request_id, address)
        VALUES (rid, a);

        RETURN rid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;