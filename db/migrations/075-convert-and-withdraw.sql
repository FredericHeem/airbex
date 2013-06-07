CREATE OR REPLACE FUNCTION convert_and_withdraw (
    uid int,
    bid int,
    mid int,
    amnt bigint
) RETURNS bigint AS $$
DECLARE
    qamnt bigint;
    qc currency_id;
BEGIN
    IF (SELECT user_id FROM bank_account WHERE bank_account_id = bid) <> uid THEN
        RAISE 'User does not own bank account.';
    END IF;

    qamnt := convert_ask(uid, mid, amnt);

    RAISE NOTICE 'Converted amount %', qamnt;

    qc := (SELECT quote_currency_id FROM market WHERE market_id = mid);

    RETURN withdraw_bank(bid, qc, qamnt);
END; $$ LANGUAGE plpgsql;
