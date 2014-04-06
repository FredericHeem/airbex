-- order_insert()
-- 20140203 Factor fees

CREATE OR REPLACE FUNCTION order_insert()
  RETURNS trigger AS
$BODY$
DECLARE
    hid int;
    aid int;
    bc_scale int;
    qc_scale int;
    h bigint;
BEGIN
    IF NEW.volume = 0 THEN
        RAISE EXCEPTION 'Did not expect order to be inserted with zero volume';
    END IF;

    NEW.original = NEW.volume;

    IF NEW.fee_ratio IS NULL THEN
        NEW.fee_ratio := user_fee_ratio(NEW.user_id);
    END IF;

    RAISE NOTICE 'order_insert: volume:%, price: %, fee ratio: % to order #% (from user #%)',
        NEW.volume,
        NEW.price,
        NEW.fee_ratio,
        NEW.order_id,
        NEW.user_id;

    IF NEW.price IS NOT NULL THEN
        INSERT INTO hold (account_id, amount)
        SELECT
            user_currency_account(
                NEW.user_id,
                CASE WHEN NEW.type = 'ask' THEN bc.currency_id ELSE qc.currency_id END
            ),
            CASE WHEN NEW.type = 'bid' THEN
                ceil((1 + NEW.fee_ratio) * NEW.volume * NEW.price / (10^(bc.scale - qc.scale))::bigint)
            ELSE
                ceil((1 + NEW.fee_ratio) * NEW.volume * (10^m.scale)::bigint)
            END
        FROM
            market m,
            currency bc,
            currency qc
        WHERE
            m.market_id = NEW.market_id AND
            bc.currency_id = m.base_currency_id AND
            qc.currency_id = m.quote_currency_id
        RETURNING
            hold_id INTO hid;

        NEW.hold_id := hid;
    END IF;

    RETURN NEW;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
