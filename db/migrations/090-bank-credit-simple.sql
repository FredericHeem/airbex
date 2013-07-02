CREATE OR REPLACE FUNCTION bank_credit(uid integer, cid currency_id, amnt bigint, ref character varying)
  RETURNS integer AS
$BODY$
DECLARE
    tid int;
    us boolean;
    mid int;
BEGIN
    SELECT "simple"
    INTO us
    FROM "user"
    WHERE user_id = uid;

    IF us IS NULL THEN
        RAISE 'User % not found.', uid;
    END IF;

    tid := edge_credit(uid, cid, amnt);

    INSERT INTO bank_credited (transaction_id, reference)
    VALUES (tid, ref);

    IF us = TRUE THEN
        SELECT market_id
        INTO mid
        FROM market
        WHERE base_currency_id = 'BTC' AND
            quote_currency_id = cid;

        IF mid IS NULL THEN
            RAISE 'Market BTC/% not found.', cid;
        END IF;

        PERFORM convert_bid(uid, mid, amnt);
    END IF;

    RETURN tid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
ALTER FUNCTION bank_credit(integer, currency_id, bigint, character varying)
  OWNER TO postgres;
