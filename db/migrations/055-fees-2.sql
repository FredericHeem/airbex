-- create accounts
INSERT INTO "account" ("type", currency_id)
SELECT 'fee', currency_id
FROM currency;

CREATE DOMAIN fee_ratio decimal(6, 4);

ALTER TABLE "user"
ADD COLUMN fee_ratio fee_ratio;

CREATE FUNCTION user_fee_ratio (
    uid int
) RETURNS fee_ratio AS $$
DECLARE
    result fee_ratio;
BEGIN
    result := (SELECT fee_ratio FROM "user" WHERE user_id = uid);

    IF result IS NOT NULL THEN
        RETURN result;
    END IF;

    -- default is 0.5% (0.005)
    RETURN 0.005;
END; $$ LANGUAGE plpgsql STABLE;

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
    RAISE NOTICE 'volume %, bs scale %, b scale %', NEW.volume, bc_scale, m.scale;
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
    RAISE NOTICE 'calc ask fee ratio % * % = % ( % )', ask_fee_ratio, ask_credit, ask_fee_ratio * ask_credit, ask_fee;

    bid_fee_ratio := user_fee_ratio(bido.user_id);
    bid_fee := ceil(bid_fee_ratio * bid_credit);

    RAISE NOTICE 'price %, %', NEW.price, NEW.price / 10^m.scale;
    RAISE NOTICE 'ask fee ratio is %, and ask fee is %', ask_fee_ratio, ask_fee / 10^qc_scale;
    RAISE NOTICE 'bid fee ratio is %, and bid fee is %', bid_fee_ratio, bid_fee / 10^bc_scale;

    INSERT INTO transaction (debit_account_id, credit_account_id, amount)
    VALUES (user_currency_account(asko.user_id, m.base_currency_id), user_currency_account(bido.user_id, m.base_currency_id), bid_credit);

    INSERT INTO transaction (debit_account_id, credit_account_id, amount)
    VALUES (user_currency_account(bido.user_id, m.quote_currency_id), user_currency_account(asko.user_id, m.quote_currency_id), ask_credit);

    -- Fees
    IF ask_fee > 0 THEN
        RAISE NOTICE 'fee for asker is % %', ask_fee / 10^qc_scale, m.quote_currency_id;

        INSERT INTO "transaction" (debit_account_id ,credit_account_id, amount)
        VALUES (user_currency_account(asko.user_id, m.quote_currency_id), special_account('fee', m.quote_currency_id), ask_fee);
    END IF;

    IF bid_fee > 0 THEN
        RAISE NOTICE 'fee for bidder is % %', bid_fee / 10^bc_scale, m.base_currency_id;

        INSERT INTO "transaction" (debit_account_id ,credit_account_id, amount)
        VALUES (user_currency_account(bido.user_id, m.base_currency_id), special_account('fee', m.base_currency_id), bid_fee);
    END IF;

    RETURN NEW;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;


CREATE OR REPLACE FUNCTION create_order(user_id integer, market_id integer, side integer, price numeric, volume numeric)
  RETURNS integer AS
$BODY$
DECLARE
    m_scale int;
    m_volume_scale int;
BEGIN
    SELECT bc.scale - m.scale, m.scale
    INTO m_volume_scale, m_scale
    FROM market m
    INNER JOIN "currency" bc ON bc.currency_id = m.base_currency_id
    WHERE m.market_id = create_order.market_id;

    IF price % (1 / 10^m_scale)::numeric <> 0 THEN
        RAISE 'price % has too high accuracy', price;
    END IF;

    IF volume % (1 / 10^m_volume_scale)::numeric <> 0 THEN
        RAISE 'volume % has too high accuracy', volume;
    END IF;

    INSERT INTO "order" (user_id, market_id, side, price, volume)
    VALUES (user_id, market_id, side, price * 10^m_scale, volume * 10^m_volume_scale);

    RETURN currval('order_order_id_seq');
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
