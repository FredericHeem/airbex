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

    IF NEW.market_id = (SELECT market_id FROM market WHERE base_currency_id = 'BTC' AND quote_currency_id = 'EUR') THEN
        NEW.fee_ratio := 0;
    END IF;

    IF NEW.market_id = (SELECT market_id FROM market WHERE base_currency_id = 'BTC' AND quote_currency_id = 'USD') THEN
        NEW.fee_ratio := 0;
    END IF;

    RAISE NOTICE 'Assigning fee ratio % to order #% (from user #%)',
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
                ceil(NEW.volume * NEW.price / (10^(bc.scale - qc.scale))::bigint) +
                    ceil(NEW.fee_ratio * NEW.volume * NEW.price / (10^(bc.scale - qc.scale))::bigint)
            ELSE
                NEW.volume * (10^m.scale)::bigint + ceil(NEW.fee_ratio * NEW.volume * (10^m.scale)::bigint)
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
