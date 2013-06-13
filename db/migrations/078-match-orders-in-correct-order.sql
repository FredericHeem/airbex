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
        CASE WHEN o.side = 0 THEN oo.price ELSE -oo.price END ASC,
        oo.order_id ASC;

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
