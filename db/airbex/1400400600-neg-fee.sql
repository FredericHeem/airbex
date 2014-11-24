update market set fee_bid_taker=0.002, fee_bid_maker=-0.001, fee_ask_taker=0.002,fee_ask_maker=-0.001;

-- match_insert
-- Update the orders:
--    decrease "volume" and increase "match" by the matched volume
--    order_update_trigger() will be invoked
-- Reduce hold: 
--   ask hold = volume (i.e 2 BTC)
--   bid hold = (1 + bid_fee_ratio) * volume * price (EUR)
-- Insert transactions: bid, bid fee, ask and ask fee.
--   bid: set the credit in base currency (i.e BTC) to the buyer by the value of the volume matched, no fees here 
--   bid fees: in quote currency (i.e EUR): volume * price * bid_fee_ratio
--   ask: set the credit for the seller (i.e EUR)  : volume * price * (1 - ask_fee_ratio)
--   ask fees: in quote currency (i.e EUR): volume * price * ask_fee_ratio

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

    bid_credit := NEW.volume;

    IF random() < 0.5 THEN
        ask_credit := ceil(NEW.price * NEW.volume * (1 - asko.fee_ratio) / 10^(bc_scale));
    ELSE
        ask_credit := floor(NEW.price * NEW.volume * (1 - asko.fee_ratio) / 10^(bc_scale));
    END IF;

    RAISE NOTICE 'match_insert: price %, volume %, bid % fee %s, ask % fee %, bid id %, ask id %, mid %', 
        NEW.price,
        NEW.volume,
        bid_credit,
        bido.fee_ratio,
        ask_credit,
        asko.fee_ratio,
        NEW.bid_order_id,
        NEW.ask_order_id,
        asko.market_id;

    -- Reload the bid and ask order modified by the previous order table update
    SELECT * INTO bido FROM "order" WHERE order_id = NEW.bid_order_id;
    SELECT * INTO asko FROM "order" WHERE order_id = NEW.ask_order_id;

    -- Reduce asker hold
    UPDATE "hold"
    SET
        amount = asko.volume
    WHERE hold_id = asko.hold_id;

    -- Reduce bidder hold
    UPDATE "hold"
    SET
        amount = ceil((1 + bido.fee_ratio) * bido.volume * bido.price / (10^(bc_scale))::bigint)
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
            user_currency_account(asko.user_id, m.quote_currency_id),
            special_account('fee', m.quote_currency_id),
            ceil(NEW.volume * NEW.price * asko.fee_ratio / (10^(bc_scale))::bigint),
            'MatchFee',
            (SELECT row_to_json(v) FROM (
                    SELECT
                        NEW.match_id,
                        asko.fee_ratio fee_ratio
                ) v)
        );
    END IF;
    IF asko.fee_ratio < 0 THEN
        INSERT INTO "transaction" (debit_account_id ,credit_account_id, amount, type, details)
        VALUES (
            special_account('fee', m.quote_currency_id),
            user_currency_account(asko.user_id, m.quote_currency_id),
            ceil(- NEW.volume * NEW.price * asko.fee_ratio / (10^(bc_scale))::bigint),
            'MatchFee',
            (SELECT row_to_json(v) FROM (
                    SELECT
                        NEW.match_id,
                        asko.fee_ratio fee_ratio
                ) v)
        );
    END IF;
    
    IF bido.fee_ratio > 0 THEN
        INSERT INTO "transaction" (debit_account_id, credit_account_id, amount, type, details)
        VALUES (
            user_currency_account(bido.user_id, m.quote_currency_id),
            special_account('fee', m.quote_currency_id),
            ceil(NEW.price * NEW.volume * bido.fee_ratio / (10^(bc_scale))::bigint),
            'MatchFee',
            (SELECT row_to_json(v) FROM (
                    SELECT
                        NEW.match_id,
                        bido.fee_ratio fee_ratio
                ) v)
        );
    END IF;
    IF bido.fee_ratio < 0 THEN
        INSERT INTO "transaction" (debit_account_id, credit_account_id, amount, type, details)
        VALUES (
            special_account('fee', m.quote_currency_id),
            user_currency_account(bido.user_id, m.quote_currency_id),
            ceil(- NEW.price * NEW.volume * bido.fee_ratio / (10^(bc_scale))::bigint),
            'MatchFee',
            (SELECT row_to_json(v) FROM (
                    SELECT
                        NEW.match_id,
                        bido.fee_ratio fee_ratio
                ) v)
        );
    END IF;
    
    RETURN NEW;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;