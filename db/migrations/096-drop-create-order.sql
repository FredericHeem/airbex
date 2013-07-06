DROP FUNCTION create_order_aon(integer, integer, integer, numeric, numeric);
DROP FUNCTION create_order(integer, integer, integer, numeric, numeric);

CREATE OR REPLACE FUNCTION create_order_aon(user_id integer, market_id integer, side integer, price bigint, volume bigint)
  RETURNS integer AS
$BODY$
DECLARE
    oid int;
    remaining bigint;
BEGIN
    INSERT INTO "order" (user_id, market_id, side, price, volume)
    VALUES (user_id, market_id, side, price, volume);

    oid := currval('order_order_id_seq');

    SELECT volume
    INTO remaining
    FROM "order"
    WHERE order_id = oid;

    IF remaining > 0 THEN
        RAISE 'Failed to match entire all-or-nothing order';
    END IF;

    RETURN oid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
