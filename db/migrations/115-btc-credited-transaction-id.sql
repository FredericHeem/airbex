ALTER TABLE btc_credited
    ADD COLUMN transaction_id int
        REFERENCES transaction(transaction_id),
    ALTER address TYPE varchar(34);

CREATE OR REPLACE FUNCTION btc_credit(t character, a character, amnt bigint)
  RETURNS integer AS
$BODY$
DECLARE
    aid int;
    uid int;
    tid int;
BEGIN
    SELECT ac.account_id, ac.user_id
    INTO aid, uid
    FROM btc_deposit_address bda
    INNER JOIN account ac ON ac.account_id = bda.account_id
    WHERE bda.address = a;

    tid := edge_credit(uid, 'BTC', amnt);

    INSERT INTO btc_credited (txid, address, transaction_id)
    VALUES (t, a, tid);

    RETURN tid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE;
