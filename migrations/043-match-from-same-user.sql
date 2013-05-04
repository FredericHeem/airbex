CREATE OR REPLACE FUNCTION match_insert()
  RETURNS trigger AS
$BODY$
DECLARE
    bido order%ROWTYPE;
    asko order%ROWTYPE;
    a bigint;
    v bigint;
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
    v := NEW.volume * 10^m.scale;

    IF bido.user_id = asko.user_id THEN
        RAISE NOTICE 'Order has been matched with another order from the same user.';
        RETURN NEW;
    END IF;

    INSERT INTO transaction (debit_account_id, credit_account_id, amount)
    VALUES (user_currency_account(asko.user_id, m.base_currency_id), user_currency_account(bido.user_id, m.base_currency_id), v);

    IF random() < 0.5 THEN
        a := ceil(NEW.price * NEW.volume / 10^(bc_scale - qc_scale));
    ELSE
        a := floor(NEW.price * NEW.volume / 10^(bc_scale - qc_scale));
    END IF;

    INSERT INTO transaction (debit_account_id, credit_account_id, amount)
    VALUES (user_currency_account(bido.user_id, m.quote_currency_id), user_currency_account(asko.user_id, m.quote_currency_id), a);

    RETURN NEW;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
