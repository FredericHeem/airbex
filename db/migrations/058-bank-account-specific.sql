DELETE FROM bank_account;
DROP TABLE bank_account;

CREATE TABLE bank_account (
    bank_account_id serial PRIMARY KEY,
    user_id int NOT NULL REFERENCES "user"(user_id),
    created_at timestamptz NOT NULL DEFAULT(current_timestamp),
    display_name varchar(25),
    account_number varchar(25),
    iban varchar(35),
    swiftbic varchar(15),
    routing_number varchar(15),
    CONSTRAINT enough_information CHECK (
        (
            -- Local (Norway)
            account_number is NOT NULL AND
            iban IS NULL AND
            swiftbic IS NULL AND
            routing_number IS NULL
        ) OR
        -- IBAN
        (
            account_number IS NULL AND
            iban IS NOT NULL AND
            swiftbic IS NULL AND
            routing_number IS NULL
        ) OR
        -- SWIFT/BIC + account # + optional routing #
        (
            account_number IS NOT NULL AND
            swiftbic IS NOT NULL AND
            iban IS NULL
        )
    )
);

CREATE TABLE bank_credited (
    transaction_id int PRIMARY KEY REFERENCES "transaction"(transaction_id),
    bank_account_id int NOT NULL REFERENCES bank_account(bank_account_id),
    "reference" varchar(50) NOT NULL
);

CREATE OR REPLACE FUNCTION bank_credit (
    uid int,
    cid currency_id,
    amnt bigint,
    bid int,
    ref varchar(50)
) RETURNS int AS $$
DECLARE
    tid int;
BEGIN
    tid := edge_credit(uid, cid, amnt);

    INSERT INTO bank_credited (transaction_id, bank_account_id, reference)
    VALUES (tid, bid, ref);

    RETURN tid;
END; $$ LANGUAGE plpgsql;
