CREATE OR REPLACE FUNCTION order_update_trigger(
) RETURNS TRIGGER AS $$
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
                        SELECT (sum(price * volume) / 10^bc.scale)::varchar
                        FROM "match"
                        WHERE
                            (NEW.side = 0 AND bid_order_id = NEW.order_id) OR
                            (NEW.side = 1 AND ask_order_id = NEW.order_id)
                    ) total,
                    NEW.side "type",
                    (NEW.price / 10^m.scale)::varchar price,
                    (NEW.original / 10^(bc.scale - m.scale))::varchar original
                FROM market m
                INNER JOIN currency bc ON bc.currency_id = m.base_currency_id
                INNER JOIN currency qc ON qc.currency_id = m.quote_currency_id
                WHERE m.market_id = NEW.market_id
            ) v);
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS order_update_trigger ON "order";

CREATE TRIGGER order_update_trigger
    AFTER UPDATE ON "order"
    FOR EACH ROW
    EXECUTE PROCEDURE order_update_trigger();
