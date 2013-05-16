DROP VIEW IF EXISTS order_depth CASCADE;
DROP VIEW IF EXISTS transaction_view CASCADE;
DROP VIEW IF EXISTS account_transaction CASCADE;
DROP VIEW IF EXISTS account_view CASCADE;
DROP VIEW IF EXISTS books_overview CASCADE;
DROP VIEW IF EXISTS order_view CASCADE;
DROP VIEW IF EXISTS match_view CASCADE;

CREATE OR REPLACE FUNCTION from_decimal(d decimal, s security_id)
RETURNS bigint AS $$
BEGIN
    -- The following implicit cast to bigint causes an error if the
    -- amount is too precise for the scale of the security. See PostgreSQL's
    -- documentation under Type Conversion.
    RETURN (SELECT d * 10^scale FROM "security" WHERE security_id = s);
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION to_decimal(i bigint, s security_id)
RETURNS decimal AS $$
BEGIN
    RETURN (SELECT i / 10^scale FROM "security" WHERE security_id = s);
END; $$ LANGUAGE plpgsql;

-- account_view
CREATE VIEW account_view AS
SELECT
    a.*,
    to_decimal(balance, a.security_id) balance_decimal,
    to_decimal(available, a.security_id) available_decimal,
    to_decimal("hold", a.security_id) hold_decimal
FROM
    (
        SELECT
            *,
            balance - "hold" available
        FROM
            account
    ) a;

-- order_view
CREATE VIEW order_view AS
SELECT
    o.*,
    (price / 10^b.scale)::decimal price_decimal,
    (volume / 10^(bs.scale - b.scale))::decimal volume_decimal,
    (original / 10^(bs.scale - b.scale))::decimal original_decimal,
    (cancelled / 10^(bs.scale - b.scale))::decimal cancelled_decimal,
    (matched / 10^(bs.scale - b.scale))::decimal matched_decimal
FROM "order" o
INNER JOIN book b ON b.book_id = o.book_id
INNER JOIN "security" bs ON bs.security_id = b.base_security_id;

-- match_view
CREATE VIEW match_view AS
SELECT
    m.*,
    (m.price / 10^b.scale)::decimal price_decimal,
    (m.volume / 10^(bs.scale - b.scale))::decimal volume_decimal
FROM "match" m
INNER JOIN "order" bo ON bo.order_id = m.bid_order_id
INNER JOIN book b ON b.book_id = bo.book_id
INNER JOIN "security" bs ON bs.security_id = b.base_security_id;

-- book_view
CREATE VIEW book_view AS
SELECT
    b.*,
    (
        SELECT MAX(o.price_decimal)
        FROM order_view o
        WHERE o.book_id = b.book_id AND o.side = 0 AND o.volume > 0
    ) bid_decimal,
    (
        SELECT MIN(o.price_decimal)
        FROM order_view o
        WHERE o.book_id = b.book_id AND o.side = 1 AND o.volume > 0
    ) ask_decimal,
    (
        SELECT m.price_decimal
        FROM match_view m
        INNER JOIN "order" bo ON bo.order_id = m.bid_order_id
        WHERE bo.book_id = b.book_id
        ORDER BY m.created DESC
        LIMIT 1
    ) last_decimal,
    (
        SELECT MAX(m.price_decimal)
        FROM match_view m
        INNER JOIN "order" bo ON bo.order_id = m.bid_order_id
        WHERE bo.book_id = b.book_id AND AGE(m.created) < '1 day'::interval
    ) high_decimal,
    (
        SELECT MIN(m.price_decimal)
        FROM match_view m
        INNER JOIN "order" bo ON bo.order_id = m.bid_order_id
        WHERE bo.book_id = b.book_id AND AGE(m.created) < '1 day'::interval
    ) low_decimal,
    (
        SELECT SUM(o.volume_decimal)
        FROM order_view o
        WHERE o.book_id = b.book_id
    ) volume_decimal
FROM book b
ORDER BY b.base_security_id, b.quote_security_id;

-- order_depth_view
CREATE OR REPLACE VIEW order_depth_view AS
SELECT book_id, side, price_decimal, SUM(volume_decimal) volume_decimal
FROM order_view
WHERE volume > 0
GROUP BY book_id, side, price_decimal
ORDER BY book_id, price_decimal;

-- create_order
CREATE OR REPLACE FUNCTION create_order (
    user_id int,
    book_id int,
    side int,
    price decimal,
    volume decimal
) RETURNS int AS $$
BEGIN
    INSERT INTO "order" (user_id, book_id, side, price, volume)
    SELECT user_id, b.book_id, side, price * 10^b.scale, volume * 10^(bs.scale - b.scale)
    FROM book b
    INNER JOIN "security" bs ON bs.security_id = b.base_security_id
    WHERE b.book_id = create_order.book_id;

    RETURN currval('order_order_id_seq');
END; $$ LANGUAGE PLPGSQL;

-- transaction_view
CREATE VIEW transaction_view AS
SELECT t.*, (amount / 10^s.scale)::decimal amount_decimal
FROM "transaction" t
INNER JOIN account da ON da.account_id = t.debit_account_id
INNER JOIN "security" s ON s.security_id = da.security_id;

-- account_transaction
CREATE VIEW account_transaction AS
SELECT
    t.*
FROM (
    SELECT
        dt.transaction_id,
        dt.created,
        -dt.amount amount,
        -dt.amount_decimal amount_decimal,
        dt.debit_account_id account_id,
        a.security_id,
        a.user_id
    FROM transaction_view dt
    INNER JOIN account a ON a.account_id = dt.debit_account_id
    UNION
    SELECT
        ct.transaction_id,
        ct.created,
        ct.amount,
        ct.amount_decimal,
        ct.credit_account_id account_id,
        a.security_id,
        a.user_id
    FROM transaction_view ct
    JOIN account a ON a.account_id = ct.credit_account_id) t
    ORDER BY t.transaction_id;
