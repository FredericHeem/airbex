CREATE OR REPLACE FUNCTION convert_bid(uid integer, mid integer, amnt bigint)
  RETURNS void AS
$BODY$ <<fn>>
DECLARE
    m market%ROWTYPE;
    filled boolean = FALSE;
    ao "order"%ROWTYPE;
    v bigint;
    remain bigint := amnt;
    qcs int;
    bcs int;
BEGIN
    SELECT *
    INTO m
    FROM market
    WHERE market_id = mid;

    bcs := (SELECT scale FROM currency WHERE currency_id = m.base_currency_id);
    qcs := (SELECT scale FROM currency WHERE currency_id = m.quote_currency_id);

    IF m IS NULL THEN
        RAISE 'Market not found to perform simple conversion.';
    END IF;

    RAISE NOTICE 'Attempting to match remaining % (%)', remain, remain / 10^qcs;

    FOR ao IN
    SELECT *
    FROM "order"
    WHERE side = 1 AND volume > 0 AND market_id = mid
    ORDER BY price ASC, order_id ASC
    LOOP
        -- (r 10^(b-q))/a
        amnt := floor((remain * 10^(bcs - qcs)) / ao.price);

        RAISE NOTICE 'remain=%; ao.price=%; amnt=%; ao.vol=%', remain, ao.price, amnt, ao.volume;

        IF amnt > ao.volume THEN
            RAISE NOTICE 'Counter order % @ % can only fill % of remaining %',
                ao.order_id, ao.price, ao.volume, remain;

            amnt := ao.volume;
        ELSE
            filled := TRUE;
        END IF;

        INSERT INTO "order" (user_id, market_id, price, side, volume)
        VALUES (uid, m.market_id, ao.price, 0, amnt);

        RAISE NOTICE 'Subtracting from remaining (%) amount (%) * price (%)', remain, amnt, ao.price;

        remain := remain - ceil(ao.price * amnt * 10^(qcs - bcs));

        IF remain < 0 THEN
            RAISE 'Less than zero remaining %', remain;
        END IF;

        IF filled = TRUE THEN
            RAISE NOTICE 'Success, filled. Remaining %', remain;
            RETURN;
        END IF;

        RAISE NOTICE 'Running another iteration to match remaining % (%)', remain, remain / 10^qcs;
    END LOOP;

    RAISE 'Could not match entire amount (no more ask orders)';
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
