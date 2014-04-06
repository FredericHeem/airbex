-- views
-- 20140220 remove market scale

CREATE OR REPLACE VIEW order_view AS
    SELECT o.order_id, o.market_id, o.type, o.price, o.volume, o.original, o.cancelled, o.matched, o.user_id, o.hold_id, o.created_at,
     (((o.price)::double precision / ((10)::double precision ^ (qc.scale)::double precision)))::numeric AS price_decimal,
      (((o.volume)::double precision / ((10)::double precision ^ ((bc.scale))::double precision)))::numeric AS volume_decimal, 
      (((o.original)::double precision / ((10)::double precision ^ ((bc.scale))::double precision)))::numeric AS original_decimal, 
      (((o.cancelled)::double precision / ((10)::double precision ^ ((bc.scale))::double precision)))::numeric AS cancelled_decimal,
       (((o.matched)::double precision / ((10)::double precision ^ ((bc.scale))::double precision)))::numeric AS matched_decimal 
    FROM (("order" o JOIN market m ON ((m.market_id = o.market_id))) 
    JOIN currency bc ON (((bc.currency_id)::text = (m.base_currency_id)::text)))
    JOIN currency qc ON qc.currency_id = m.quote_currency_id;

CREATE OR REPLACE VIEW active_order_view AS
    SELECT order_view.order_id, order_view.market_id, order_view.type, order_view.price, order_view.volume, order_view.original, order_view.cancelled, order_view.matched, order_view.user_id, order_view.hold_id, order_view.price_decimal, order_view.volume_decimal, order_view.original_decimal, order_view.cancelled_decimal, order_view.created_at FROM order_view WHERE (order_view.volume > 0);

CREATE OR REPLACE VIEW admin_order_view AS
    SELECT format_decimal(o.price, qc.scale) AS price, 
           o.type, 
           format_decimal(o.volume, (bc.scale)) AS remaining, 
           format_decimal(o.original, (bc.scale)) AS original, 
           format_decimal(o.matched, (bc.scale)) AS matched, o.market_id, 
           ((m.base_currency_id)::text || (m.quote_currency_id)::text) AS market, u.user_id, u.email 
    FROM ((("order" o JOIN market m ON ((m.market_id = o.market_id))) JOIN "user" u ON ((u.user_id = o.user_id))) 
    JOIN currency bc ON (((bc.currency_id)::text = (m.base_currency_id)::text))) 
    JOIN currency qc ON qc.currency_id = m.quote_currency_id
    WHERE (o.volume > 0) ORDER BY o.type, CASE WHEN (o.type = 'bid') THEN (- o.price) ELSE o.price END;

CREATE OR REPLACE VIEW market_summary_view AS
    SELECT m.market_id,
           m.scale,
           m.base_currency_id, 
           m.quote_currency_id,
            (SELECT max(o.price) AS max FROM order_view o WHERE (((o.market_id = m.market_id) AND (o.type = 'bid')) AND (o.volume > 0))) AS bid, (SELECT min(o.price) AS min FROM order_view o WHERE (((o.market_id = m.market_id) AND (o.type = 'ask')) AND (o.volume > 0))) AS ask, (SELECT om.price FROM (match_view om JOIN "order" bo ON ((bo.order_id = om.bid_order_id))) WHERE (bo.market_id = m.market_id) ORDER BY om.created_at DESC LIMIT 1) AS last, (SELECT max(om.price) AS max FROM (match_view om JOIN "order" bo ON ((bo.order_id = om.bid_order_id))) WHERE ((bo.market_id = m.market_id) AND (age(om.created_at) < '1 day'::interval))) AS high, (SELECT min(om.price) AS min FROM (match_view om JOIN "order" bo ON ((bo.order_id = om.bid_order_id))) WHERE ((bo.market_id = m.market_id) AND (age(om.created_at) < '1 day'::interval))) AS low, (SELECT sum(ma.volume) AS sum FROM (match ma JOIN order_view o ON ((ma.bid_order_id = o.order_id))) WHERE ((o.market_id = m.market_id) AND (age(ma.created_at) < '1 day'::interval))) AS volume 
    FROM market m ORDER BY m.base_currency_id, m.quote_currency_id;

CREATE OR REPLACE VIEW order_depth_view AS
    SELECT order_view.market_id, order_view.type, order_view.price_decimal, sum(order_view.volume_decimal) AS volume_decimal, order_view.price, sum(order_view.volume) AS volume FROM order_view WHERE (order_view.volume > 0) GROUP BY order_view.market_id, order_view.type, order_view.price_decimal, order_view.price ORDER BY order_view.market_id, order_view.price_decimal;

CREATE OR REPLACE VIEW order_history AS
    SELECT o.order_id, o.type, o.matched, o.volume, o.user_id, o.original, o.cancelled, o.price, mk.market_id, mk.base_currency_id, mk.quote_currency_id, ((mk.base_currency_id)::text || (mk.quote_currency_id)::text) AS market, (SELECT (sum(((mt.price)::numeric * ((mt.volume)::numeric / (o.matched)::numeric))))::bigint AS sum FROM match mt WHERE ((mt.bid_order_id = o.order_id) OR (mt.ask_order_id = o.order_id))) AS average_price FROM ("order" o JOIN market mk ON ((mk.market_id = o.market_id))) WHERE (o.matched > 0) ORDER BY o.order_id;
