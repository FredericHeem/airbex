ALTER TABLE bank_withdraw_request
ADD COLUMN force_swift boolean;

CREATE OR REPLACE VIEW bank_withdraw_request_view AS
 SELECT bawr.request_id, wr.amount, a.user_id, a.currency_id, wr.state,
    wr.error, wr.created_at, wr.completed_at, bawr.bank_account_id,
    ba.account_number AS bank_account_number, ba.iban AS bank_iban,
    ba.swiftbic AS bank_swiftbic, ba.routing_number AS bank_routing_number,
    bawr.force_swift bank_force_swift
   FROM bank_withdraw_request bawr
   JOIN withdraw_request wr ON wr.request_id = bawr.request_id
   JOIN account a ON a.account_id = wr.account_id
   JOIN bank_account ba ON ba.bank_account_id = bawr.bank_account_id
  ORDER BY bawr.request_id DESC;

CREATE OR REPLACE VIEW withdraw_request_view AS
 SELECT wr.request_id, wr.created_at, wr.completed_at, wr.method, wr.amount,
    wr.state, wr.error, a.currency_id, a.user_id, rwr.address AS ripple_address,
    bwr.address AS bitcoin_address, lwr.address AS litecoin_address,
    bawr.bank_account_number, bawr.bank_iban, bawr.bank_swiftbic,
    bawr.bank_routing_number, bawr.bank_force_swift
   FROM withdraw_request wr
   JOIN account a ON a.account_id = wr.account_id
   LEFT JOIN ripple_withdraw_request rwr ON rwr.request_id = wr.request_id
   LEFT JOIN btc_withdraw_request bwr ON bwr.request_id = wr.request_id
   LEFT JOIN ltc_withdraw_request lwr ON lwr.request_id = wr.request_id
   LEFT JOIN bank_withdraw_request_view bawr ON bawr.request_id = wr.request_id
  ORDER BY wr.request_id DESC;

CREATE OR REPLACE FUNCTION withdraw_bank(baid integer, cid currency_id, amnt bigint, fs boolean)
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

    INSERT INTO bank_withdraw_request(request_id, bank_account_id, force_swift)
    VALUES (rid, baid, fs);

    RETURN rid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
