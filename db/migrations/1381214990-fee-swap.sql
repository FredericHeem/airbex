ALTER TABLE "order"
    ADD COLUMN fee_ratio decimal(6, 4);

UPDATE "order" o
SET fee_ratio = CASE WHEN u.fee_ratio IS NULL THEN 0 ELSE u.fee_ratio END
FROM "user" u
WHERE u.user_id = o.user_id;

ALTER TABLE "order"
ALTER fee_ratio SET NOT NULL;

ALTER TABLE match
    DROP COLUMN ask_fee,
    DROP COLUMN bid_fee;

CREATE OR REPLACE FUNCTION order_insert()
  RETURNS trigger AS
$BODY$
DECLARE
    hid int;
    aid int;
    bc_scale int;
    qc_scale int;
    h bigint;
BEGIN
    IF NEW.volume = 0 THEN
        RAISE EXCEPTION 'Did not expect order to be inserted with zero volume';
    END IF;

    NEW.original = NEW.volume;

    IF NEW.fee_ratio IS NULL THEN
        NEW.fee_ratio := user_fee_ratio(NEW.user_id);
    END IF;

    RAISE NOTICE 'Assigning fee ratio % to order #% (from user #%)',
        NEW.fee_ratio,
        NEW.order_id,
        NEW.user_id;

    IF NEW.price IS NOT NULL THEN
        INSERT INTO hold (account_id, amount)
        SELECT
            user_currency_account(
                NEW.user_id,
                CASE WHEN NEW.type = 'ask' THEN bc.currency_id ELSE qc.currency_id END
            ),
            CASE WHEN NEW.type = 'bid' THEN
                ceil(NEW.volume * NEW.price / (10^(bc.scale - qc.scale))::bigint) +
                    ceil(NEW.fee_ratio * NEW.volume * NEW.price / (10^(bc.scale - qc.scale))::bigint)
            ELSE
                NEW.volume * (10^m.scale)::bigint + ceil(NEW.fee_ratio * NEW.volume * (10^m.scale)::bigint)
            END
        FROM
            market m,
            currency bc,
            currency qc
        WHERE
            m.market_id = NEW.market_id AND
            bc.currency_id = m.base_currency_id AND
            qc.currency_id = m.quote_currency_id
        RETURNING
            hold_id INTO hid;

        NEW.hold_id := hid;
    END IF;

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
        amount = asko.volume * m.scale +
            ceil(asko.fee_ratio * asko.volume * m.scale)
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

CREATE OR REPLACE FUNCTION transaction_insert()
  RETURNS trigger AS
$BODY$
DECLARE
        dc currency_id;
        cc currency_id;
BEGIN
    SELECT currency_id INTO dc FROM account WHERE account_id = NEW.debit_account_id;
    SELECT currency_id INTO cc FROM account WHERE account_id = NEW.credit_account_id;

    IF dc <> cc THEN
        RAISE EXCEPTION 'currencies do not match, % and %', dc, cc;
    END IF;

    RAISE NOTICE 'Transact % % from % to %',
        (SELECT NEW.amount / 10^scale FROM currency WHERE currency_id = dc),
        cc,
        (SELECT CASE WHEN type = 'current' THEN 'user #' || user_id  ELSE type::text END
            FROM account WHERE account_id = NEW.debit_account_id),
        (SELECT CASE WHEN type = 'current' THEN 'user #' || user_id ELSE type::text END
            FROM account WHERE account_id = NEW.credit_account_id);

    UPDATE account SET balance = balance - NEW.amount
    WHERE account_id = NEW.debit_account_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'debit failed, account % not found', NEW.debit_account_id;
    END IF;

    UPDATE account SET balance = balance + NEW.amount
    WHERE account_id = NEW.credit_account_id;

    IF NOT FOUND THEN
                RAISE EXCEPTION 'credit failed, account % not found', NEW.credit_account_id;
    END IF;

    RETURN NEW;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

CREATE OR REPLACE FUNCTION hold_trigger()
  RETURNS trigger AS
$BODY$
DECLARE
    scale int;
    curr currency_id;
    aid int;
BEGIN
    -- For debugging
    SELECT c.currency_id, c.scale, a.account_id
    FROM account a
    INNER JOIN currency c on c.currency_id = a.currency_id
    WHERE a.account_id = CASE WHEN TG_OP = 'INSERT' THEN NEW.account_id ELSE OLD.account_id END
    INTO curr, scale, aid;

    IF TG_OP = 'INSERT' THEN
--         RAISE NOTICE 'Add hold % % to %',
--             NEW.amount / 10^scale,
--             curr,
--             (SELECT CASE WHEN type = 'current' THEN 'user #' || user_id ELSE type::text END
--                 FROM account WHERE account_id = NEW.account_id);

        UPDATE account SET hold = hold + NEW.amount WHERE account_id = NEW.account_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.amount <> NEW.amount THEN
--         RAISE NOTICE 'Change hold from % % to % % (delta % %) for %',
--             OLD.amount / 10^scale,
--             curr,
--             NEW.amount / 10^scale,
--             curr,
--             (NEW.amount - OLD.amount) / 10^scale,
--             curr,
--             (SELECT CASE WHEN type = 'current' THEN 'user #' || user_id ELSE type::text END
--                 FROM account WHERE account_id = NEW.account_id);

        UPDATE account SET hold = hold + (NEW.amount - OLD.amount) WHERE account_id = NEW.account_id;
    ELSIF TG_OP = 'DELETE' THEN
--         RAISE NOTICE 'Remove hold of % % for %',
--             OLD.amount / 10^scale,
--             curr,
--             (SELECT CASE WHEN type = 'current' THEN 'user #' || user_id ELSE type::text END
--                 FROM account WHERE account_id = OLD.account_id);

        UPDATE account SET hold = hold - OLD.amount WHERE account_id = OLD.account_id;
    END IF;

    RETURN NULL;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

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

    RAISE NOTICE 'Attempting to match remaining % %', remain / 10^qcs, m.quote_currency_id;

    FOR ao IN
    SELECT *
    FROM "order"
    WHERE type = 'ask' AND volume > 0 AND market_id = mid
    ORDER BY price ASC, order_id ASC
    LOOP
        -- (r 10^(b-q))/a
        amnt := floor((remain * 10^(bcs - qcs)) / ao.price);

        RAISE NOTICE 'Level: % % @ % %/%. Can afford % %',
            ao.volume / 10^(bcs - m.scale),
            m.base_currency_id,
            ao.price / 10^m.scale,
            m.quote_currency_id,
            m.base_currency_id,
            amnt / 10^(bcs - m.scale),
            m.base_currency_id;

        IF amnt > ao.volume THEN
            amnt := ao.volume;
        ELSE
            filled := TRUE;
        END IF;

        recv = recv + amnt;
        remain := remain - ceil(ao.price * amnt * 10^(qcs - bcs));

        IF filled = TRUE THEN
            EXIT;
        END IF;
    END LOOP;

    INSERT INTO "order" (user_id, market_id, price, "type", volume)
    VALUES (uid, m.market_id, null, 'bid', recv);
END; $BODY$
  LANGUAGE plpgsql VOLATILE;

DROP FUNCTION convert_and_withdraw(integer, integer, integer, bigint);
