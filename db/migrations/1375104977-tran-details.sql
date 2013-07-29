CREATE TYPE transaction_type AS ENUM (
    'Match',
    'MatchFee',
    'Transfer',
    'Voucher',
    'Credit',
    'Withdraw'
);

ALTER TABLE "transaction"
    ADD COLUMN type transaction_type,
    ADD COLUMN details json;

CREATE OR REPLACE FUNCTION confirm_withdraw(rid integer)
  RETURNS integer AS
$BODY$
DECLARE
        aid int;
        hmnt bigint;
        itid int;
        hid int;
        cid currency_id;
BEGIN
        SELECT h.account_id, h.amount, h.hold_id, a.currency_id INTO aid, hmnt, hid, cid
        FROM withdraw_request wr
        INNER JOIN hold h ON wr.hold_id = h.hold_id
        INNER JOIN account a ON h.account_id = a.account_id
        WHERE wr.request_id = rid;

        IF NOT FOUND THEN
                RAISE EXCEPTION 'request/hold not found';
        END IF;

        UPDATE withdraw_request
        SET
            hold_id = NULL,
            completed_at = current_timestamp,
            state = 'completed'
        WHERE request_id = rid;

        DELETE from hold WHERE hold_id = hid;

        INSERT INTO transaction (debit_account_id, credit_account_id, amount, type, details)
        VALUES (aid, special_account('edge', cid), hmnt, 'Withdraw',
            (SELECT row_to_json(v) FROM (
                SELECT
                    rid request_id
            ) v)
        );

        itid := currval('transaction_transaction_id_seq');

        RETURN itid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

CREATE OR REPLACE FUNCTION edge_credit(uid integer, cid currency_id, amnt bigint)
  RETURNS integer AS
$BODY$
BEGIN
    INSERT INTO "transaction" (debit_account_id, credit_account_id, amount, type)
    VALUES (special_account('edge', cid), user_currency_account(uid, cid), amnt, 'Credit');

    -- Log activity
    INSERT INTO activity (user_id, type, details)
    SELECT
        uid,
        'Credit',
        (SELECT row_to_json(v) FROM (
            SELECT
                cid currency,
                format_decimal(amnt, c.scale) amount
            FROM currency c
            WHERE c.currency_id = cid
        ) v);

    RETURN currval('transaction_transaction_id_seq');
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

    ask_fee_ratio := user_fee_ratio(asko.user_id);
    ask_fee := ceil(ask_fee_ratio * ask_credit);

    bid_fee_ratio := user_fee_ratio(bido.user_id);
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

CREATE OR REPLACE FUNCTION user_transfer_to_email(fuid integer, temail character varying, c currency_id, amnt bigint)
  RETURNS integer AS
$BODY$
DECLARE
        tuid int;
BEGIN
    tuid := (SELECT user_id FROM "user" WHERE email_lower = LOWER(temail));

    IF tuid IS NULL THEN
        RAISE 'User with email % not found', temail;
    END IF;

    INSERT INTO "transaction" (debit_account_id, credit_account_id, amount, type)
    VALUES (user_currency_account(fuid, c), user_currency_account(tuid, c), amnt, 'Transfer');

    RETURN currval('transaction_transaction_id_seq');
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

CREATE OR REPLACE FUNCTION redeem_voucher(vid voucher_id, duid integer)
  RETURNS integer AS
$BODY$
DECLARE
    amnt bigint;
    daid int;
    said int;
    cid currency_id;
BEGIN
    DELETE FROM "hold" h
    USING voucher v, account a
    WHERE
        v.hold_id = h.hold_id AND
        v.voucher_id = vid AND
        a.account_id = h.account_id
    RETURNING h.amount, h.account_id, a.currency_id
    INTO amnt, said, cid;

    IF NOT FOUND THEN
        RAISE 'Voucher % not found.', vid;
    END IF;

    daid := user_currency_account(duid, cid);

    IF daid = said THEN
        RAISE NOTICE 'Voucher being redeemed into source account.';
        RETURN null;
    END IF;

    INSERT INTO "transaction" (debit_account_id, credit_account_id, amount, type, details)
    VALUES (said, daid, amnt, 'Voucher',
        (SELECT row_to_json(v) FROM (
                SELECT
                    vid voucher_id
            ) v)
    );

    RETURN currval('transaction_transaction_id_seq');
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
