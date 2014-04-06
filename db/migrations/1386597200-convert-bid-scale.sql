-- convert_bid()
-- 20140220 remove market scale

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
    recv bigint := 0;
BEGIN
    SELECT *
    INTO m
    FROM market
    WHERE market_id = mid;

    SELECT bc.scale, qc.scale
    INTO bcs, qcs
    FROM currency bc, currency qc
    WHERE
        bc.currency_id = m.base_currency_id AND
        qc.currency_id = m.quote_currency_id;

    RAISE NOTICE 'convert_bid: Attempting to match remaining % %', remain, m.quote_currency_id;

    FOR ao IN
    SELECT *
    FROM "order"
    WHERE type = 'ask' AND volume > 0 AND market_id = mid
    ORDER BY price ASC, order_id ASC
    LOOP
        -- (r 10^(q))/a
        amnt := floor(remain  * 10^(bcs) / ao.price);

        RAISE NOTICE 'convert_bid: Level: % % @ % %/%. Can afford % %',
            ao.volume,
            m.base_currency_id,
            ao.price,
            m.quote_currency_id,
            m.base_currency_id,
            amnt,
            m.base_currency_id;

        IF amnt > ao.volume THEN
            amnt := ao.volume;
        ELSE
            filled := TRUE;
        END IF;

        recv = recv + amnt;
        remain := remain - ceil(ao.price * amnt / 10^bcs);

        RAISE NOTICE 'convert_bid: recv % %, remain % %, filled %',
            recv,
            m.base_currency_id,
            remain,
            m.base_currency_id,
            filled;
            
        IF filled = TRUE THEN
            EXIT;
        END IF;
    END LOOP;

    INSERT INTO "order" (user_id, market_id, price, "type", volume)
    VALUES (uid, m.market_id, null, 'bid', recv);
END; $BODY$
  LANGUAGE plpgsql VOLATILE;