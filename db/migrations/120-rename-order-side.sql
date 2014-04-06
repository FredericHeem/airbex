DROP VIEW active_order_view;
DROP VIEW admin_order_view;
DROP VIEW market_summary_view;
DROP VIEW order_depth_view;
DROP VIEW order_history;
DROP VIEW order_view;

CREATE TYPE order_type AS ENUM ('bid', 'ask');

ALTER TABLE "order"
    ADD COLUMN "type" order_type;

UPDATE "order"
    SET "type" = (CASE WHEN side = 0 THEN 'bid' ELSE 'ask' END)::order_type;

ALTER TABLE "order"
    DROP side;

ALTER TABLE "order"
    ALTER "type" SET NOT NULL;

CREATE OR REPLACE FUNCTION convert_ask(uid integer, mid integer, amnt bigint) RETURNS bigint
    LANGUAGE plpgsql
    AS $$
DECLARE
    m market%ROWTYPE;
    old_balance bigint;
    new_balance bigint;
BEGIN
    SELECT *
    INTO m
    FROM market
    WHERE market_id = mid;

    IF NOT FOUND THEN
        RAISE 'Market % not found.', mid;
    END IF;

    old_balance := (SELECT balance FROM account WHERE account_id = user_currency_account(uid, m.quote_currency_id));

    INSERT INTO "order" (user_id, market_id, "type", volume, price)
    VALUES (uid, mid, 'ask', amnt, NULL);

    new_balance := (SELECT balance FROM account WHERE account_id = user_currency_account(uid, m.quote_currency_id));

    IF old_balance = new_balance THEN
        RAISE 'Expected balance to change.';
    END IF;

    RETURN new_balance - old_balance;
END; $$;

CREATE OR REPLACE FUNCTION convert_bid(uid integer, mid integer, amnt bigint) RETURNS void
    LANGUAGE plpgsql
    AS $$ <<fn>>
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
    WHERE type = 'ask' AND volume > 0 AND market_id = mid
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

        INSERT INTO "order" (user_id, market_id, price, "type", volume)
        VALUES (uid, m.market_id, ao.price, 'bid', amnt);

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
END; $$;

DROP FUNCTION create_order_aon(user_id integer, market_id integer, side integer, price bigint, volume bigint);

CREATE FUNCTION create_order_aon(user_id integer, market_id integer, t order_type, price bigint, volume bigint) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    oid int;
    remaining bigint;
BEGIN
    INSERT INTO "order" (user_id, market_id, "type", price, volume)
    VALUES (user_id, market_id, t, price, volume);

    oid := currval('order_order_id_seq');

    SELECT volume
    INTO remaining
    FROM "order"
    WHERE order_id = oid;

    IF remaining > 0 THEN
        RAISE 'Failed to match entire all-or-nothing order';
    END IF;

    RETURN oid;
END; $$;

CREATE OR REPLACE FUNCTION execute_order(oid integer) RETURNS integer
    LANGUAGE plpgsql
    AS $$
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
        o.type <> oo.type AND
        (
            o.price IS NULL OR
            (o.type = 'bid' AND oo.price <= o.price) OR
            (o.type = 'ask' AND oo.price >= o.price)
        )
    ORDER BY
        CASE WHEN o.type = 'bid' THEN oo.price ELSE -oo.price END ASC,
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
        CASE WHEN o.type = 'bid' THEN o.order_id ELSE othero.order_id END,
        CASE WHEN o.type = 'ask' THEN o.order_id ELSE othero.order_id END,
        p,
        v);

    IF o.volume > v THEN
        RAISE NOTICE 'Executing order again to match remaining %', o.volume - v;
        PERFORM execute_order(oid);
    END IF;

    RETURN othero.order_id;
END; $$;

CREATE OR REPLACE FUNCTION order_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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

        IF NEW.type = 'bid' THEN
            aid = user_currency_account(NEW.user_id, m.quote_currency_id);
        ELSE
            aid = user_currency_account(NEW.user_id, m.base_currency_id);
        END IF;

        SELECT scale INTO bc_scale FROM currency WHERE currency_id = m.base_currency_id;
        SELECT scale INTO qc_scale FROM currency WHERE currency_id = m.quote_currency_id;

        -- Create hold
        h := ceil(CASE
            WHEN NEW.type = 'bid' THEN NEW.price * NEW.volume / 10^(bc_scale - qc_scale)
            ELSE NEW.volume * 10^(m.scale)
        END);

        INSERT INTO hold (account_id, amount) VALUES (aid, h);
        hid := currval('hold_hold_id_seq');

        NEW.hold_id := hid;
    ELSE
        RAISE NOTICE 'Not creating hold for market order %', NEW.order_id;
    END IF;

    RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION order_update_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.matched > OLD.matched AND NEW.matched = NEW.original THEN
        -- Order has been filled
        INSERT INTO activity (user_id, type, details)
        SELECT
            NEW.user_id,
            'FillOrder',
            (SELECT row_to_json(v) FROM (
                SELECT
                    m.base_currency_id || m.quote_currency_id market,
                    (
                        SELECT format_decimal(sum(price * volume)::bigint, bc.scale)
                        FROM "match"
                        WHERE
                            (NEW.type = 'bid' AND bid_order_id = NEW.order_id) OR
                            (NEW.type = 'ask' AND ask_order_id = NEW.order_id)
                    ) total,
                    NEW.type,
                    format_decimal(NEW.price, m.scale) price,
                    format_decimal(NEW.original, bc.scale - m.scale) original
                FROM market m
                INNER JOIN currency bc ON bc.currency_id = m.base_currency_id
                INNER JOIN currency qc ON qc.currency_id = m.quote_currency_id
                WHERE m.market_id = NEW.market_id
            ) v);
    END IF;

    RETURN NEW;
END; $$;

CREATE VIEW order_view AS
    SELECT o.order_id, o.market_id, o.type, o.price, o.volume, o.original, o.cancelled, o.matched, o.user_id, o.hold_id, o.created_at, (((o.price)::double precision / ((10)::double precision ^ (m.scale)::double precision)))::numeric AS price_decimal, (((o.volume)::double precision / ((10)::double precision ^ ((bc.scale - m.scale))::double precision)))::numeric AS volume_decimal, (((o.original)::double precision / ((10)::double precision ^ ((bc.scale - m.scale))::double precision)))::numeric AS original_decimal, (((o.cancelled)::double precision / ((10)::double precision ^ ((bc.scale - m.scale))::double precision)))::numeric AS cancelled_decimal, (((o.matched)::double precision / ((10)::double precision ^ ((bc.scale - m.scale))::double precision)))::numeric AS matched_decimal FROM (("order" o JOIN market m ON ((m.market_id = o.market_id))) JOIN currency bc ON (((bc.currency_id)::text = (m.base_currency_id)::text)));

CREATE VIEW active_order_view AS
    SELECT order_view.order_id, order_view.market_id, order_view.type, order_view.price, order_view.volume, order_view.original, order_view.cancelled, order_view.matched, order_view.user_id, order_view.hold_id, order_view.price_decimal, order_view.volume_decimal, order_view.original_decimal, order_view.cancelled_decimal, order_view.created_at FROM order_view WHERE (order_view.volume > 0);

CREATE VIEW admin_order_view AS
    SELECT format_decimal(o.price, m.scale) AS price, o.type, format_decimal(o.volume, (bc.scale - m.scale)) AS remaining, format_decimal(o.original, (bc.scale - m.scale)) AS original, format_decimal(o.matched, (bc.scale - m.scale)) AS matched, o.market_id, ((m.base_currency_id)::text || (m.quote_currency_id)::text) AS market, u.user_id, u.email FROM ((("order" o JOIN market m ON ((m.market_id = o.market_id))) JOIN "user" u ON ((u.user_id = o.user_id))) JOIN currency bc ON (((bc.currency_id)::text = (m.base_currency_id)::text))) WHERE (o.volume > 0) ORDER BY o.type, CASE WHEN (o.type = 'bid') THEN (- o.price) ELSE o.price END;

CREATE VIEW market_summary_view AS
    SELECT m.market_id, m.scale, m.base_currency_id, m.quote_currency_id, (SELECT max(o.price) AS max FROM order_view o WHERE (((o.market_id = m.market_id) AND (o.type = 'bid')) AND (o.volume > 0))) AS bid, (SELECT min(o.price) AS min FROM order_view o WHERE (((o.market_id = m.market_id) AND (o.type = 'ask')) AND (o.volume > 0))) AS ask, (SELECT om.price FROM (match_view om JOIN "order" bo ON ((bo.order_id = om.bid_order_id))) WHERE (bo.market_id = m.market_id) ORDER BY om.created_at DESC LIMIT 1) AS last, (SELECT max(om.price) AS max FROM (match_view om JOIN "order" bo ON ((bo.order_id = om.bid_order_id))) WHERE ((bo.market_id = m.market_id) AND (age(om.created_at) < '1 day'::interval))) AS high, (SELECT min(om.price) AS min FROM (match_view om JOIN "order" bo ON ((bo.order_id = om.bid_order_id))) WHERE ((bo.market_id = m.market_id) AND (age(om.created_at) < '1 day'::interval))) AS low, (SELECT sum(ma.volume) AS sum FROM (match ma JOIN order_view o ON ((ma.bid_order_id = o.order_id))) WHERE ((o.market_id = m.market_id) AND (age(ma.created_at) < '1 day'::interval))) AS volume FROM market m ORDER BY m.base_currency_id, m.quote_currency_id;


CREATE VIEW order_depth_view AS
    SELECT order_view.market_id, order_view.type, order_view.price_decimal, sum(order_view.volume_decimal) AS volume_decimal, order_view.price, sum(order_view.volume) AS volume FROM order_view WHERE (order_view.volume > 0) GROUP BY order_view.market_id, order_view.type, order_view.price_decimal, order_view.price ORDER BY order_view.market_id, order_view.price_decimal;


CREATE VIEW order_history AS
    SELECT o.order_id, o.type, o.matched, o.volume, o.user_id, o.original, o.cancelled, o.price, mk.market_id, mk.base_currency_id, mk.quote_currency_id, ((mk.base_currency_id)::text || (mk.quote_currency_id)::text) AS market, (SELECT (sum(((mt.price)::numeric * ((mt.volume)::numeric / (o.matched)::numeric))))::bigint AS sum FROM match mt WHERE ((mt.bid_order_id = o.order_id) OR (mt.ask_order_id = o.order_id))) AS average_price FROM ("order" o JOIN market mk ON ((mk.market_id = o.market_id))) WHERE (o.matched > 0) ORDER BY o.order_id;
