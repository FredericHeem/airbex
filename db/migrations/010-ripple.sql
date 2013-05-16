INSERT INTO "security" (security_id, scale)
VALUES ('XRP', 8);

INSERT INTO account (security_id, "type")
VALUES ('XRP', 'edge');

INSERT INTO "book" (scale, base_security_id, quote_security_id)
VALUES (3, 'BTC', 'XRP');

-- all existing accounts receive an XRP account
SELECT user_security_account(u.user_id, 'XRP')
FROM "user" u;

CREATE TABLE ripple_account
(
    address varchar(34) primary key not null constraint check_address check (address ~* '^r\w{32,}$'),
    account_id int not null references "account"(account_id),
    ledger_index int
);

-- all new users also receive an XRP account
CREATE TABLE ripple_credited
(
    transaction_id int not null primary key references "transaction"(transaction_id),
    hash varchar(64) not null unique constraint check_hash_length check (hash ~* '^[A-Z\d]{64}$')
);

CREATE OR REPLACE FUNCTION create_user(key character varying, secret character varying)
  RETURNS integer AS
$BODY$
DECLARE
        user_id int;
BEGIN
        user_id = nextval('user_user_id_seq');
        INSERT INTO "user" (user_id) VALUES (user_id);

        INSERT INTO api_key (api_key_id, secret, user_id)
        VALUES (key, secret, user_id);

        PERFORM user_security_account(user_id, 'BTC');
        PERFORM user_security_account(user_id, 'XRP');

        RETURN user_id;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

CREATE OR REPLACE FUNCTION ripple_credit(h varchar(64), s security_id, a int, amnt bigint)
  RETURNS integer AS
$BODY$
DECLARE
        tid int;
        acs security_id;
BEGIN
        acs := (SELECT security_id FROM "account" WHERE account_id = a);

        IF acs IS NULL THEN
                RAISE EXCEPTION 'account not found %', a;
        END IF;

        IF acs <> s THEN
                RAISE EXCEPTION 'account security_id % does not match tx %', acs, s;
        END IF;

        INSERT INTO transaction (debit_account_id, credit_account_id, amount)
        VALUES (special_account('edge', acs), a, amnt);

        tid := currval('transaction_transaction_id_seq');

        INSERT INTO ripple_credited (hash, transaction_id)
        VALUES (h, tid);

        RETURN tid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE

  COST 100;


CREATE TABLE ripple_withdraw_request
(
  request_id integer NOT NULL primary key references withdraw_request(request_id)
      ON UPDATE NO ACTION ON DELETE CASCADE,
  address character varying(34) NOT NULL
);

CREATE OR REPLACE FUNCTION pop_ripple_withdraw_requests()
  RETURNS SETOF record AS
$BODY$
DECLARE
        rec record;
BEGIN
        DROP TABLE IF EXISTS pop_ripple_withdraw_requests;

        CREATE TABLE pop_ripple_withdraw_requests AS
        SELECT
                wr.request_id,
                wr.amount,
                s.security_id,
                s.scale,
                bwr.address
        FROM ripple_withdraw_request bwr
        INNER JOIN withdraw_request wr ON bwr.request_id = wr.request_id
        INNER JOIN account a ON a.account_id = wr.account_id
        INNER JOIN security s ON s.security_id = a.security_id
        WHERE wr.state = 'requested';

        UPDATE withdraw_request SET state = 'processing'
        WHERE request_id IN (SELECT request_id FROM pop_ripple_withdraw_requests);

        FOR rec IN (SELECT * FROM pop_ripple_withdraw_requests) LOOP
                RETURN NEXT rec;
        END LOOP;

        DROP TABLE pop_ripple_withdraw_requests;

        RETURN;
END; $BODY$
  LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ripple_withdraw(account_id int, address varchar(34), amount bigint)
  RETURNS integer AS
$BODY$
DECLARE
        hid int;
        rid int;
BEGIN

        INSERT INTO hold (account_id, amount)
        VALUES (account_id, amount);

        hid := currval('hold_hold_id_seq');

        INSERT INTO withdraw_request(method, hold_id, account_id, amount)
        VALUES ('ripple', hid, account_id, amount);

        rid := currval('withdraw_request_request_id_seq');

        INSERT INTO ripple_withdraw_request (request_id, address)
        VALUES (rid, address);

        RETURN rid;
END; $BODY$
  LANGUAGE plpgsql;

ALTER TABLE ripple_account
DROP COLUMN account_id;

ALTER TABLE ripple_account
DROP CONSTRAINT check_address;
