-- crypto_deposit_address
DROP TABLE IF EXISTS crypto_deposit_address CASCADE;
CREATE TABLE crypto_deposit_address (
    currency_id text NOT NULL,
    address character varying(34) NOT NULL,
    account_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT address_regex CHECK (((address)::text ~* '^.\w{26,33}$'::text)),
    CONSTRAINT crypto_deposit_address_pkey PRIMARY KEY (address),
    CONSTRAINT crypto_deposit_address_account_id_fkey FOREIGN KEY (account_id)
      REFERENCES account (account_id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT crypto_deposit_address_account_id_key UNIQUE (account_id)
);

-- crypto_deposit_address_account_id_idx
CREATE INDEX crypto_deposit_address_account_id_idx
ON crypto_deposit_address (account_id);

-- crypto_credited
DROP TABLE IF EXISTS crypto_credited CASCADE;
CREATE TABLE crypto_credited (
    currency_id text NOT NULL,
    txid character(64) NOT NULL,
    address character varying(34) NOT NULL,
    transaction_id integer REFERENCES transaction(transaction_id),
    CONSTRAINT crypto_txid_check CHECK ((txid ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT crypto_credited_pkey PRIMARY KEY (txid, address),
    CONSTRAINT crypto_credited_address_fkey FOREIGN KEY (address)
      REFERENCES crypto_deposit_address (address) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE NO ACTION
);

-- crypto_withdraw_request
DROP TABLE IF EXISTS crypto_withdraw_request CASCADE;
CREATE TABLE crypto_withdraw_request (
    currency_id text NOT NULL,
    address character varying(34) NOT NULL,
    request_id integer NOT NULL,
    CONSTRAINT crypto_withdraw_request_pkey PRIMARY KEY (request_id),
    CONSTRAINT crypto_withdraw_request_request_id_fkey FOREIGN KEY (request_id) 
        REFERENCES withdraw_request(request_id)  ON DELETE CASCADE
);

--  crypto_credit
CREATE OR REPLACE FUNCTION crypto_credit(currency text, t character, a character, amnt bigint)
  RETURNS integer AS
$BODY$
DECLARE
    aid int;
    uid int;
    tid int;
BEGIN
    SELECT ac.account_id, ac.user_id
    INTO aid, uid
    FROM crypto_deposit_address cda
    INNER JOIN account ac ON ac.account_id = cda.account_id
    WHERE cda.address = a AND cda.currency_id = currency ;

    tid := edge_credit(uid, currency, amnt);

    INSERT INTO crypto_credited (currency, txid, address, transaction_id)
    VALUES (t, a, tid);

    RETURN tid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE;
  
-- crypto_withdraw
DROP FUNCTION crypto_withdraw(currency text, uid integer, a character, amount bigint);
CREATE OR REPLACE FUNCTION crypto_withdraw(currency text, uid integer, a character, amount bigint)
  RETURNS integer AS
$BODY$
DECLARE
    rid int;
BEGIN
    rid := create_withdraw_request(user_currency_account(uid, currency), currency, amount);
    
    INSERT INTO crypto_withdraw_request (currency_id, request_id, address)
    VALUES (currency, rid, a);
    RETURN rid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE;
  
--  withdraw_request_view
DROP VIEW IF EXISTS withdraw_request_view ;
CREATE VIEW withdraw_request_view AS
 SELECT wr.request_id, wr.created_at, wr.completed_at, wr.method, wr.amount,
    wr.state, wr.error, a.currency_id, a.user_id,
    cwr.address AS address,
    bawr.bank_account_number, bawr.bank_iban, bawr.bank_swiftbic,
    bawr.bank_routing_number, bawr.bank_force_swift
   FROM withdraw_request wr
   JOIN account a ON a.account_id = wr.account_id
   LEFT JOIN crypto_withdraw_request cwr ON cwr.request_id = wr.request_id
   LEFT JOIN bank_withdraw_request_view bawr ON bawr.request_id = wr.request_id
  ORDER BY wr.request_id DESC;
  
-- pop_crypto_withdraw_requests  
CREATE OR REPLACE FUNCTION pop_crypto_withdraw_requests(currency text)
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
        crypto_withdraw_request cwr,
        account a,
        currency c
    WHERE
        wr.request_id = cwr.request_id AND
        a.account_id = wr.account_id AND
        c.currency_id = a.currency_id AND
        cwr.currency_id = currency AND
        wr.state = 'requested'
    RETURNING
        wr.request_id,
        wr.amount,
        c.scale,
        cwr.address;
END; $BODY$ LANGUAGE plpgsql;

