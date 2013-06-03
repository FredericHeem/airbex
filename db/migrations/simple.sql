-- Make existing users advanced
ALTER TABLE "user"
    ADD COLUMN simple BOOLEAN NOT NULL DEFAULT(false);

ALTER TABLE "user"
    ALTER COLUMN simple DROP DEFAULT;

---------------

DROP FUNCTION create_user(character varying, character varying);

CREATE OR REPLACE FUNCTION create_user(email character varying, key character varying, simple boolean)
  RETURNS integer AS
$BODY$
DECLARE
        user_id int;
BEGIN
        INSERT INTO "user" (email, email_lower, simple) VALUES (email, LOWER(email), simple);
        user_id := currval('user_user_id_seq');

        INSERT INTO api_key (api_key_id, user_id, "primary")
        VALUES (key, user_id, true);

        -- Pre-create accounts so that user_currency_account is read-only safe
        INSERT INTO account (currency_id, "type", user_id) VALUES
            ('BTC', 'current', user_id),
            ('XRP', 'current', user_id),
            ('LTC', 'current', user_id),
            ('NOK', 'current', user_id);

        RETURN user_id;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

-----------------------


CREATE OR REPLACE FUNCTION order_insert()
  RETURNS trigger AS
$BODY$
DECLARE
    hid int;
    aid int;
    m market%ROWTYPE;
    bc_scale int;
    qc_scale int;
    h bigint;
BEGIN
    IF NEW.hold_id IS NOT NULL THEN
        RAISE EXCEPTION 'did not expect order to have hold set at insert';
    END IF;

    IF NEW.volume = 0 THEN
        RAISE EXCEPTION 'did not expect order to be inserted with zero volume';
    END IF;

    SELECT * INTO m FROM market WHERE market_id = NEW.market_id;

    IF NEW.side = 0 THEN
        aid = user_currency_account(NEW.user_id, m.quote_currency_id);
    ELSE
        aid = user_currency_account(NEW.user_id, m.base_currency_id);
    END IF;

    SELECT scale INTO bc_scale FROM currency WHERE currency_id = m.base_currency_id;
    SELECT scale INTO qc_scale FROM currency WHERE currency_id = m.quote_currency_id;

    -- create hold
    h := ceil(CASE WHEN NEW.side = 0 THEN NEW.price * NEW.volume / 10^(bc_scale - qc_scale) ELSE NEW.volume * 10^(m.scale) END);

    INSERT INTO hold (account_id, amount) VALUES (aid, h);
    hid := currval('hold_hold_id_seq');

    NEW.hold_id := hid;
    NEW.original = NEW.volume;

    RETURN NEW;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

CREATE OR REPLACE FUNCTION match_insert()
  RETURNS trigger AS
$BODY$
DECLARE
    bido order%ROWTYPE;
    asko order%ROWTYPE;
    ask_credit bigint;
    bid_credit bigint;
    bid_fee_ratio decimal(6, 4);
    ask_fee_ratio decimal(6, 4);
    bid_fee bigint;
    ask_fee bigint;
    bc_scale int;
    qc_scale int;
    m market%ROWTYPE;
BEGIN
    SELECT * INTO bido FROM "order" WHERE order_id = NEW.bid_order_id;
    SELECT * INTO asko FROM "order" WHERE order_id = NEW.ask_order_id;
    SELECT * INTO m FROM market WHERE market_id = asko.market_id;

    bc_scale := (SELECT scale FROM currency WHERE currency_id = m.base_currency_id);
    qc_scale := (SELECT scale FROM currency WHERE currency_id = m.quote_currency_id);

    UPDATE "order"
    SET volume = volume - NEW.volume, matched = matched + NEW.volume
    WHERE order_id = bido.order_id OR order_id = asko.order_id;

    -- The book uses a volumes expressed in the scale of the currency minus the scale of the book
    bid_credit := NEW.volume * 10^m.scale;

    IF bido.user_id = asko.user_id THEN
        RAISE NOTICE 'Order has been matched with another order from the same user.';
        RETURN NEW;
    END IF;

    IF random() < 0.5 THEN
        ask_credit := ceil(NEW.price * NEW.volume / 10^(bc_scale - qc_scale));
    ELSE
        ask_credit := floor(NEW.price * NEW.volume / 10^(bc_scale - qc_scale));
    END IF;

    ask_fee_ratio := user_fee_ratio(asko.user_id);
    ask_fee := ceil(ask_fee_ratio * ask_credit);

    bid_fee_ratio := user_fee_ratio(bido.user_id);
    bid_fee := ceil(bid_fee_ratio * bid_credit);

    INSERT INTO transaction (debit_account_id, credit_account_id, amount)
    VALUES (user_currency_account(asko.user_id, m.base_currency_id), user_currency_account(bido.user_id, m.base_currency_id), bid_credit);

    INSERT INTO transaction (debit_account_id, credit_account_id, amount)
    VALUES (user_currency_account(bido.user_id, m.quote_currency_id), user_currency_account(asko.user_id, m.quote_currency_id), ask_credit);

    -- Fees
    IF ask_fee > 0 THEN
        RAISE NOTICE 'Fee for asker is % %', ask_fee / 10^qc_scale, m.quote_currency_id;

        INSERT INTO "transaction" (debit_account_id ,credit_account_id, amount)
        VALUES (user_currency_account(asko.user_id, m.quote_currency_id), special_account('fee', m.quote_currency_id), ask_fee);
    END IF;

    IF bid_fee > 0 THEN
        RAISE NOTICE 'Fee for bidder is % %', bid_fee / 10^bc_scale, m.base_currency_id;

        INSERT INTO "transaction" (debit_account_id ,credit_account_id, amount)
        VALUES (user_currency_account(bido.user_id, m.base_currency_id), special_account('fee', m.base_currency_id), bid_fee);
    END IF;

    RETURN NEW;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

CREATE OR REPLACE FUNCTION execute_order(oid integer)
  RETURNS integer AS
$BODY$
DECLARE
    o "order"%ROWTYPE;
    othero "order"%ROWTYPE;
    p bigint;
    v bigint;
BEGIN
    RAISE NOTICE 'Executing order #%', oid;

    SELECT * INTO o FROM "order" WHERE order_id = oid;

    SELECT * INTO othero
    FROM "order" oo
    WHERE
        oo.volume > 0 AND
        o.market_id = oo.market_id AND
        o.side <> oo.side AND
        (

            (o.side = 0 AND oo.price <= o.price) OR
            (o.side = 1 AND oo.price >= o.price)
        )
    ORDER BY
        CASE WHEN o.side = 0 THEN oo.price ELSE -oo.price END ASC;

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
        PERFORM execute_order(oid);
    END IF;

    RETURN othero.order_id;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

-------------------------------

CREATE OR REPLACE FUNCTION bank_credit(uid integer, cid currency_id, amnt bigint, bid integer, ref character varying)
  RETURNS integer AS
$BODY$
DECLARE
    tid int;
BEGIN
    tid := edge_credit(uid, cid, amnt);

    INSERT INTO bank_credited (transaction_id, bank_account_id, reference)
    VALUES (tid, bid, ref);

    IF (SELECT simple FROM "user" WHERE user_id = uid) = TRUE THEN
        PERFORM spend_credit(tid);
    END IF;

    RETURN tid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

CREATE OR REPLACE FUNCTION order_after_update() RETURNS trigger AS $$
BEGIN
    RAISE NOTICE 'Order #% updated from % to %',
        OLD.order_id, OLD.volume, NEW.volume;

    IF NEW.hold_id IS NULL AND OLD.hold_id IS NOT NULL THEN
        RAISE NOTICE 'Deleting hold % for order %', OLD.hold_id, OLD.order_id;
        DELETE FROM hold WHERE hold_id = OLD.hold_id;
    END IF;

    RETURN NULL;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION spend_credit (
    tid int
) RETURNS void AS $$
DECLARE
    remain bigint;
    ao "order"%rowtype;
    price int;
    amnt bigint;
    t "transaction"%rowtype;
    ms int;
    uid int;
    m market%ROWTYPE;
    bcs int;
    qcs int;
    filled boolean;
BEGIN
    SELECT * INTO t FROM "transaction" WHERE transaction_id = tid;
    uid := (SELECT user_id FROM account WHERE account_id = t.credit_account_id);

    SELECT *
    INTO m
    FROM market
    INNER JOIN account a ON a.account_id = t.credit_account_id
    WHERE
        base_currency_id = 'BTC' AND
        quote_currency_id = a.currency_id;

    bcs := (SELECT scale FROM currency WHERE currency_id = m.base_currency_id);
    qcs := (SELECT scale FROM currency WHERE currency_id = m.quote_currency_id);

    IF m IS NULL THEN
        RAISE 'Market not found to perform simple conversion.';
    END IF;

    SELECT * INTO t FROM "transaction" WHERE transaction_id = tid;

    remain := t.amount;

    RAISE NOTICE 'Attempting to match remaining % (%)', remain, remain / 10^qcs;

    FOR ao IN
    SELECT *
    FROM "order"
    WHERE side = 1 AND volume > 0
    ORDER BY price ASC, order_id ASC
    LOOP
        RAISE NOTICE '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!';

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

        RAISE NOTICE 'Subtacting from remaining (%) amount (%) * price (%)', remain, amnt, ao.price;

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
END; $$ LANGUAGE plpgsql;
