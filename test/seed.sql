DROP TABLE IF EXISTS "security" CASCADE;
DROP TABLE IF EXISTS "account" CASCADE;
DROP TABLE IF EXISTS "transaction" CASCADE;
DROP TABLE IF EXISTS "hold" CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;
DROP TABLE IF EXISTS "book" CASCADE;
DROP TABLE IF EXISTS "order" CASCADE;
DROP TABLE IF EXISTS "match" CASCADE;
DROP TYPE IF EXISTS security_id CASCADE;
DROP TYPE IF EXISTS account_type CASCADE;

CREATE TYPE account_type AS ENUM ('faucet', 'current');

CREATE DOMAIN security_id varchar(10);

-- user
CREATE TABLE "user" (
    user_id serial NOT NULL PRIMARY KEY,
    username varchar(20) NOT NULL,
    username_lower varchar(20) NOT NULL UNIQUE,
    password char(60) NOT NULL
);

CREATE OR REPLACE FUNCTION user_insert() RETURNS trigger AS $$
BEGIN
    NEW.username_lower := lower(NEW.username);

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER user_insert
    BEFORE INSERT ON "user"
    FOR EACH ROW
    EXECUTE PROCEDURE user_insert();

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
    CHECK (type = 'faucet' OR balance - hold >= 0)
);

-- account helpers
CREATE OR REPLACE FUNCTION user_security_account (
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

CREATE OR REPLACE FUNCTION transaction_insert() RETURNS trigger AS $$
BEGIN
    RAISE NOTICE 'transaction % from % to %', NEW.amount, NEW.debit_account_id, NEW.credit_account_id;

    UPDATE account SET balance = balance - NEW.amount
    WHERE account_id = NEW.debit_account_id;

    UPDATE account SET balance = balance + NEW.amount
    WHERE account_id = NEW.credit_account_id;
    
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

CREATE OR REPLACE FUNCTION hold_trigger() RETURNS trigger AS $$
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
    volume bigint CHECK (volume >= 0),
    user_id int NOT NULL REFERENCES "user"(user_id),
    hold_id int REFERENCES hold(hold_id) ON DELETE SET NULL
);

CREATE OR REPLACE FUNCTION order_insert() RETURNS trigger AS $$
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

    h := ceil(CASE WHEN NEW.side = 0 THEN NEW.price * NEW.volume / 10^(bs_scale - qs_scale) ELSE NEW.volume * b.scale END);

    RAISE NOTICE 'hold %', h;       
        
    INSERT INTO hold (account_id, amount) VALUES (aid, h);
    hid := currval('hold_hold_id_seq');

    NEW.hold_id := hid;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER order_insert
    BEFORE INSERT ON "order"
    FOR EACH ROW
    EXECUTE PROCEDURE order_insert();
    
CREATE OR REPLACE FUNCTION order_update() RETURNS trigger AS $$
BEGIN
    IF NEW.volume > OLD.volume THEN
        RAISE EXCEPTION 'volume of order increased';
    END IF;

    IF NEW.volume < OLD.volume THEN
        IF NEW.volume = 0 THEN
            DELETE FROM hold WHERE hold_id = OLD.hold_id;
        ELSE
            UPDATE hold SET amount = amount - (NEW.volume - OLD.volume)
            WHERE hold_id = NEW.hold_id;
        END IF;
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER order_update
    BEFORE UPDATE ON "order"
    FOR EACH ROW
    EXECUTE PROCEDURE order_update();

-- match
CREATE TABLE match (
    match_id serial PRIMARY KEY,
    bid_order_id int NOT NULL REFERENCES "order"(order_id),
    ask_order_id int NOT NULL REFERENCES "order"(order_id),
    price bigint NOT NULL CHECK (price > 0),
    volume bigint NOT NULL CHECK (volume > 0),
    CHECK (bid_order_id <> ask_order_id)
);

CREATE OR REPLACE FUNCTION match_insert() RETURNS trigger AS $$
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
    SET volume = volume - NEW.volume
    WHERE order_id = bido.order_id OR order_id = asko.order_id;

    INSERT INTO transaction (debit_account_id, credit_account_id, amount)
    VALUES (user_security_account(asko.user_id, b.base_security_id), user_security_account(bido.user_id, b.base_security_id), NEW.volume);
    
    SELECT scale INTO bs_scale FROM security WHERE security_id = b.base_security_id;
    SELECT scale INTO qs_scale FROM security WHERE security_id = b.quote_security_id;

    -- rounding attack prevention
    IF random() < 0.5 THEN
        a := ceil(NEW.price * NEW.volume / 10^(bs_scale - qs_scale));
    ELSE
        a := floor(NEW.price * NEW.volume / 10^(bs_scale - qs_scale));
    END IF;
    
    INSERT INTO transaction (debit_account_id, credit_account_id, amount)
    VALUES (user_security_account(bido.user_id, b.quote_security_id), user_security_account(asko.user_id, b.quote_security_id), a);

    RETURN NULL;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER match_insert
    AFTER INSERT ON match
    FOR EACH ROW
    EXECUTE PROCEDURE match_insert();

-- order matching
CREATE OR REPLACE FUNCTION execute_order (
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

CREATE OR REPLACE FUNCTION order_insert_match() RETURNS trigger AS $$
BEGIN
    PERFORM execute_order(NEW.order_id);
    RETURN NULL;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER order_insert_match
    AFTER INSERT ON "order"
    FOR EACH ROW
    EXECUTE PROCEDURE order_insert_match();

----- samples

INSERT INTO "user" (username, password) VALUES ('hax', 'pass'); -- 1
INSERT INTO "user" (username, password) VALUES ('ola', 'pass'); -- 2
INSERT INTO security (security_id, scale)  VALUES ('BTC', 8), ('NOK', 3);
INSERT INTO book (base_security_id, quote_security_id, scale) VALUES ('BTC', 'NOK', 2); -- 1

INSERT INTO account (security_id, "type") VALUES ('BTC', 'faucet'); -- 1
INSERT INTO account (security_id, "type") VALUES ('NOK', 'faucet'); -- 2

INSERT INTO transaction (debit_account_id, credit_account_id, amount) VALUES
    (1, user_security_account(1, 'BTC'), 1 * 10^8),
    (2, user_security_account(2, 'NOK'), 140 * 10^3);

--SELECT * FROM "account";

INSERT INTO "order" (side, book_id, price, volume, user_id) VALUES
    (0, 1, 65.12 * 10^2, 0.5 * 10^(8-3), 2);
    
INSERT INTO "order" (side, book_id, price, volume, user_id) VALUES
    (1, 1, 64.11 * 10^2, 0.8 * 10^(8-3), 1);

INSERT INTO "order" (side, book_id, price, volume, user_id) VALUES
    (0, 1, 65.12 * 10^2, 0.5 * 10^(8-3), 2);
    
--INSERT INTO "order" (side, book_id, price, volume, user_id) VALUES
--  (1, 1, 100 * 10^2, 0.5 * 10^(8-3), 1);
    
SELECT a.*, a.balance / 10^(s.scale) balanced, a.hold / 10^(s.scale) holdd
FROM account a
INNER JOIN security s on a.security_id = s.security_id;

