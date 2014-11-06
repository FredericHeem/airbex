ALTER TABLE market
ADD COLUMN quote_scale_diplay int DEFAULT 6;

DROP VIEW IF EXISTS market_summary_view;
DROP VIEW IF EXISTS market_active_view;

CREATE VIEW market_active_view AS
    SELECT * FROM market WHERE active=true;
    
DROP VIEW IF EXISTS market_summary_view;

CREATE VIEW market_summary_view AS
    SELECT m.market_id,
           m.name,
           m.base_currency_id, 
           m.quote_currency_id,
           m.quote_scale_diplay,
            (SELECT max(o.price) AS max FROM order_view o WHERE (((o.market_id = m.market_id) AND (o.type = 'bid')) AND (o.volume > 0))) AS bid, (SELECT min(o.price) AS min FROM order_view o WHERE (((o.market_id = m.market_id) AND (o.type = 'ask')) AND (o.volume > 0))) AS ask, (SELECT om.price FROM (match_view om JOIN "order" bo ON ((bo.order_id = om.bid_order_id))) WHERE (bo.market_id = m.market_id) ORDER BY om.created_at DESC LIMIT 1) AS last, (SELECT max(om.price) AS max FROM (match_view om JOIN "order" bo ON ((bo.order_id = om.bid_order_id))) WHERE ((bo.market_id = m.market_id) AND (age(om.created_at) < '1 day'::interval))) AS high, (SELECT min(om.price) AS min FROM (match_view om JOIN "order" bo ON ((bo.order_id = om.bid_order_id))) WHERE ((bo.market_id = m.market_id) AND (age(om.created_at) < '1 day'::interval))) AS low, (SELECT sum(ma.volume) AS sum FROM (match ma JOIN order_view o ON ((ma.bid_order_id = o.order_id))) WHERE ((o.market_id = m.market_id) AND (age(ma.created_at) < '1 day'::interval))) AS volume 
    FROM market_active_view m ORDER BY m.base_currency_id, m.quote_currency_id;
