CREATE OR REPLACE FUNCTION create_order_aon(user_id integer, market_id integer, side integer, price numeric, volume numeric)
  RETURNS integer AS
$BODY$
DECLARE
    oid int;
    remaining bigint;
BEGIN
    oid := create_order(user_id, market_id, side, price, volume);

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
