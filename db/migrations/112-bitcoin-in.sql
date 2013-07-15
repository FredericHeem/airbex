ALTER TABLE settings
    ADD COLUMN bitcoin_height int;

UPDATE settings
SET bitcoin_height = height
FROM btc_block;

DROP TABLE btc_block;
CREATE OR REPLACE FUNCTION btc_credit(t character, a character, amnt bigint)
  RETURNS integer AS
$BODY$
DECLARE
        aid int;
        uid int;
BEGIN
    SELECT ac.account_id, ac.user_id
    INTO aid, uid
    FROM btc_deposit_address bda
    INNER JOIN account ac ON ac.account_id = bda.account_id
    WHERE bda.address = a;

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
