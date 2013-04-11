CREATE OR REPLACE FUNCTION transaction_insert() RETURNS trigger AS $$
DECLARE
        dsec security_id;
        csec security_id;
BEGIN
        SELECT security_id INTO dsec FROM account WHERE account_id = NEW.debit_account_id;
        SELECT security_id INTO csec FROM account WHERE account_id = NEW.debit_account_id;

        IF dsec <> csec THEN
                RAISE EXCEPTION 'securities do not match, % and %', dsec, csec;
        END IF;

        RAISE NOTICE 'transaction % from % to %', NEW.amount, NEW.debit_account_id, NEW.credit_account_id;

    UPDATE account SET balance = balance - NEW.amount
    WHERE account_id = NEW.debit_account_id;

    IF NOT FOUND THEN
                RAISE EXCEPTION 'debit failed, account % not found', NEW.debit_account_id;
    END IF;

    UPDATE account SET balance = balance + NEW.amount
    WHERE account_id = NEW.credit_account_id;

    IF NOT FOUND THEN
                RAISE EXCEPTION 'credit failed, account % not found', NEW.credit_account_id;
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;
