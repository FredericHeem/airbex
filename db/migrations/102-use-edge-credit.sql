ALTER TABLE ltc_credited
    ADD CONSTRAINT ltc_txid_check CHECK (txid ~ E'^[a-f0-9]{64}$');

ALTER TABLE btc_credited
    ADD CONSTRAINT btc_txid_check CHECK (txid ~ E'^[a-f0-9]{64}$');

CREATE OR REPLACE FUNCTION btc_credit(t character, a character, amnt bigint)
  RETURNS integer AS
$BODY$
DECLARE
        aid int;
        uid int;
BEGIN
    SELECT account_id, user_id
    INTO aid, uid
    FROM btc_deposit_address
    WHERE address = a;

    INSERT INTO btc_credited (txid, address)
    VALUES (t, a);

    RETURN edge_credit(uid, 'BTC', amnt);
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

CREATE OR REPLACE FUNCTION ltc_credit(t character, a character, amnt bigint)
  RETURNS integer AS
$BODY$
DECLARE
    aid int;
    uid int;
BEGIN
    SELECT ac.account_id, ac.user_id
    INTO aid, uid
    FROM ltc_deposit_address lda
    INNER JOIN account ac ON ac.account_id = lda.account_id
    WHERE lda.address = a;

    INSERT INTO ltc_credited (txid, address)
    VALUES (t, a);

    RETURN edge_credit(uid, 'LTC', amnt);
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

CREATE OR REPLACE FUNCTION ripple_credit(h character varying, s currency_id, t bigint, amnt bigint)
  RETURNS integer AS
$BODY$
DECLARE
        tid int;
        uid int;
BEGIN
    SELECT user_id
    INTO uid
    FROM "user"
    WHERE tag = t;

    IF NOT FOUND THEN
        RAISE 'User with tag % not found.', t;
    END IF;

    tid := currval('transaction_transaction_id_seq');

    INSERT INTO ripple_processed (hash, returned)
    VALUES (h, false);

    INSERT INTO ripple_credited (hash, transaction_id)
    VALUES (h, tid);

    RETURN edge_credit(uid, s, amnt);
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
