-- Function: match_insert()

-- DROP FUNCTION match_insert();

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
    ucount int;
BEGIN
    SELECT * INTO bido FROM "order" WHERE order_id = NEW.bid_order_id;
    SELECT * INTO asko FROM "order" WHERE order_id = NEW.ask_order_id;
    SELECT * INTO m FROM market WHERE market_id = asko.market_id;

    bc_scale := (SELECT scale FROM currency WHERE currency_id = m.base_currency_id);
    qc_scale := (SELECT scale FROM currency WHERE currency_id = m.quote_currency_id);

    RAISE NOTICE 'Reducing order volumes and increasing matched volumes';

    UPDATE "order"
    SET volume = volume - NEW.volume, matched = matched + NEW.volume
    WHERE order_id = bido.order_id OR order_id = asko.order_id;

    GET DIAGNOSTICS ucount = ROW_COUNT;

    IF ucount <> 2 THEN
        RAISE 'Expected 2 order updates, did %', ucount;
    END IF;

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

    RAISE NOTICE 'Reducing holds.';

    UPDATE "hold"
    SET amount = amount - bid_credit
    WHERE hold_id = asko.hold_id;

    UPDATE "hold"
    SET amount = amount - ask_credit
    WHERE hold_id = bido.hold_id;

    RAISE NOTICE 'Performing base transfer, % %', bid_credit / 10^bc_scale, m.base_currency_id;

    RAISE NOTICE 'Ask user has balance=%, held=% of base', (
        SELECT balance FROM account WHERE user_id = asko.user_id AND currency_id = m.base_currency_id
    ), (
        SELECT hold FROM account WHERE user_id = asko.user_id AND currency_id = m.base_currency_id
    );

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

    RAISE NOTICE 'Performing quote transfer, % %', ask_credit / 10^qc_scale, m.quote_currency_id;

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

    RAISE NOTICE 'Estimating fees.';

    -- BTC/EUR promotion
    IF m.base_currency_id = 'BTC' AND
        m.quote_currency_id = 'EUR' AND
        now() < '2014-01-01'
    THEN
        ask_fee_ratio := 0;
        bid_fee_ratio := 0;
    ELSE
        ask_fee_ratio := user_fee_ratio(asko.user_id);
        bid_fee_ratio := user_fee_ratio(bido.user_id);
    END IF;

    ask_fee := ceil(ask_fee_ratio * ask_credit);
    bid_fee := ceil(bid_fee_ratio * bid_credit);

    NEW.ask_fee = ask_fee;
    NEW.bid_fee = bid_fee;

    -- Fees
    IF ask_fee > 0 THEN
        RAISE NOTICE 'Fee for asker is % %', ask_fee / 10^qc_scale, m.quote_currency_id;

        INSERT INTO "transaction" (debit_account_id ,credit_account_id, amount, type, details)
        VALUES (
            user_currency_account(asko.user_id, m.quote_currency_id),
            special_account('fee', m.quote_currency_id),
            ask_fee,
            'MatchFee',
            (SELECT row_to_json(v) FROM (
                    SELECT
                        NEW.match_id
                ) v)
        );
    END IF;

    IF bid_fee > 0 THEN
        RAISE NOTICE 'Fee for bidder is % %', bid_fee / 10^bc_scale, m.base_currency_id;

        INSERT INTO "transaction" (debit_account_id ,credit_account_id, amount, type, details)
        VALUES (
            user_currency_account(bido.user_id, m.base_currency_id),
            special_account('fee', m.base_currency_id),
            bid_fee,
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
