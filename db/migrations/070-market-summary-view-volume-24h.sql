DROP VIEW market_summary_view;

CREATE OR REPLACE VIEW market_summary_view AS
SELECT
    m.market_id,
    m.scale,
    m.base_currency_id,
    m.quote_currency_id,
    (
        SELECT max(o.price) AS max
        FROM order_view o
        WHERE
            o.market_id = m.market_id AND
            o.side = 0 AND
            o.volume > 0
    ) AS bid,
    (
        SELECT min(o.price) AS min
        FROM order_view o
        WHERE
            o.market_id = m.market_id AND
            o.side = 1 AND
            o.volume > 0
    ) AS ask,
    (
        SELECT om.price
        FROM match_view om
        JOIN "order" bo ON bo.order_id = om.bid_order_id
        WHERE bo.market_id = m.market_id
        ORDER BY om.created DESC
        LIMIT 1
    ) AS last,
    (
        SELECT max(om.price) AS max
        FROM match_view om
        JOIN "order" bo ON bo.order_id = om.bid_order_id
        WHERE
            bo.market_id = m.market_id AND
            age(om.created) < '1 day'::interval
    ) AS high,
    (
        SELECT min(om.price) AS min
        FROM match_view om
        JOIN "order" bo ON bo.order_id = om.bid_order_id
        WHERE
            bo.market_id = m.market_id AND
            age(om.created) < '1 day'::interval
    ) AS low,
    (
        SELECT sum(ma.volume)
        FROM "match" ma
        INNER JOIN order_view o ON ma.bid_order_id = o.order_id
        WHERE
            o.market_id = m.market_id AND
            age(ma.created) < '1 day'::interval
    ) AS volume
FROM market m
ORDER BY m.base_currency_id, m.quote_currency_id;
