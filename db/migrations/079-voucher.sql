CREATE DOMAIN voucher_id AS varchar(12)
    CHECK (VALUE ~* '^[a-z0-9]{12}$');

CREATE TABLE "voucher" (
    voucher_id voucher_id PRIMARY KEY,
    hold_id int NOT NULL REFERENCES "hold" (hold_id)
        ON DELETE CASCADE
);

CREATE FUNCTION create_voucher (
    vid voucher_id,
    uid int,
    cid currency_id,
    amnt bigint
) RETURNS void AS $$
DECLARE
    hid int;
BEGIN
    INSERT INTO "hold" (account_id, amount)
    VALUES (user_currency_account(uid, cid), amnt)
    RETURNING hold_id
    INTO hid;

    INSERT INTO voucher (voucher_id, hold_id)
    VALUES (vid, hid);
END; $$ LANGUAGE plpgsql;

-- voucher id, destination account id
-- Returns transaction id or null (source=destination)
CREATE FUNCTION redeem_voucher (
    vid voucher_id,
    duid int
) RETURNS int AS $$
DECLARE
    amnt bigint;
    daid int;
    said int;
    cid currency_id;
BEGIN
    DELETE FROM "hold" h
    USING voucher v, account a
    WHERE
        v.hold_id = h.hold_id AND
        v.voucher_id = vid AND
        a.account_id = h.account_id
    RETURNING h.amount, h.account_id, a.currency_id
    INTO amnt, said, cid;

    IF NOT FOUND THEN
        RAISE 'Voucher % not found.', vid;
    END IF;

    daid := user_currency_account(duid, cid);

    IF daid = said THEN
        RAISE NOTICE 'Voucher being redeemed into source account.';
        RETURN null;
    END IF;

    INSERT INTO "transaction" (debit_account_id, credit_account_id, amount)
    VALUES (said, daid, amnt);

    RETURN currval('transaction_transaction_id_seq');
END; $$ LANGUAGE plpgsql;
