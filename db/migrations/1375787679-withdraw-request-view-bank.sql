DROP VIEW withdraw_request_view;
DROP VIEW bank_withdraw_request_view;

CREATE OR REPLACE VIEW bank_withdraw_request_view AS
 SELECT bawr.request_id, wr.amount, a.user_id, a.currency_id, wr.state,
    wr.error, wr.created_at, wr.completed_at, bawr.bank_account_id,
    ba.account_number AS bank_account_number,
    ba.iban bank_iban, ba.swiftbic bank_swiftbic,
    ba.routing_number bank_routing_number
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
    bawr.bank_routing_number
   FROM withdraw_request wr
   JOIN account a ON a.account_id = wr.account_id
   LEFT JOIN ripple_withdraw_request rwr ON rwr.request_id = wr.request_id
   LEFT JOIN btc_withdraw_request bwr ON bwr.request_id = wr.request_id
   LEFT JOIN ltc_withdraw_request lwr ON lwr.request_id = wr.request_id
   LEFT JOIN bank_withdraw_request_view bawr ON bawr.request_id = wr.request_id
  ORDER BY wr.request_id DESC;
