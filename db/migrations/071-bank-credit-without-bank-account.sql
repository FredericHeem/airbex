ALTER TABLE bank_credited
    DROP COLUMN bank_account_id;

CREATE OR REPLACE FUNCTION bank_credit(uid integer, cid currency_id, amnt bigint, ref character varying)
  RETURNS integer AS
$BODY$
DECLARE
    tid int;
BEGIN
    tid := edge_credit(uid, cid, amnt);

    INSERT INTO bank_credited (transaction_id, reference)
    VALUES (tid, ref);

    RETURN tid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
