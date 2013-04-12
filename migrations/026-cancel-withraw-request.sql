CREATE FUNCTION cancel_withdraw_request (
    rid int,
        err varchar
) RETURNS int AS $$
DECLARE
        hid int;
BEGIN
    hid := (SELECT hold_id FROM withdraw_request WHERE request_id = rid);

    IF hid IS NULL THEN
        RAISE 'Withdraw request % does not exist or has no hold', rid;
    END IF;

    DELETE FROM "hold" WHERE hold_id = hid;

    UPDATE withdraw_request SET state = 'cancelled', error = err
    WHERE request_id = rid;

    RETURN rid;
END; $$ LANGUAGE plpgsql;
