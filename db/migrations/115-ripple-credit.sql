CREATE OR REPLACE FUNCTION ripple_credit(h character varying, s currency_id, t bigint, amnt bigint)
  RETURNS integer AS
$BODY$
DECLARE
        tid int;
        uid int;
BEGIN
    SELECT user_id
    INTO uid
    FROM "user"
    WHERE tag = t;

    IF NOT FOUND THEN
        RAISE 'User with tag % not found.', t;
    END IF;

    tid := edge_credit(uid, s, amnt);

    INSERT INTO ripple_processed (hash, returned)
    VALUES (h, false);

    INSERT INTO ripple_credited (hash, transaction_id)
    VALUES (h, tid);

    RETURN tid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
