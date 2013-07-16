CREATE VIEW admin_order_view AS
SELECT
    format_decimal(o.price, m.scale) price,
    o.side "type",
    format_decimal(o.volume, bc.scale - m.scale) remaining,
    format_decimal(o.original, bc.scale - m.scale) original,
    format_decimal(o.matched, bc.scale - m.scale) matched,
    o.market_id,
    m.base_currency_id || m.quote_currency_id market,
    u.user_id,
    u.email
FROM "order" o
INNER JOIN market m ON m.market_id = o.market_id
INNER JOIN "user" u on u.user_id = o.user_id
INNER JOIN currency bc on bc.currency_id = m.base_currency_id
WHERE o.volume > 0
ORDER BY o.side, CASE WHEN o.side = 0 THEN -o.price ELSE o.price END;
