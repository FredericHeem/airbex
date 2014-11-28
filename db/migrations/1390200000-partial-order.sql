
-- AFTER UPDATE ON "order"
-- order_update_trigger:
-- Compute and set the fee ratio
-- Insert the "FillOrder" activity
    
CREATE OR REPLACE FUNCTION order_update_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    orderType text := 'FillOrderPartial';
BEGIN
        
    IF NEW.matched > OLD.matched THEN
        IF NEW.matched = NEW.original THEN
            orderType := 'FillOrder';
        END IF;
            
        RAISE NOTICE 'order_update_trigger: volume:%, price: %, original %, match new %, old %s to order #% (from user #%), fee %',
            NEW.volume,
            NEW.price,
            NEW.original,
            NEW.matched,
            OLD.matched,
            NEW.order_id,
            NEW.user_id,
            NEW.fee_ratio; 
        
        -- Order has been filled
        INSERT INTO activity (user_id, type, details)
        SELECT
            NEW.user_id,
            orderType,
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
                    format_decimal((NEW.matched - OLD.matched), bc.scale) filled,
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

UPDATE settings
SET
    notify_email_default = notify_email_default || 'FillOrderPartial => true',
    notify_web_default = notify_web_default || 'FillOrderPartial => true';
