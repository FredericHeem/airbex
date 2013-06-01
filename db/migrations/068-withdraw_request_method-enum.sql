BEGIN;

-- drop dependencies
DROP VIEW withdraw_request_view;

-- migration
CREATE TYPE withdraw_request_method AS
    ENUM ('ripple', 'bank', 'BTC', 'LTC');

ALTER TABLE withdraw_request
    ALTER COLUMN method TYPE withdraw_request_method USING method::withdraw_request_method;

-- re-create dependencies
CREATE OR REPLACE VIEW withdraw_request_view AS
 SELECT wr.request_id, wr.created, wr.completed, wr.method, wr.amount, wr.state,
    wr.error, a.currency_id, a.user_id, rwr.address AS ripple_address,
    bwr.address AS bitcoin_address, lwr.address AS litecoin_address,
    bawr.bank_account_id
   FROM withdraw_request wr
   JOIN account a ON a.account_id = wr.account_id
   LEFT JOIN ripple_withdraw_request rwr ON rwr.request_id = wr.request_id
   LEFT JOIN btc_withdraw_request bwr ON bwr.request_id = wr.request_id
   LEFT JOIN ltc_withdraw_request lwr ON lwr.request_id = wr.request_id
   LEFT JOIN bank_withdraw_request bawr ON bawr.request_id = wr.request_id
  ORDER BY wr.request_id DESC;

ROLLBACK;
