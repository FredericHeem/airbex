CREATE TABLE btc_block (
        hash char(64) PRIMARY KEY NOT NULL,
        height int NOT NULL UNIQUE
);

CREATE TABLE btc_credited (
        txid char(64) NOT NULL,
        address char(34) NOT NULL REFERENCES btc_deposit_address(address),
        PRIMARY KEY (txid, address)
);

CREATE FUNCTION btc_credit (
        t char(64),
        a char(34),
        amnt bigint
) RETURNS int AS $$
DECLARE
        aid int;
BEGIN
        aid := (SELECT account_id FROM btc_deposit_address WHERE address = a);

        INSERT INTO btc_credited (txid, address)
        VALUES (t, a);

        INSERT INTO transaction (debit_account_id, credit_account_id, amount)
        VALUES (special_account('edge', 'BTC'), aid, amnt);

        RETURN currval('transaction_transaction_id_seq');
END; $$ LANGUAGE plpgsql;

INSERT INTO btc_block (height, hash)
VALUES (210126, '00000000000003dd9d1be47bdb18f58269584fcf1c1c73d5466dcdccd7347256');
