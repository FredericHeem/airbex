CREATE TABLE voucher (
        voucher_id varchar(30) PRIMARY KEY,
        created timestamp DEFAULT current_timestamp,
        redeemed timestamp,
        hold_id int REFERENCES hold(hold_id) ON DELETE SET NULL,
        CONSTRAINT no_hold_when_redeemed CHECK (hold_id IS NULL OR redeemed IS NULL),
        CONSTRAINT not_redeemed_before_created CHECK (redeemed >= created),
        CONSTRAINT voucher_id_length CHECK (length(voucher_id) = 30)
);

CREATE FUNCTION create_voucher (
        vid varchar(30),
        aid int,
        amnt bigint
) RETURNS varchar(30) AS $$
DECLARE
        hid int;
BEGIN
        INSERT INTO hold (account_id, amount) VALUES (aid, amnt);
        hid := currval('hold_hold_id_seq');

        INSERT INTO voucher (voucher_id, hold_id) VALUES (vid, hid);

        RETURN vid;
END; $$ LANGUAGE plpgsql;

CREATE FUNCTION redeem_voucher (
        vid varchar(30),
        to_aid int
) RETURNS int AS $$
DECLARE
        hid int;
        amnt bigint;
        sid security_id;
        from_aid int;
        tid int;
BEGIN
        SELECT h.hold_id, h.amount, a.security_id, a.account_id INTO hid, amnt, sid, from_aid
        FROM voucher v
        INNER JOIN hold h ON h.hold_id = v.hold_id
        INNER JOIN account a ON a.account_id = h.account_id
        WHERE v.voucher_id = vid;

        IF NOT FOUND THEN
                RAISE EXCEPTION 'voucher not found';
        END IF;

        UPDATE voucher SET hold_id = null, redeemed = current_timestamp WHERE voucher_id = vid;

        RAISE NOTICE 'releasing hold %', hid;

        DELETE FROM hold WHERE hold_id = hid;

        INSERT INTO transaction (debit_account_id, credit_account_id, amount)
        VALUES (from_aid, to_aid, amnt);

        tid := currval('transaction_transaction_id_seq');

        RETURN tid;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION test_voucher_create_inserts() RETURNS void AS $$
DECLARE
        aid int;
        cnt int;
BEGIN
        INSERT INTO account (security_id, type) VALUES ('BTC', 'edge');
        aid := currval('account_account_id_seq');

        PERFORM create_voucher ('999999999999999999999999999999', aid, 123);

        SELECT COUNT(*) INTO cnt FROM voucher WHERE voucher_id = '999999999999999999999999999999';

        IF cnt <> 1 THEN
                RAISE EXCEPTION 'voucher was not inserted';
        END IF;

        RETURN;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION test_voucher_create_inserts_hold() RETURNS void AS $$
DECLARE
        aid int;
        amnt bigint;
BEGIN
        INSERT INTO account (security_id, type) VALUES ('BTC', 'edge');
        aid := currval('account_account_id_seq');

        PERFORM create_voucher ('999999999999999999999999999999', aid, 123);

        SELECT h.amount INTO amnt
        FROM voucher v
        INNER JOIN hold h ON h.hold_id = v.hold_id
        WHERE voucher_id = '999999999999999999999999999999';

        IF amnt <> 123 THEN
                RAISE EXCEPTION 'bad hold amount';
        END IF;

        RETURN;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION test_voucher_redeem_credits() RETURNS void AS $$
DECLARE
        aid int;
        bal bigint;
BEGIN
        INSERT INTO account (security_id, type) VALUES ('BTC', 'edge');
        aid := currval('account_account_id_seq');

        PERFORM create_voucher ('999999999999999999999999999999', aid, 123);

        IF (SELECT hold FROM account WHERE account_id = aid) <> 123 THEN
                RAISE EXCEPTION 'hold not created';
        END IF;

        IF (SELECT balance FROM account WHERE account_id = aid) <> 0 THEN
                RAISE EXCEPTION 'balance incorrect, %', (SELECT balance FROM account WHERE account_id = aid);
        END IF;

        PERFORM redeem_voucher('999999999999999999999999999999', aid);

        IF (SELECT hold FROM account WHERE account_id = aid) <> 0 THEN
                RAISE EXCEPTION 'voucher not redeemed, account balance %, hold %',
                        (SELECT balance FROM account WHERE account_id = aid),
                        (SELECT hold FROM account WHERE account_id = aid);
        END IF;

        RETURN;
END; $$ LANGUAGE plpgsql;
