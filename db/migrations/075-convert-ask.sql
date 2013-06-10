-- Amnt is in market scale
--  Returns how much was gained by the sale (in currency scale)
CREATE OR REPLACE FUNCTION convert_ask (
    uid int,
    mid int,
    amnt bigint
) RETURNS bigint AS $$
DECLARE
    m market%ROWTYPE;
    old_balance bigint;
    new_balance bigint;
BEGIN
    SELECT *
    INTO m
    FROM market
    WHERE market_id = mid;

    IF NOT FOUND THEN
        RAISE 'Market % not found.', mid;
    END IF;

    old_balance := (SELECT balance FROM account WHERE account_id = user_currency_account(uid, m.quote_currency_id));

    INSERT INTO "order" (user_id, market_id, side, volume, price)
    VALUES (uid, mid, 1, amnt, NULL);

    new_balance := (SELECT balance FROM account WHERE account_id = user_currency_account(uid, m.quote_currency_id));

    IF old_balance = new_balance THEN
        RAISE 'Expected balance to change.';
    END IF;

    RETURN new_balance - old_balance;
END; $$ LANGUAGE plpgsql;
