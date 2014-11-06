DROP VIEW IF EXISTS withdraw_request_view ;
CREATE VIEW withdraw_request_view AS
 SELECT wr.request_id, wr.created_at, wr.completed_at, wr.method, wr.amount,
    wr.state, wr.error, a.currency_id, a.user_id,
    cwr.address AS address,
    bawr.bank_account_number, bawr.bank_iban, bawr.bank_swiftbic,
    bawr.bank_routing_number, bawr.bank_force_swift
   FROM withdraw_request wr
   JOIN account a ON a.account_id = wr.account_id
   LEFT JOIN crypto_withdraw_request cwr ON cwr.request_id = wr.request_id
   LEFT JOIN bank_withdraw_request_view bawr ON bawr.request_id = wr.request_id
   WHERE a.active=true
  ORDER BY wr.request_id DESC;