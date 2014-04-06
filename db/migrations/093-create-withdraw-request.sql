CREATE FUNCTION create_withdraw_request (
    aid int,
    method varchar,
    amnt bigint
) RETURNS int AS $$
DECLARE
    hid int;
BEGIN
    INSERT INTO hold (account_id, amount)
    VALUES (aid, amnt);

    hid := currval('hold_hold_id_seq');

    INSERT INTO withdraw_request(method, hold_id, account_id, amount)
    VALUES (method, hid, aid, amnt);

    RETURN currval('withdraw_request_request_id_seq');
END; $$ LANGUAGE plpgsql;

DROP FUNCTION ltc_withdraw(integer, character, bigint);

CREATE OR REPLACE FUNCTION ltc_withdraw(uid integer, a varchar, amount bigint)
  RETURNS integer AS
$BODY$
DECLARE
        rid int;
BEGIN
    rid := create_withdraw_request(user_currency_account(uid, 'LTC'), 'LTC', amount);

    INSERT INTO ltc_withdraw_request (request_id, address)
    VALUES (rid, a);

    RETURN rid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

CREATE OR REPLACE FUNCTION ripple_withdraw(account_id integer, address character varying, amount bigint)
  RETURNS integer AS
$BODY$
DECLARE
    rid int;
BEGIN
    rid := create_withdraw_request(account_id, 'ripple', amount);

    INSERT INTO ripple_withdraw_request (request_id, address)
    VALUES (rid, address);

    RETURN rid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

DROP FUNCTION btc_withdraw(integer, character, bigint);

CREATE OR REPLACE FUNCTION btc_withdraw(uid integer, a varchar, amount bigint)
  RETURNS integer AS
$BODY$
DECLARE
    rid int;
BEGIN
    rid := create_withdraw_request(user_currency_account(uid, 'BTC'), 'BTC', amount);

    INSERT INTO BTC_withdraw_request (request_id, address)
    VALUES (rid, a);

    RETURN rid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
