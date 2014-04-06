CREATE OR REPLACE FUNCTION match_insert()
  RETURNS trigger AS
$BODY$
DECLARE
    bido order%ROWTYPE;
    asko order%ROWTYPE;
    ask_credit bigint;
    bid_credit bigint;
    bc_scale int;
    qc_scale int;
    m market%ROWTYPE;
    ucount int;
BEGIN
    SELECT * INTO bido FROM "order" WHERE order_id = NEW.bid_order_id;
    SELECT * INTO asko FROM "order" WHERE order_id = NEW.ask_order_id;
    SELECT * INTO m FROM market WHERE market_id = asko.market_id;

    bc_scale := (SELECT scale FROM currency WHERE currency_id = m.base_currency_id);
    qc_scale := (SELECT scale FROM currency WHERE currency_id = m.quote_currency_id);

    UPDATE "order"
    SET volume = volume - NEW.volume, matched = matched + NEW.volume
    WHERE order_id = bido.order_id OR order_id = asko.order_id;

    GET DIAGNOSTICS ucount = ROW_COUNT;

    IF ucount <> 2 THEN
        RAISE 'Expected 2 order updates, did %', ucount;
    END IF;

    -- The book uses a volumes expressed in the scale of the currency minus the scale of the book
    bid_credit := NEW.volume * 10^m.scale;

    IF random() < 0.5 THEN
        ask_credit := ceil(NEW.price * NEW.volume / 10^(bc_scale - qc_scale));
    ELSE
        ask_credit := floor(NEW.price * NEW.volume / 10^(bc_scale - qc_scale));
    END IF;

    SELECT * INTO bido FROM "order" WHERE order_id = NEW.bid_order_id;
    SELECT * INTO asko FROM "order" WHERE order_id = NEW.ask_order_id;

    -- Reduce asker hold
    UPDATE "hold"
    SET
        amount = asko.volume * (10^m.scale)::bigint +
            ceil(asko.fee_ratio * asko.volume * (10^m.scale)::bigint)
    WHERE hold_id = asko.hold_id;

    -- Reduce bidder hold
    UPDATE "hold"
    SET
        amount = ceil(bido.volume * bido.price / (10^(bc_scale - qc_scale))::bigint) +
            ceil(bido.fee_ratio * bido.volume * bido.price / (10^(bc_scale - qc_scale))::bigint)
    WHERE
        hold_id = bido.hold_id;

    IF bido.user_id <> asko.user_id THEN
        INSERT INTO transaction (debit_account_id, credit_account_id, amount, type, details)
        VALUES (
            user_currency_account(asko.user_id, m.base_currency_id),
            user_currency_account(bido.user_id, m.base_currency_id),
            bid_credit,
            'Match',
            (SELECT row_to_json(v) FROM (
                    SELECT
                        NEW.match_id
                ) v)
        );

        INSERT INTO transaction (debit_account_id, credit_account_id, amount, type, details)
        VALUES (
            user_currency_account(bido.user_id, m.quote_currency_id),
            user_currency_account(asko.user_id, m.quote_currency_id),
            ask_credit,
            'Match',
            (SELECT row_to_json(v) FROM (
                    SELECT
                        NEW.match_id
                ) v)
        );
    END IF;

    -- Fees
    IF asko.fee_ratio > 0 THEN
        INSERT INTO "transaction" (debit_account_id ,credit_account_id, amount, type, details)
        VALUES (
            user_currency_account(asko.user_id, m.base_currency_id),
            special_account('fee', m.base_currency_id),
            ceil(NEW.volume * asko.fee_ratio * (10^m.scale)::bigint),
            'MatchFee',
            (SELECT row_to_json(v) FROM (
                    SELECT
                        NEW.match_id
                ) v)
        );
    END IF;

    IF bido.fee_ratio > 0 THEN
        INSERT INTO "transaction" (debit_account_id, credit_account_id, amount, type, details)
        VALUES (
            user_currency_account(bido.user_id, m.quote_currency_id),
            special_account('fee', m.quote_currency_id),
            ceil(NEW.price * NEW.volume * bido.fee_ratio / (10^(bc_scale - qc_scale))::bigint),
            'MatchFee',
            (SELECT row_to_json(v) FROM (
                    SELECT
                        NEW.match_id
                ) v)
        );
    END IF;

    RETURN NEW;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
