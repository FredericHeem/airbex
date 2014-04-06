-- order_update_trigger
-- 20140220 remove market scale

CREATE OR REPLACE FUNCTION order_update_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.matched > OLD.matched AND NEW.matched = NEW.original THEN
        -- Order has been filled
        INSERT INTO activity (user_id, type, details)
        SELECT
            NEW.user_id,
            'FillOrder',
            (SELECT row_to_json(v) FROM (
                SELECT
                    m.base_currency_id || m.quote_currency_id market,
                    (
                        SELECT format_decimal(sum(price * volume)::bigint, bc.scale + qc.scale)
                        FROM "match"
                        WHERE
                            (NEW.type = 'bid' AND bid_order_id = NEW.order_id) OR
                            (NEW.type = 'ask' AND ask_order_id = NEW.order_id)
                    ) total,
                    NEW.type,
                    format_decimal(NEW.price, qc.scale) price,
                    format_decimal(NEW.original, bc.scale) original,
                    NEW.fee_ratio fee_ratio
                FROM market m
                INNER JOIN currency bc ON bc.currency_id = m.base_currency_id
                INNER JOIN currency qc ON qc.currency_id = m.quote_currency_id
                WHERE m.market_id = NEW.market_id
            ) v);
    END IF;

    RETURN NEW;
END; $$;