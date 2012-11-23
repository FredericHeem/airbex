CREATE OR REPLACE FUNCTION BTC_credit (
        aid int,
        old_credited bigint,
        amount bigint
) RETURNS int AS $$
BEGIN
        UPDATE BTC_deposit_address
        SET credited = credited + amount
        WHERE account_id = aid AND credited = old_credited;

        IF NOT FOUND THEN
                RAISE EXCEPTION 'concurrency issues';
        END IF;

        INSERT INTO transaction (debit_account_id, credit_account_id, amount)
        VALUES (special_account('edge', 'BTC'), aid, amount);

        RETURN currval('transaction_transaction_id_seq');
END; $$ LANGUAGE plpgsql;
