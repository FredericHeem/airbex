CREATE VIEW order_history AS
SELECT
    o.order_id,
    o.side,
    o.matched,
    o.volume,
    o.user_id,
    o.original,
    o.cancelled,
    o.price,
    mk.market_id,
    mk.base_currency_id,
    mk.quote_currency_id,
    mk.base_currency_id || mk.quote_currency_id market,
    (
        SELECT SUM(mt.price * (mt.volume::numeric / o.matched))::bigint
        FROM match mt
        WHERE
            mt.bid_order_id = o.order_id OR
            mt.ask_order_id = o.order_id
    ) average_price
FROM
    "order" o
INNER JOIN market mk ON mk.market_id = o.market_id
WHERE
    o.matched > 0
ORDER BY
    o.order_id;
