INSERT INTO "security" (security_id, scale)
VALUES ('LTC', 8);

INSERT INTO "account" (security_id, "type")
VALUES ('LTC', 'edge');

INSERT INTO "book" (base_security_id, quote_security_id, scale)
VALUES ('BTC', 'LTC', 3);

-- create LTC accounts for existing users
SELECT user_security_account(user_id, 'LTC')
FROM "user";

CREATE TABLE ltc_block
(
  height integer NOT NULL,
  id integer NOT NULL DEFAULT 1,
  CONSTRAINT ltc_block_pkey PRIMARY KEY (id),
  CONSTRAINT ltc_block_id_check CHECK (id = 1)
);

CREATE TABLE ltc_deposit_address
(
  address character(34) NOT NULL,
  account_id integer NOT NULL,
  credited bigint NOT NULL DEFAULT 0,
  CONSTRAINT ltc_deposit_address_pkey PRIMARY KEY (address),
  CONSTRAINT ltc_deposit_address_account_id_fkey FOREIGN KEY (account_id)
      REFERENCES account (account_id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT ltc_deposit_address_account_id_key UNIQUE (account_id),
  CONSTRAINT credited_non_negative CHECK (credited >= 0)
);

CREATE TABLE ltc_credited
(
  txid character(64) NOT NULL,
  address character(34) NOT NULL,
  CONSTRAINT ltc_credited_pkey PRIMARY KEY (txid, address),
  CONSTRAINT ltc_credited_address_fkey FOREIGN KEY (address)
      REFERENCES ltc_deposit_address (address) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE TABLE ltc_withdraw_request
(
  address character varying(34) NOT NULL,
  request_id integer NOT NULL,
  CONSTRAINT ltc_withdraw_request_pkey PRIMARY KEY (request_id),
  CONSTRAINT ltc_withdraw_request_request_id_fkey FOREIGN KEY (request_id)
      REFERENCES withdraw_request (request_id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE OR REPLACE FUNCTION ltc_credit(t character, a character, amnt bigint)
  RETURNS integer AS
$BODY$
DECLARE
        aid int;
BEGIN
        aid := (SELECT account_id FROM ltc_deposit_address WHERE address = a);

        INSERT INTO ltc_credited (txid, address)
        VALUES (t, a);

        INSERT INTO transaction (debit_account_id, credit_account_id, amount)
        VALUES (special_account('edge', 'LTC'), aid, amnt);

        RETURN currval('transaction_transaction_id_seq');
END; $BODY$
  LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ltc_withdraw(uid integer, a character, amount bigint)
  RETURNS integer AS
$BODY$
DECLARE
        hid int;
        rid int;
BEGIN
        INSERT INTO hold (account_id, amount)
        VALUES (user_security_account(uid, 'LTC'), amount);

        hid := currval('hold_hold_id_seq');

        INSERT INTO withdraw_request(method, hold_id, account_id, amount)
        VALUES ('LTC', hid, user_security_account(uid, 'LTC'), amount);

        rid := currval('withdraw_request_request_id_seq');

        INSERT INTO ltc_withdraw_request (request_id, address)
        VALUES (rid, a);

        RETURN rid;
END; $BODY$
  LANGUAGE plpgsql;

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
                s.scale,
                bwr.address
        FROM ltc_withdraw_request bwr
        INNER JOIN withdraw_request wr ON bwr.request_id = wr.request_id
        INNER JOIN account a ON a.account_id = wr.account_id
        INNER JOIN security s ON s.security_id = a.security_id
        WHERE wr.state = 'requested';

        UPDATE withdraw_request SET state = 'processing'
        WHERE request_id IN (SELECT request_id FROM pop_ltc_withdraw_requests);

        FOR rec IN (SELECT * FROM pop_ltc_withdraw_requests) LOOP
                RETURN NEXT rec;
        END LOOP;

        DROP TABLE pop_ltc_withdraw_requests;

        RETURN;
END; $BODY$
  LANGUAGE plpgsql;

INSERT INTO ltc_block (height) VALUES (338555);

ALTER TABLE ltc_deposit_address
ADD CONSTRAINT address_regex CHECK (address ~* E'^L\\w{26,33}$');
