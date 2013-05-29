DROP VIEW withdraw_request_view;
DROP VIEW manual_withdraw_request_view;
DROP TABLE manual_withdraw_request;
DROP FUNCTION withdraw_manual(user_id integer, currency_id currency_id, amount bigint, destination json);

CREATE TABLE bank_withdraw_request (
    request_id int PRIMARY KEY REFERENCES withdraw_request(request_id),
    bank_account_id int NOT NULL REFERENCES bank_account(bank_account_id)
);

CREATE FUNCTION withdraw_bank(baid int, cid currency_id, amnt bigint)
  RETURNS integer AS
$BODY$ <<fn>>
DECLARE
    aid int;
    hid int;
    rid int;
    uid int;
BEGIN
    uid := (SELECT user_id FROM bank_account WHERE bank_account_id = baid);
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
  LANGUAGE plpgsql;

CREATE OR REPLACE VIEW withdraw_request_view AS
 SELECT wr.request_id, wr.created, wr.completed, wr.method, wr.amount, wr.state,
    wr.error, a.currency_id, a.user_id, rwr.address AS ripple_address,
    bwr.address AS bitcoin_address, lwr.address AS litecoin_address,
    bawr.bank_account_id AS bank_account_id
   FROM withdraw_request wr
   JOIN account a ON a.account_id = wr.account_id
   LEFT JOIN ripple_withdraw_request rwr ON rwr.request_id = wr.request_id
   LEFT JOIN btc_withdraw_request bwr ON bwr.request_id = wr.request_id
   LEFT JOIN ltc_withdraw_request lwr ON lwr.request_id = wr.request_id
   LEFT JOIN bank_withdraw_request bawr ON bawr.request_id = wr.request_id
  ORDER BY wr.request_id DESC;

CREATE OR REPLACE VIEW bank_withdraw_request_view AS
 SELECT bawr.request_id, wr.amount, a.user_id, a.currency_id, wr.state, wr.error,
    wr.created, wr.completed, bawr.bank_account_id
   FROM bank_withdraw_request bawr
   JOIN withdraw_request wr ON wr.request_id = bawr.request_id
   JOIN account a ON a.account_id = wr.account_id
  ORDER BY bawr.request_id DESC;
