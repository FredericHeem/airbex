DROP VIEW vohlc;

CREATE VIEW vohlc AS
WITH
    match_expanded AS (
        SELECT
            mk.base_currency_id || mk.quote_currency_id market,
            mt.created_at,
            cast(mt.created_at as date) created_date,
            mt.volume,
            mt.price,
            mk.market_id
        FROM "match" mt
        INNER JOIN "order" o ON mt.ask_order_id = o.order_id
        INNER JOIN market mk ON mk.market_id = o.market_id
    ), market_dates AS (
        SELECT
            market,
            created_date
        FROM
            match_expanded
        GROUP BY
            market,
            created_date
    ), match_expanded_dec AS (
        SELECT
            me.market,
            me.created_at,
            me.created_date,
            me.volume,
            me.price
        FROM match_expanded me
        INNER JOIN market m ON me.market_id = m.market_id
        INNER JOIN currency bc ON bc.currency_id = m.base_currency_id
    )
SELECT
    md.created_date "date",
    md.market,
    (
        SELECT SUM(volume::bigint)::bigint
        FROM match_expanded_dec me
        WHERE me.market = md.market AND me.created_date = md.created_date
    ) volume,
    (
        SELECT price
        FROM match_expanded_dec me
        WHERE me.market = md.market AND me.created_date = md.created_date
        ORDER BY me.created_at ASC
        LIMIT 1
    ) "open",
    (
        SELECT MAX(price)
        FROM match_expanded_dec me
        WHERE me.market = md.market AND me.created_date = md.created_date
    ) "high",
    (
        SELECT MIN(price)
        FROM match_expanded_dec me
        WHERE me.market = md.market AND me.created_date = md.created_date
    ) "low",
    (
        SELECT price
        FROM match_expanded_dec me
        WHERE me.market = md.market AND me.created_date = md.created_date
        ORDER BY me.created_at DESC
        LIMIT 1
    ) "close"
FROM market_dates md
ORDER BY md.market, md.created_date;
