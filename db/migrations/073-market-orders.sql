ALTER TABLE "order"
    ALTER COLUMN price DROP NOT NULL;

CREATE OR REPLACE FUNCTION execute_order(oid integer)
  RETURNS integer AS
$BODY$
DECLARE
    o "order"%ROWTYPE;
    othero "order"%ROWTYPE;
    p bigint;
    v bigint;
BEGIN
    RAISE NOTICE 'Executing order %', oid;

    SELECT * INTO o FROM "order" WHERE order_id = oid;

    SELECT * INTO othero
    FROM "order" oo
    WHERE
        oo.volume > 0 AND
        o.market_id = oo.market_id AND
        o.side <> oo.side AND
        (
            o.price IS NULL OR
            (o.side = 0 AND oo.price <= o.price) OR
            (o.side = 1 AND oo.price >= o.price)
        )
    ORDER BY
        CASE WHEN o.side = 0 THEN oo.price ELSE -oo.price END ASC;

    IF NOT FOUND THEN
        RAISE NOTICE 'Could not match order #%', oid;
        RETURN NULL;
    END IF;

    p := othero.price;

    v := (CASE WHEN o.volume > othero.volume THEN othero.volume ELSE o.volume END);

    RAISE NOTICE 'Matching order #% (%@%) with #% (%@%). Actual: %@%',
        o.order_id, o.volume, o.price, othero.order_id, othero.volume, othero.price, v, p;

    INSERT INTO match (bid_order_id, ask_order_id, price, volume)
    VALUES (
        CASE WHEN o.side = 0 THEN o.order_id ELSE othero.order_id END,
        CASE WHEN o.side = 1 THEN o.order_id ELSE othero.order_id END,
        p,
        v);

    IF o.volume > v THEN
        RAISE NOTICE 'Executing order again to match remaining %', o.volume - v;
        PERFORM execute_order(oid);
    END IF;

    RETURN othero.order_id;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

CREATE OR REPLACE FUNCTION order_insert()
  RETURNS trigger AS
$BODY$
DECLARE
    hid int;
    aid int;
    m market%ROWTYPE;
    bc_scale int;
    qc_scale int;
    h bigint;
BEGIN
    IF NEW.volume = 0 THEN
        RAISE EXCEPTION 'Did not expect order to be inserted with zero volume';
    END IF;

    NEW.original = NEW.volume;

    IF NEW.price IS NOT NULL THEN
        RAISE NOTICE 'Creating hold for limit order %', NEW.order_id;

        SELECT * INTO m FROM market WHERE market_id = NEW.market_id;

        IF NEW.side = 0 THEN
            aid = user_currency_account(NEW.user_id, m.quote_currency_id);
        ELSE
            aid = user_currency_account(NEW.user_id, m.base_currency_id);
        END IF;

        SELECT scale INTO bc_scale FROM currency WHERE currency_id = m.base_currency_id;
        SELECT scale INTO qc_scale FROM currency WHERE currency_id = m.quote_currency_id;

        -- Create hold
        h := ceil(CASE
            WHEN NEW.side = 0 THEN NEW.price * NEW.volume / 10^(bc_scale - qc_scale)
            ELSE NEW.volume * 10^(m.scale)
        END);

        INSERT INTO hold (account_id, amount) VALUES (aid, h);
        hid := currval('hold_hold_id_seq');

        NEW.hold_id := hid;
    ELSE
        RAISE NOTICE 'Not creating hold for market order %', NEW.order_id;
    END IF;

    RETURN NEW;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

CREATE OR REPLACE FUNCTION order_insert_match()
  RETURNS trigger AS
$BODY$
DECLARE
    v bigint;
BEGIN
    PERFORM execute_order(NEW.order_id);

    IF NEW.price IS NULL THEN
        SELECT volume INTO v FROM "order" WHERE order_id = NEW.order_id;

        IF v > 0 THEN
            RAISE 'Could not fill entire market order. % remains.', v;
        END IF;
    END IF;

    RETURN NULL;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
