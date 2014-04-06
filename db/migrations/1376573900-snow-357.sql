-- 145035
CREATE INDEX match_bid_order_idx ON match (bid_order_id);
-- 145035
CREATE INDEX match_ask_order_idx ON match (ask_order_id);
-- 145035
CREATE INDEX order_market_id_idx ON "order" (market_id);
--124670
CREATE INDEX market_currencies_idx ON market (base_currency_id, quote_currency_id);
--124664
CREATE INDEX market_base_currency_idx ON market (base_currency_id);
--124664
CREATE INDEX market_quote_currency_idx ON market (quote_currency_id);
--124664
CREATE INDEX order_created_at_idx ON "order" (created_at);
--124664
CREATE INDEX match_created_at_idx ON "match" (created_at);
-- 98356
CREATE INDEX order_type_idx ON "order" (type);
-- 98356
CREATE INDEX order_volume_idx ON "order" (volume);
-- 56351
CREATE INDEX order_price_idx ON "order" (price);
-- 56351
CREATE INDEX match_price_idx ON "match" (price);
-- 56351
CREATE INDEX order_market_type_price ON "order" (market_id, type, price);
-- 56351
CREATE INDEX match_market_type_price ON "order" (market_id, type, price);

CREATE INDEX order_user ON "order" (user_id);

CREATE OR REPLACE VIEW market_summary_view AS
 SELECT m.market_id, m.scale, m.base_currency_id, m.quote_currency_id,
    ( SELECT max(o.price) AS max
           FROM order_view o
          WHERE o.market_id = m.market_id AND o.type = 'bid'::order_type AND o.volume > 0) AS bid,
    ( SELECT min(o.price) AS min
           FROM order_view o
          WHERE o.market_id = m.market_id AND o.type = 'ask'::order_type AND o.volume > 0) AS ask,
    ( SELECT om.price
           FROM match_view om
      JOIN "order" bo ON bo.order_id = om.bid_order_id
     WHERE bo.market_id = m.market_id
     ORDER BY om.created_at DESC
    LIMIT 1) AS last,
    ( SELECT max(om.price) AS max
           FROM match_view om
      JOIN "order" bo ON bo.order_id = om.bid_order_id
     WHERE bo.market_id = m.market_id AND om.created_at >= current_timestamp - '1 day'::interval) AS high,
    ( SELECT min(om.price) AS min
           FROM match_view om
      JOIN "order" bo ON bo.order_id = om.bid_order_id
     WHERE bo.market_id = m.market_id AND om.created_at >= current_timestamp - '1 day'::interval) AS low,
    ( SELECT sum(ma.volume) AS sum
           FROM match ma
      JOIN order_view o ON ma.bid_order_id = o.order_id
     WHERE o.market_id = m.market_id AND ma.created_at >= current_timestamp - '1 day'::interval) AS volume
   FROM market m
  ORDER BY m.base_currency_id, m.quote_currency_id;
