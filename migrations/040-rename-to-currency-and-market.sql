DROP VIEW active_order;
DROP VIEW order_depth_view;
DROP VIEW book_view;
DROP VIEW order_view;
DROP VIEW account_transaction;
DROP VIEW transaction_view;
DROP VIEW match_view;

ALTER TABLE "security"
    RENAME TO currency;

ALTER TABLE book
    RENAME TO market;

ALTER TABLE market
    RENAME book_id TO market_id;

ALTER TABLE market
        RENAME base_security_id TO base_currency_id;

ALTER TABLE market
        RENAME quote_security_id TO quote_currency_id;

ALTER TABLE market DROP CONSTRAINT book_base_security_id_fkey;

ALTER INDEX book_pkey
    RENAME TO market_pkey;

ALTER TABLE "order"
    RENAME book_id TO market_id;

ALTER TABLE currency
    RENAME security_id TO currency_id;

ALTER TABLE currency
    ALTER currency_id TYPE varchar(3);

ALTER TABLE account
    RENAME security_id TO currency_id;

CREATE OR REPLACE VIEW order_view AS
 SELECT o.order_id, o.market_id, o.side, o.price, o.volume, o.original,
    o.cancelled, o.matched, o.user_id, o.hold_id,
    (o.price::double precision / (10::double precision ^ m.scale::double precision))::numeric AS price_decimal,
    (o.volume::double precision / (10::double precision ^ (bc.scale - m.scale)::double precision))::numeric AS volume_decimal,
    (o.original::double precision / (10::double precision ^ (bc.scale - m.scale)::double precision))::numeric AS original_decimal,
    (o.cancelled::double precision / (10::double precision ^ (bc.scale - m.scale)::double precision))::numeric AS cancelled_decimal,
    (o.matched::double precision / (10::double precision ^ (bc.scale - m.scale)::double precision))::numeric AS matched_decimal
   FROM "order" o
   JOIN market m ON m.market_id = o.market_id
   JOIN currency bc ON bc.currency_id::text = m.base_currency_id::text;

---

CREATE OR REPLACE VIEW order_depth_view AS
 SELECT order_view.market_id, order_view.side, order_view.price_decimal,
    sum(order_view.volume_decimal) AS volume_decimal
   FROM order_view
  WHERE order_view.volume > 0
  GROUP BY order_view.market_id, order_view.side, order_view.price_decimal
  ORDER BY order_view.market_id, order_view.price_decimal;

---

CREATE OR REPLACE VIEW match_view AS
 SELECT om.match_id, om.bid_order_id, om.ask_order_id, om.price, om.volume,
    om.created,
    (om.price::double precision / (10::double precision ^ m.scale::double precision))::numeric AS price_decimal,
    (om.volume::double precision / (10::double precision ^ (bc.scale - m.scale)::double precision))::numeric AS volume_decimal
   FROM match om
   JOIN "order" bo ON bo.order_id = om.bid_order_id
   JOIN market m ON m.market_id = bo.market_id
   JOIN currency bc ON bc.currency_id::text = m.base_currency_id::text;

---

CREATE OR REPLACE VIEW market_summary_view AS
 SELECT m.market_id, m.scale, m.base_currency_id, m.quote_currency_id,
    ( SELECT max(o.price_decimal) AS max
           FROM order_view o
          WHERE o.market_id = m.market_id AND o.side = 0 AND o.volume > 0) AS bid_decimal,
    ( SELECT min(o.price_decimal) AS min
           FROM order_view o
          WHERE o.market_id = m.market_id AND o.side = 1 AND o.volume > 0) AS ask_decimal,
    ( SELECT om.price_decimal
           FROM match_view om
      JOIN "order" bo ON bo.order_id = om.bid_order_id
     WHERE bo.market_id = m.market_id
     ORDER BY om.created DESC
    LIMIT 1) AS last_decimal,
    ( SELECT max(om.price_decimal) AS max
           FROM match_view om
      JOIN "order" bo ON bo.order_id = om.bid_order_id
     WHERE bo.market_id = m.market_id AND age(om.created) < '1 day'::interval) AS high_decimal,
    ( SELECT min(om.price_decimal) AS min
           FROM match_view om
      JOIN "order" bo ON bo.order_id = om.bid_order_id
     WHERE bo.market_id = m.market_id AND age(om.created) < '1 day'::interval) AS low_decimal,
    ( SELECT sum(o.volume_decimal) AS sum
           FROM order_view o
          WHERE o.market_id = m.market_id) AS volume_decimal
   FROM market m
  ORDER BY m.base_currency_id, m.quote_currency_id;

---

CREATE OR REPLACE VIEW transaction_view AS
 SELECT t.transaction_id, t.debit_account_id, t.credit_account_id, t.amount,
    t.created,
    (t.amount::double precision / (10::double precision ^ c.scale::double precision))::numeric AS amount_decimal
   FROM transaction t
   JOIN account da ON da.account_id = t.debit_account_id
   JOIN currency c ON c.currency_id::text = da.currency_id::text;

---

CREATE OR REPLACE VIEW account_transaction_view AS
    SELECT t.transaction_id, t.created, t.amount, t.amount_decimal, t.account_id,
    t.currency_id, t.user_id
    FROM (         SELECT dt.transaction_id, dt.created, - dt.amount AS amount,
                    - dt.amount_decimal AS amount_decimal,
                    dt.debit_account_id AS account_id, a.currency_id, a.user_id
                   FROM transaction_view dt
              JOIN account a ON a.account_id = dt.debit_account_id
        UNION
                 SELECT ct.transaction_id, ct.created, ct.amount,
                    ct.amount_decimal, ct.credit_account_id AS account_id,
                    a.currency_id, a.user_id
                   FROM transaction_view ct
              JOIN account a ON a.account_id = ct.credit_account_id) t
  ORDER BY t.transaction_id;

---

CREATE VIEW active_order_view AS
    SELECT * FROM order_view
    WHERE volume > 0;

---

ALTER SEQUENCE book_book_id_seq
    RENAME TO market_market_id_seq;

ALTER TABLE account DROP CONSTRAINT account_security_id_fkey;

ALTER TABLE account
  ADD CONSTRAINT account_currency_id_fkey FOREIGN KEY (currency_id)
      REFERENCES currency (currency_id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE NO ACTION;

ALTER INDEX security_pkey
    RENAME TO currency_pkey;

ALTER TYPE security_id
    RENAME TO currency_id;

---

DROP FUNCTION user_security_account(int, currency_id);
DROP FUNCTION special_account(t account_type, cid currency_id);

---

CREATE OR REPLACE FUNCTION user_currency_account(uid integer, cid currency_id)
  RETURNS integer AS
$BODY$
DECLARE
    aid int;
BEGIN
    SELECT account_id INTO aid FROM account WHERE user_id = uid AND currency_id = cid;

    IF NOT FOUND THEN
        INSERT INTO account (user_id, currency_id, type) VALUES (uid, cid, 'current');
        aid := currval('account_account_id_seq');

        RAISE NOTICE 'created % account for user % (%)', cid, uid, aid;
    END IF;

    RETURN aid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

---

CREATE OR REPLACE FUNCTION create_user(email character varying, key character varying)
  RETURNS integer AS
$BODY$
DECLARE
        user_id int;
BEGIN
        INSERT INTO "user" (email, email_lower) VALUES (email, LOWER(email));
        user_id := currval('user_user_id_seq');

        INSERT INTO api_key (api_key_id, user_id)
        VALUES (key, user_id);

        PERFORM user_currency_account(user_id, 'BTC');
        PERFORM user_currency_account(user_id, 'XRP');
        PERFORM user_currency_account(user_id, 'LTC');

        RETURN user_id;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

---

CREATE OR REPLACE FUNCTION special_account(t account_type, cid currency_id)
  RETURNS integer AS
$BODY$
DECLARE
        res int;
BEGIN
        SELECT account_id INTO res FROM account WHERE "type" = t AND currency_id = cid;
        RETURN res;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

---

CREATE OR REPLACE FUNCTION transaction_insert()
  RETURNS trigger AS
$BODY$
DECLARE
        dc currency_id;
        cc currency_id;
BEGIN
        SELECT currency_id INTO dc FROM account WHERE account_id = NEW.debit_account_id;
        SELECT currency_id INTO cc FROM account WHERE account_id = NEW.debit_account_id;

        IF dc <> cc THEN
                RAISE EXCEPTION 'currencies do not match, % and %', dc, cc;
        END IF;

        RAISE NOTICE 'transaction % from % to %', NEW.amount, NEW.debit_account_id, NEW.credit_account_id;

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

---

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
    RAISE NOTICE 'before insert trigger for order %', NEW.order_id;

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
    RAISE NOTICE 'creating hold on account % for order %', aid, NEW.order_id;

    h := ceil(CASE WHEN NEW.side = 0 THEN NEW.price * NEW.volume / 10^(bc_scale - qc_scale) ELSE NEW.volume * 10^(m.scale) END);

    RAISE NOTICE 'hold %', h;

    INSERT INTO hold (account_id, amount) VALUES (aid, h);
    hid := currval('hold_hold_id_seq');

    NEW.hold_id := hid;
    NEW.original = NEW.volume;

    RETURN NEW;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

---

CREATE OR REPLACE FUNCTION execute_order(oid integer)
  RETURNS integer AS
$BODY$
DECLARE
    o "order"%ROWTYPE;
    othero "order"%ROWTYPE;
    p bigint;
    v bigint;
BEGIN
    RAISE NOTICE 'executing order %', oid;

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
        RAISE NOTICE 'found nothing to match % with', oid;
        RETURN NULL;
    END IF;

    p := othero.price;

    v := (CASE WHEN o.volume > othero.volume THEN othero.volume ELSE o.volume END);

    RAISE NOTICE 'can match % with % at %', o.order_id, othero.order_id, p;

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

---

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

ALTER TABLE market
  ADD CONSTRAINT market_base_currency_id_fkey FOREIGN KEY (base_currency_id)
      REFERENCES currency (currency_id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE NO ACTION;

ALTER TABLE market
  ADD CONSTRAINT market_quote_currency_id_fkey FOREIGN KEY (quote_currency_id)
      REFERENCES currency (currency_id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE NO ACTION;

ALTER TABLE "order" DROP CONSTRAINT order_book_id_fkey;

ALTER TABLE "order"
  ADD CONSTRAINT order_market_id_fkey FOREIGN KEY (market_id)
      REFERENCES market (market_id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE NO ACTION;

DROP VIEW account_view;

DROP FUNCTION to_decimal(bigint, currency_id);

CREATE OR REPLACE FUNCTION to_decimal(i bigint, c currency_id)
  RETURNS numeric AS
$BODY$
BEGIN
    RETURN (SELECT i / 10^scale FROM currency WHERE currency_id = c);
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

CREATE OR REPLACE VIEW account_view AS
 SELECT a.account_id, a.security_id, a.balance, a.hold, a.type, a.user_id, a.available, to_decimal(a.balance, a.security_id) AS balance_decimal, to_decimal(a.available, a.security_id) AS available_decimal, to_decimal(a.hold, a.security_id) AS hold_decimal
   FROM ( SELECT account.account_id, account.currency_id AS security_id, account.balance, account.hold, account.type, account.user_id, account.balance - account.hold AS available
           FROM account) a;

DROP VIEW account_view;

CREATE OR REPLACE VIEW account_view AS
 SELECT a.account_id, a.currency_id, a.balance, a.hold, a.type, a.user_id, a.available, to_decimal(a.balance, a.currency_id) AS balance_decimal, to_decimal(a.available, a.currency_id) AS available_decimal, to_decimal(a.hold, a.currency_id) AS hold_decimal
   FROM ( SELECT account.account_id, account.currency_id AS currency_id, account.balance, account.hold, account.type, account.user_id, account.balance - account.hold AS available
           FROM account) a;

CREATE OR REPLACE FUNCTION pop_btc_withdraw_requests()
  RETURNS SETOF record AS
$BODY$
DECLARE
        rec record;
BEGIN
        DROP TABLE IF EXISTS pop_btc_withdraw_requests;

        CREATE TABLE pop_btc_withdraw_requests AS
        SELECT
                wr.request_id,
                wr.amount,
                c.scale,
                bwr.address
        FROM btc_withdraw_request bwr
        INNER JOIN withdraw_request wr ON bwr.request_id = wr.request_id
        INNER JOIN account a ON a.account_id = wr.account_id
        INNER JOIN currency c ON c.currency_id = a.currency_id
        WHERE wr.state = 'requested';

        UPDATE withdraw_request SET state = 'processing'
        WHERE request_id IN (SELECT request_id FROM pop_btc_withdraw_requests);

        FOR rec IN (SELECT * FROM pop_btc_withdraw_requests) LOOP
                RETURN NEXT rec;
        END LOOP;

        DROP TABLE pop_btc_withdraw_requests;

        RETURN;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100
  ROWS 1000;


CREATE OR REPLACE FUNCTION pop_ltc_withdraw_requests()
  RETURNS SETOF record AS
$BODY$
DECLARE
        rec record;
BEGIN
        DROP TABLE IF EXISTS pop_ltc_withdraw_requests;

        CREATE TABLE pop_ltc_withdraw_requests AS
        SELECT
                wr.request_id,
                wr.amount,
                c.scale,
                bwr.address
        FROM ltc_withdraw_request bwr
        INNER JOIN withdraw_request wr ON bwr.request_id = wr.request_id
        INNER JOIN account a ON a.account_id = wr.account_id
        INNER JOIN currency c ON c.currency_id = a.currency_id
        WHERE wr.state = 'requested';

        UPDATE withdraw_request SET state = 'processing'
        WHERE request_id IN (SELECT request_id FROM pop_ltc_withdraw_requests);

        FOR rec IN (SELECT * FROM pop_ltc_withdraw_requests) LOOP
                RETURN NEXT rec;
        END LOOP;

        DROP TABLE pop_ltc_withdraw_requests;

        RETURN;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100
  ROWS 1000;

CREATE OR REPLACE FUNCTION btc_withdraw(uid integer, a character, amount bigint)
  RETURNS integer AS
$BODY$
DECLARE
        hid int;
        rid int;
BEGIN
        INSERT INTO hold (account_id, amount)
        VALUES (user_currency_account(uid, 'BTC'), amount);

        hid := currval('hold_hold_id_seq');

        INSERT INTO withdraw_request(method, hold_id, account_id, amount)
        VALUES ('BTC', hid, user_currency_account(uid, 'BTC'), amount);

        rid := currval('withdraw_request_request_id_seq');

        INSERT INTO BTC_withdraw_request (request_id, address)
        VALUES (rid, a);

        RETURN rid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

CREATE OR REPLACE FUNCTION ltc_withdraw(uid integer, a character, amount bigint)
  RETURNS integer AS
$BODY$
DECLARE
        hid int;
        rid int;
BEGIN
        INSERT INTO hold (account_id, amount)
        VALUES (user_currency_account(uid, 'LTC'), amount);

        hid := currval('hold_hold_id_seq');

        INSERT INTO withdraw_request(method, hold_id, account_id, amount)
        VALUES ('LTC', hid, user_currency_account(uid, 'LTC'), amount);

        rid := currval('withdraw_request_request_id_seq');

        INSERT INTO ltc_withdraw_request (request_id, address)
        VALUES (rid, a);

        RETURN rid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

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
        SET hold_id = NULL, completed = current_timestamp
        WHERE request_id = rid;

        DELETE from hold WHERE hold_id = hid;

        INSERT INTO transaction (debit_account_id, credit_account_id, amount)
        VALUES (aid, special_account('edge', cid), hmnt);

        itid := currval('transaction_transaction_id_seq');

        RETURN itid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

DROP FUNCTION from_decimal(numeric, currency_id);

CREATE OR REPLACE FUNCTION from_decimal(d numeric, c currency_id)
  RETURNS bigint AS
$BODY$
BEGIN
    -- The following implicit cast to bigint causes an error if the
    -- amount is too precise for the scale of the currency. See PostgreSQL's
    -- documentation under Type Conversion.
    RETURN (SELECT d * 10^scale FROM currency WHERE currency_id = c);
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

DROP FUNCTION user_transfer_to_email(int, varchar, currency_id, bigint);

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

    INSERT INTO "transaction" (debit_account_id, credit_account_id, amount)
    VALUES (user_currency_account(fuid, c), user_currency_account(tuid, c), amnt);

    RETURN currval('transaction_transaction_id_seq');
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
