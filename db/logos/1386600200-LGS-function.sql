ALTER TABLE settings
    ADD COLUMN lgs_balance decimal(16, 8),
    ADD COLUMN logos_height int;

DROP TABLE IF EXISTS lgs_deposit_address CASCADE;
CREATE TABLE lgs_deposit_address (
    address character varying(34) NOT NULL,
    account_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT address_regex CHECK (((address)::text ~* '^L\w{26,33}$'::text)),
    CONSTRAINT lgs_deposit_address_pkey PRIMARY KEY (address),
    CONSTRAINT lgs_deposit_address_account_id_fkey FOREIGN KEY (account_id)
      REFERENCES account (account_id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT lgs_deposit_address_account_id_key UNIQUE (account_id)
);

CREATE INDEX lgs_deposit_address_account_id_idx
ON lgs_deposit_address (account_id);

DROP TABLE IF EXISTS lgs_credited CASCADE;
CREATE TABLE lgs_credited (
    txid character(64) NOT NULL,
    address character varying(34) NOT NULL,
    transaction_id integer REFERENCES transaction(transaction_id),
    CONSTRAINT lgs_txid_check CHECK ((txid ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT lgs_credited_pkey PRIMARY KEY (txid, address),
    CONSTRAINT lgs_credited_address_fkey FOREIGN KEY (address)
      REFERENCES lgs_deposit_address (address) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE NO ACTION
);

DROP TABLE IF EXISTS lgs_withdraw_request CASCADE;
CREATE TABLE lgs_withdraw_request (
    address character varying(34) NOT NULL,
    request_id integer NOT NULL,
    CONSTRAINT lgs_withdraw_request_pkey PRIMARY KEY (request_id),
    CONSTRAINT lgs_withdraw_request_request_id_fkey FOREIGN KEY (request_id) 
        REFERENCES withdraw_request(request_id)  ON DELETE CASCADE
);

CREATE OR REPLACE FUNCTION lgs_credit(t character, a character, amnt bigint)
  RETURNS integer AS
$BODY$
DECLARE
    aid int;
    uid int;
    tid int;
BEGIN
    SELECT ac.account_id, ac.user_id
    INTO aid, uid
    FROM lgs_deposit_address lda
    INNER JOIN account ac ON ac.account_id = lda.account_id
    WHERE lda.address = a;

    tid := edge_credit(uid, 'LTC', amnt);

    INSERT INTO lgs_credited (txid, address, transaction_id)
    VALUES (t, a, tid);

    RETURN tid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE;
  
CREATE OR REPLACE FUNCTION lgs_withdraw(uid integer, a character, amount bigint)
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

        INSERT INTO lgs_withdraw_request (request_id, address)
        VALUES (rid, a);

        RETURN rid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
  
CREATE OR REPLACE FUNCTION pop_lgs_withdraw_requests()
  RETURNS TABLE (
    request_id int,
    amount bigint,
    scale int,
    address varchar) AS
$BODY$
BEGIN
    RETURN QUERY
    UPDATE withdraw_request wr
    SET state = 'processing'
    FROM
        lgs_withdraw_request lwr,
        account a,
        currency c
    WHERE
        wr.request_id = lwr.request_id AND
        a.account_id = wr.account_id AND
        c.currency_id = a.currency_id AND
        wr.state = 'requested'
    RETURNING
        wr.request_id,
        wr.amount,
        c.scale,
        lwr.address;
END; $BODY$ LANGUAGE plpgsql;
