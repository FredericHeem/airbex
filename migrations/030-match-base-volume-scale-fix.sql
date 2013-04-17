-- Bug: The bidder is credited with the wrong number of decimal places.
-- Fix: Credit volume * 10^[book scale] instead of just volume

CREATE OR REPLACE FUNCTION match_insert()
  RETURNS trigger AS
$BODY$
DECLARE
    bido order%ROWTYPE;
    asko order%ROWTYPE;
    a bigint;
    v bigint;
    bs_scale int;
    qs_scale int;
    b book%ROWTYPE;
BEGIN
    SELECT * INTO bido FROM "order" WHERE order_id = NEW.bid_order_id;
    SELECT * INTO asko FROM "order" WHERE order_id = NEW.ask_order_id;
    SELECT * INTO b FROM book WHERE book_id = asko.book_id;

    bs_scale := (SELECT scale FROM security WHERE security_id = b.base_security_id);
    qs_scale := (SELECT scale FROM security WHERE security_id = b.quote_security_id);

    UPDATE "order"
    SET volume = volume - NEW.volume, matched = matched + NEW.volume
    WHERE order_id = bido.order_id OR order_id = asko.order_id;

    -- The book uses a volumes expressed in the scale of the security minus the scale of the book
    RAISE NOTICE 'volume %, bs scale %, b scale %', NEW.volume, bs_scale, b.scale;
    v := NEW.volume * 10^b.scale;

    INSERT INTO transaction (debit_account_id, credit_account_id, amount)
    VALUES (user_security_account(asko.user_id, b.base_security_id), user_security_account(bido.user_id, b.base_security_id), v);

    IF random() < 0.5 THEN
        a := ceil(NEW.price * NEW.volume / 10^(bs_scale - qs_scale));
    ELSE
        a := floor(NEW.price * NEW.volume / 10^(bs_scale - qs_scale));
    END IF;

    INSERT INTO transaction (debit_account_id, credit_account_id, amount)
    VALUES (user_security_account(bido.user_id, b.quote_security_id), user_security_account(asko.user_id, b.quote_security_id), a);

    RETURN NEW;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
