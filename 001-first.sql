CREATE TYPE account_type AS ENUM ('current', 'edge');

CREATE DOMAIN security_id varchar(10);

-- user
CREATE TABLE "user" (
    user_id serial NOT NULL PRIMARY KEY
);

-- security
CREATE TABLE security (
    security_id security_id PRIMARY KEY,
    scale int NOT NULL
);

-- account
CREATE TABLE account (
    account_id serial PRIMARY KEY,
    security_id security_id NOT NULL REFERENCES security(security_id),
    balance bigint NOT NULL DEFAULT 0,
    hold bigint NOT NULL DEFAULT 0 CHECK (hold >= 0),
    "type" account_type,
    user_id int REFERENCES "user"(user_id),
    CONSTRAINT non_negative_available CHECK (type = 'edge' OR balance - hold >= 0)
);

-- account helpers
CREATE FUNCTION user_security_account (
    uid int,
    sid security_id
) RETURNS int AS $$
DECLARE
    aid int;
BEGIN
    SELECT account_id INTO aid FROM account WHERE user_id = uid AND security_id = sid;

    IF NOT FOUND THEN
        INSERT INTO account (user_id, security_id, type) VALUES (uid, sid, 'current');
        aid := currval('account_account_id_seq');

        RAISE NOTICE 'created % account for user % (%)', sid, uid, aid;
    END IF;

    RETURN aid;
END; $$ LANGUAGE plpgsql;

-- transaction
CREATE TABLE transaction (
    transaction_id serial PRIMARY KEY,
    debit_account_id int NOT NULL REFERENCES account(account_id),
    credit_account_id int NOT NULL REFERENCES account(account_id),
    amount bigint NOT NULL CHECK(amount > 0)
);

CREATE FUNCTION transaction_insert() RETURNS trigger AS $$
DECLARE
        dsec security_id;
        csec security_id;
BEGIN
        SELECT security_id INTO dsec FROM account WHERE account_id = NEW.debit_account_id;
        SELECT security_id INTO csec FROM account WHERE account_id = NEW.debit_account_id;

        IF dsec <> csec THEN
                RAISE EXCEPTION 'securities do not match, % and %', dsec, csec;
        END IF;

        RAISE NOTICE 'transaction % from % to %', NEW.amount, NEW.debit_account_id, NEW.credit_account_id;

    UPDATE account SET balance = balance - NEW.amount
    WHERE account_id = NEW.debit_account_id;

    IF NOT FOUND THEN
                RAISE EXCEPTION 'debit failed';
        END IF;

    UPDATE account SET balance = balance + NEW.amount
    WHERE account_id = NEW.credit_account_id;

    IF NOT FOUND THEN
                RAISE EXCEPTION 'credit failed';
        END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER transaction_insert
    BEFORE INSERT ON "transaction"
    FOR EACH ROW
    EXECUTE PROCEDURE transaction_insert();

-- hold
CREATE TABLE hold (
    hold_id serial PRIMARY KEY,
    account_id int NOT NULL REFERENCES account(account_id),
    amount bigint NOT NULL CHECK (amount > 0)
);

CREATE FUNCTION hold_trigger() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE account SET hold = hold + NEW.amount WHERE account_id = NEW.account_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.amount <> NEW.amount THEN
        UPDATE account SET hold = hold + (NEW.amount - OLD.amount) WHERE account_id = NEW.account_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE account SET hold = hold - OLD.amount WHERE account_id = OLD.account_id;
    END IF;

    RETURN NULL;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER hold_trigger
    AFTER INSERT OR UPDATE OR DELETE ON hold
    FOR EACH ROW
    EXECUTE PROCEDURE hold_trigger();

-- book
CREATE TABLE book (
    book_id serial PRIMARY KEY,
    scale int NOT NULL,
    base_security_id security_id NOT NULL REFERENCES security(security_id),
    quote_security_id security_id NOT NULL REFERENCES security(security_id)
);

-- order
CREATE TABLE "order" (
    order_id serial PRIMARY KEY,
    book_id int NOT NULL REFERENCES book(book_id),
    side int NOT NULL CHECK (side = 0 OR side = 1),
    price bigint NOT NULL CHECK (price > 0),
    volume bigint NOT NULL CHECK (volume >= 0),
    original bigint NOT NULL CHECK (original >= 0),
    cancelled bigint NOT NULL CHECK (cancelled >= 0) DEFAULT 0,
    matched bigint NOT NULL CHECK (matched >= 0) DEFAULT 0,
    user_id int NOT NULL REFERENCES "user"(user_id),
    hold_id int REFERENCES hold(hold_id) ON DELETE SET NULL,
    CONSTRAINT volumes_sum_to_original CHECK (matched + cancelled + volume = original)
);

CREATE FUNCTION order_insert() RETURNS trigger AS $$
DECLARE
    hid int;
    aid int;
    b book%ROWTYPE;
    bs_scale int;
    qs_scale int;
    h bigint;
BEGIN
    RAISE NOTICE 'before insert trigger for order %', NEW.order_id;

    IF NEW.hold_id IS NOT NULL THEN
        RAISE EXCEPTION 'did not expect order to have hold set at insert';
    END IF;

    IF NEW.volume = 0 THEN
        RAISE EXCEPTION 'did not expect order to be inserted with zero volume';
    END IF;

    SELECT * INTO b FROM book WHERE book_id = NEW.book_id;

    IF NEW.side = 0 THEN
        aid = user_security_account(NEW.user_id, b.quote_security_id);
    ELSE
        aid = user_security_account(NEW.user_id, b.base_security_id);
    END IF;

    SELECT scale INTO bs_scale FROM security WHERE security_id = b.base_security_id;
    SELECT scale INTO qs_scale FROM security WHERE security_id = b.quote_security_id;

    -- create hold
    RAISE NOTICE 'creating hold on account % for order %', aid, NEW.order_id;

    h := ceil(CASE WHEN NEW.side = 0 THEN NEW.price * NEW.volume / 10^(bs_scale - qs_scale) ELSE NEW.volume * 10^(b.scale) END);

    RAISE NOTICE 'hold %', h;

    INSERT INTO hold (account_id, amount) VALUES (aid, h);
    hid := currval('hold_hold_id_seq');

    NEW.hold_id := hid;
    NEW.original = NEW.volume;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER order_insert
    BEFORE INSERT ON "order"
    FOR EACH ROW
    EXECUTE PROCEDURE order_insert();

CREATE FUNCTION order_before_update() RETURNS trigger AS $$
BEGIN
    IF NEW.volume > OLD.volume THEN
        RAISE EXCEPTION 'volume of order increased';
    END IF;

    IF NEW.volume < OLD.volume THEN
        IF NEW.volume = 0 THEN
                        NEW.hold_id = null;
        END IF;
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE FUNCTION order_after_update() RETURNS trigger AS $$
BEGIN
        RAISE NOTICE 'deleting hold (%) for order %', OLD.hold_id, OLD.order_id;

        DELETE FROM hold WHERE hold_id = OLD.hold_id;

        RETURN NULL;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER order_before_update
    BEFORE UPDATE ON "order"
    FOR EACH ROW
    EXECUTE PROCEDURE order_before_update();

CREATE TRIGGER order_after_update
    AFTER UPDATE ON "order"
    FOR EACH ROW
    EXECUTE PROCEDURE order_after_update();

CREATE FUNCTION order_delete() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'cannot delete orders';
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER order_delete
    AFTER DELETE ON "order"
    FOR EACH ROW
    EXECUTE PROCEDURE order_delete();

-- match
CREATE TABLE match (
    match_id serial PRIMARY KEY,
    bid_order_id int NOT NULL REFERENCES "order"(order_id),
    ask_order_id int NOT NULL REFERENCES "order"(order_id),
    price bigint NOT NULL CHECK (price > 0),
    volume bigint NOT NULL CHECK (volume > 0),
    CHECK (bid_order_id <> ask_order_id)
);

CREATE FUNCTION match_insert() RETURNS trigger AS $$
DECLARE
    bido order%ROWTYPE;
    asko order%ROWTYPE;
    a bigint;
    bs_scale bigint;
    qs_scale bigint;
    b book%ROWTYPE;
BEGIN
    SELECT * INTO bido FROM "order" WHERE order_id = NEW.bid_order_id;
    SELECT * INTO asko FROM "order" WHERE order_id = NEW.ask_order_id;
    SELECT * INTO b FROM book WHERE book_id = asko.book_id;

    UPDATE "order"
    SET volume = volume - NEW.volume, matched = matched + NEW.volume
    WHERE order_id = bido.order_id OR order_id = asko.order_id;

    INSERT INTO transaction (debit_account_id, credit_account_id, amount)
    VALUES (user_security_account(asko.user_id, b.base_security_id), user_security_account(bido.user_id, b.base_security_id), NEW.volume);

    SELECT scale INTO bs_scale FROM security WHERE security_id = b.base_security_id;
    SELECT scale INTO qs_scale FROM security WHERE security_id = b.quote_security_id;

    IF random() < 0.5 THEN
        a := ceil(NEW.price * NEW.volume / 10^(bs_scale - qs_scale));
    ELSE
        a := floor(NEW.price * NEW.volume / 10^(bs_scale - qs_scale));
    END IF;

    INSERT INTO transaction (debit_account_id, credit_account_id, amount)
    VALUES (user_security_account(bido.user_id, b.quote_security_id), user_security_account(asko.user_id, b.quote_security_id), a);

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER match_insert
    BEFORE INSERT ON match
    FOR EACH ROW
    EXECUTE PROCEDURE match_insert();

-- order matching
CREATE FUNCTION execute_order (
    oid int
) RETURNS int AS $$
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
        o.book_id = oo.book_id AND
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
END; $$ LANGUAGE plpgsql;

CREATE FUNCTION order_insert_match() RETURNS trigger AS $$
BEGIN
    PERFORM execute_order(NEW.order_id);
    RETURN NULL;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER order_insert_match
    AFTER INSERT ON "order"
    FOR EACH ROW
    EXECUTE PROCEDURE order_insert_match();

CREATE VIEW account_view AS
SELECT
    a.*,
    a.balance - a.hold available,
    (a.balance - a.hold) / 10^(s.scale) available_decimal
FROM
    account a
INNER JOIN
        security s on s.security_id = a.security_id;

CREATE VIEW active_order AS
SELECT o.*
FROM "order" o
INNER JOIN book b ON b.book_id = o.book_id
WHERE volume > 0;

CREATE TABLE api_key (
    api_key_id varchar(100) PRIMARY KEY,
    secret varchar(100) NOT NULL,
    user_id int NOT NULL REFERENCES "user"(user_id)
);

CREATE FUNCTION user_from_api_key (
    aki varchar(100),
    s varchar(100)
) RETURNS int AS $$
DECLARE
    res int;
BEGIN
    SELECT user_id INTO res FROM api_key WHERE api_key_id = a AND secret = s;
    RETURN res;
END; $$ LANGUAGE plpgsql;

CREATE VIEW order_depth AS
(SELECT book_id, side, price, sum(volume) volume
FROM active_order
WHERE side = 0
GROUP BY price, side, book_id
ORDER BY price DESC
LIMIT 50)
UNION ALL
(SELECT book_id, side, price, sum(volume) volume
FROM active_order
WHERE side = 1
GROUP BY price, side, book_id
ORDER BY price ASC
LIMIT 50);

CREATE FUNCTION special_account (
        t account_type,
        sid security_id
) RETURNS int AS $$
DECLARE
        res int;
BEGIN
        SELECT account_id INTO res FROM account WHERE "type" = t AND security_id = sid;
        RETURN res;
END; $$ LANGUAGE plpgsql;

CREATE TABLE BTC_deposit_address (
        address char(34) PRIMARY KEY,
        account_id int NOT NULL REFERENCES account(account_id) UNIQUE,
        credited bigint NOT NULL DEFAULT 0 CONSTRAINT credited_non_negative CHECK (credited >= 0)
);

CREATE TABLE BTC_withdraw_queue (
        hold_id int PRIMARY KEY,
        address char(34) NOT NULL
);

CREATE FUNCTION BTC_credit (
        aid int,
        old_credited bigint,
        amount bigint
) RETURNS int AS $$
BEGIN
        UPDATE BTC_deposit_address
        SET credited = credited + amount
        WHERE account_id = aid AND credited = old_credited;

        IF NOT FOUND THEN
                RAISE EXCEPTION 'concurrency issues';
        END IF;

        INSERT INTO transaction (debit_account_id, credit_account_id, amount)
        VALUES (special_account('BTC', 'edge'), aid, amount);

        RETURN currval('transaction_transaction_id_seq');
END; $$ LANGUAGE plpgsql;

CREATE FUNCTION BTC_confirm_withdraw (
        tid char(64),
        hid int
) RETURNS int AS $$
DECLARE
        aid int;
        hmnt bigint;
        itid int;
BEGIN
        SELECT account_id, amount INTO aid, hmnt FROM hold WHERE hold_id = hid;

        IF NOT FOUND THEN
                RAISE EXCEPTION 'hold not found';
        END IF;

        DELETE FROM BTC_withdraw_queue WHERE hold_id = hid;

        DELETE from hold WHERE hold_id = hid;

        INSERT INTO transaction (debit_account_id, credit_account_id, amount)
        VALUES (aid, special_account('BTC', 'edge'), hmnt);

        itid := currval('transaction_transaction_id_seq');

        RETURN NULL;
END; $$ LANGUAGE plpgsql;

CREATE FUNCTION BTC_withdraw (
        uid int,
        a char(34),
        amount bigint
) RETURNS int AS $$
DECLARE
        hid int;
BEGIN
        INSERT INTO hold (account_id, amount)
        VALUES (user_security_account(uid, 'BTC'), amount);

        hid := currval('hold_hold_id_seq');

        INSERT INTO BTC_withdraw_queue (hold_id, address)
        VALUES (hid, a);

        RETURN hid;
END; $$ LANGUAGE plpgsql;

CREATE VIEW books_overview AS
SELECT book_id, base_security_id, quote_security_id, b.scale scale,
(
        (SELECT price
        FROM active_order aoa
        WHERE aoa.book_id = b.book_id AND aoa.side = 1
        GROUP BY price
        ORDER BY price ASC
        LIMIT 1)
) ask_price,
(
        (SELECT sum(volume) volume
        FROM active_order aoa
        WHERE aoa.book_id = b.book_id AND aoa.side = 1
        GROUP BY price
        ORDER BY price ASC
        LIMIT 1)
) ask_volume,
(
        (SELECT price
        FROM active_order aoa
        WHERE aoa.book_id = b.book_id AND aoa.side = 0
        GROUP BY price
        ORDER BY price DESC
        LIMIT 1)
) bid_price,
(
        (SELECT sum(volume) volume
        FROM active_order aoa
        WHERE aoa.book_id = b.book_id AND aoa.side = 0
        GROUP BY price
        ORDER BY price DESC
        LIMIT 1)
) bid_volume
FROM book b
INNER JOIN security bs on bs.security_id = b.base_security_id
INNER JOIN security qs on qs.security_id = b.quote_security_id
ORDER BY base_security_id ASC, quote_security_id ASC;

INSERT INTO security (security_id, scale)  VALUES ('BTC', 8), ('NOK', 5);
INSERT INTO book (base_security_id, quote_security_id, scale) VALUES ('BTC', 'NOK', 3);

INSERT INTO account (security_id, "type") VALUES ('BTC', 'edge');
