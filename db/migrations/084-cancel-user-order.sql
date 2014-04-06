CREATE FUNCTION cancel_user_order (
    uid int,
    oid int
) RETURNS void AS $$
BEGIN
    UPDATE "order"
    SET
        cancelled = volume,
        volume = 0
    WHERE
        order_id = oid AND
        volume > 0 AND
        user_id = uid;

    IF NOT FOUND THEN
        RAISE 'Order not found, is filled, or owned by another user.';
    END IF;
END; $$ LANGUAGE plpgsql;
