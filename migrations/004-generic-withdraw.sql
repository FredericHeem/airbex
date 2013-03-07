BEGIN;

ALTER TABLE btc_withdraw_queue
        RENAME TO btc_withdraw_request;

CREATE TABLE withdraw_request (
        request_id serial PRIMARY KEY,
        created date NOT NULL DEFAULT current_timestamp,
        completed date,
        method varchar(50) NOT NULL,
        hold_id int REFERENCES hold(hold_id) ON DELETE SET NULL
);

ALTER TABLE btc_withdraw_request
        DROP CONSTRAINT btc_withdraw_queue_pkey,
        DROP COLUMN hold_id,
        ALTER COLUMN address TYPE varchar(34),
        ADD COLUMN request_id int PRIMARY KEY REFERENCES withdraw_request(request_id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION btc_withdraw(uid integer, a character, amount bigint)
  RETURNS integer AS $$
DECLARE
        hid int;
        rid int;
BEGIN
        INSERT INTO hold (account_id, amount)
        VALUES (user_security_account(uid, 'BTC'), amount);

        hid := currval('hold_hold_id_seq');

        INSERT INTO withdraw_request(method, hold_id)
        VALUES ('BTC', hid);

        rid := currval('withdraw_request_request_id_seq');

        INSERT INTO BTC_withdraw_request (request_id, address)
        VALUES (rid, a);

        RETURN rid;
END; $$ LANGUAGE plpgsql;

CREATE FUNCTION confirm_withdraw(rid int) RETURNS int AS $$
DECLARE
        aid int;
        hmnt bigint;
        itid int;
        hid int;
        sid security_id;
BEGIN
        SELECT h.account_id, h.amount, h.hold_id, a.security_id INTO aid, hmnt, hid, sid
        FROM withdraw_request wr
        INNER JOIN hold h ON wr.hold_id = h.hold_id
        INNER JOIN account a ON hold.account_id = a.account_id
        WHERE wr.request_id = rid;

        IF NOT FOUND THEN
                RAISE EXCEPTION 'request/hold not found';
        END IF;

        UPDATE withdraw_request SET hold_id = NULL, completed = current_timestamp;

        DELETE from hold WHERE hold_id = hid;

        INSERT INTO transaction (debit_account_id, credit_account_id, amount)
        VALUES (aid, special_account(sid, 'edge'), hmnt);

        itid := currval('transaction_transaction_id_seq');

        RETURN itid;
END; $$ LANGUAGE plpgsql;


DROP FUNCTION btc_confirm_withdraw(tid character, hid integer);

ALTER TABLE withdraw_request
        ADD COLUMN amount bigint NOT NULL CHECK(amount > 0),
        ADD COLUMN account_id int NOT NULL REFERENCES account(account_id);

-- SELECT * FROM pop_btc_withdraw_requests() as (request_id int, amount bigint, scale int, address varchar(34));
CREATE OR REPLACE FUNCTION pop_btc_withdraw_requests () RETURNS setof record AS $$
DECLARE
        rec record;
BEGIN
        DROP TABLE IF EXISTS pop_btc_withdraw_requests;

        CREATE TABLE pop_btc_withdraw_requests AS
        SELECT
                wr.request_id,
                wr.amount,
                s.scale,
                bwr.address
        FROM btc_withdraw_request bwr
        INNER JOIN withdraw_request wr ON bwr.request_id = wr.request_id
        INNER JOIN account a ON a.account_id = wr.account_id
        INNER JOIN security s ON s.security_id = a.security_id
        WHERE wr.state = 'requested';

        UPDATE withdraw_request SET state = 'processing'
        WHERE request_id IN (SELECT request_id FROM pop_btc_withdraw_requests);

        FOR rec IN (SELECT * FROM pop_btc_withdraw_requests) LOOP
                RETURN NEXT rec;
        END LOOP;

        DROP TABLE pop_btc_withdraw_requests;

        RETURN;
END; $$ LANGUAGE plpgsql;

COMMIT;