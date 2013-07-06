-- Drop dependents

DROP VIEW market_summary_view;
DROP VIEW match_view;
DROP VIEW bank_withdraw_request_view;
DROP VIEW withdraw_request_view;

-- Migrate

ALTER TABLE "match"
    ALTER COLUMN created TYPE timestamptz;

ALTER TABLE withdraw_request
    ALTER COLUMN created TYPE timestamptz;

ALTER TABLE api_key
    ADD COLUMN created_at timestamptz NOT NULL DEFAULT(current_timestamp);

ALTER TABLE btc_deposit_address
    ADD COLUMN created_at timestamptz NOT NULL DEFAULT(current_timestamp);

ALTER TABLE "hold"
    ADD COLUMN created_at timestamptz NOT NULL DEFAULT(current_timestamp);

ALTER TABLE ltc_deposit_address
    ADD COLUMN created_at timestamptz NOT NULL DEFAULT(current_timestamp);

-- Restore dependents

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

CREATE OR REPLACE VIEW match_view AS
 SELECT om.match_id, om.bid_order_id, om.ask_order_id, om.price, om.volume,
    om.created,
    (om.price::double precision / (10::double precision ^ m.scale::double precision))::numeric AS price_decimal,
    (om.volume::double precision / (10::double precision ^ (bc.scale - m.scale)::double precision))::numeric AS volume_decimal
   FROM match om
   JOIN "order" bo ON bo.order_id = om.bid_order_id
   JOIN market m ON m.market_id = bo.market_id
   JOIN currency bc ON bc.currency_id::text = m.base_currency_id::text;

CREATE OR REPLACE VIEW market_summary_view AS
 SELECT m.market_id, m.scale, m.base_currency_id, m.quote_currency_id,
    ( SELECT max(o.price) AS max
           FROM order_view o
          WHERE o.market_id = m.market_id AND o.side = 0 AND o.volume > 0) AS bid,
    ( SELECT min(o.price) AS min
           FROM order_view o
          WHERE o.market_id = m.market_id AND o.side = 1 AND o.volume > 0) AS ask,
    ( SELECT om.price
           FROM match_view om
      JOIN "order" bo ON bo.order_id = om.bid_order_id
     WHERE bo.market_id = m.market_id
     ORDER BY om.created DESC
    LIMIT 1) AS last,
    ( SELECT max(om.price) AS max
           FROM match_view om
      JOIN "order" bo ON bo.order_id = om.bid_order_id
     WHERE bo.market_id = m.market_id AND age(om.created) < '1 day'::interval) AS high,
    ( SELECT min(om.price) AS min
           FROM match_view om
      JOIN "order" bo ON bo.order_id = om.bid_order_id
     WHERE bo.market_id = m.market_id AND age(om.created) < '1 day'::interval) AS low,
    ( SELECT sum(ma.volume) AS sum
           FROM match ma
      JOIN order_view o ON ma.bid_order_id = o.order_id
     WHERE o.market_id = m.market_id AND age(ma.created) < '1 day'::interval) AS volume
   FROM market m
  ORDER BY m.base_currency_id, m.quote_currency_id;

CREATE OR REPLACE VIEW bank_withdraw_request_view AS
 SELECT bawr.request_id, wr.amount, a.user_id, a.currency_id, wr.state,
    wr.error, wr.created, wr.completed, bawr.bank_account_id
   FROM bank_withdraw_request bawr
   JOIN withdraw_request wr ON wr.request_id = bawr.request_id
   JOIN account a ON a.account_id = wr.account_id
  ORDER BY bawr.request_id DESC;
