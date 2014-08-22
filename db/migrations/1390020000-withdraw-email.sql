ALTER TABLE withdraw_request
  ADD column code email_verify_code;
  
ALTER TABLE withdraw_request
DROP CONSTRAINT state_check;

ALTER TABLE withdraw_request
ADD CONSTRAINT state_check CHECK (state IN ('requested', 'sendingEmail', 'processing', 'cancelled', 'completed'));

ALTER TABLE withdraw_request
DROP CONSTRAINT hold_released;

ALTER TABLE withdraw_request
ADD CONSTRAINT hold_released CHECK (hold_id IS NULL OR state IN ('requested', 'sendingEmail', 'processing'));

UPDATE settings
SET
    notify_email_default = notify_email_default || 'CryptoWithdraw => true',
    notify_web_default = notify_web_default || 'CryptoWithdraw => true';
    
-- crypto_withdraw
CREATE OR REPLACE FUNCTION crypto_withdraw(currency text, uid integer, a character, amount bigint, code text)
  RETURNS integer AS
$BODY$
DECLARE
    rid int;
    
BEGIN
    rid := create_withdraw_request(user_currency_account(uid, currency), currency, amount, code);

    INSERT INTO crypto_withdraw_request (currency_id, request_id, address)
    VALUES (currency, rid, a);
    RETURN rid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE;

CREATE OR REPLACE FUNCTION create_withdraw_request (
    aid int,
    method varchar,
    amnt bigint,
    code text
) RETURNS int AS $$
DECLARE
    hid int;
    fee bigint;
    total bigint;
    status text;
BEGIN
    
    fee := (SELECT withdraw_fee from currency WHERE currency_id = method);
    total = amnt + fee;
    
    INSERT INTO hold (account_id, amount)
    VALUES (aid, total);

    hid := currval('hold_hold_id_seq');

    IF NOT NULL code THEN
        status := 'requested';
    ELSE
        status := 'sendingEmail';
    END IF;
    
    INSERT INTO withdraw_request(method, hold_id, account_id, amount, state, code)
    VALUES (method, hid, aid, amnt, status, code);

    RETURN currval('withdraw_request_request_id_seq');
END; $$ LANGUAGE plpgsql;

-- Verify the withdraw code sent by email
CREATE OR REPLACE FUNCTION withdraw_verify_code (
    withdrawCode email_verify_code
) RETURNS int AS $$
DECLARE
    rid int;
    cat timestamp;
BEGIN
    SELECT request_id, created_at
    INTO rid, cat
    FROM withdraw_request wr
    WHERE wr.code = withdrawCode AND state = 'sendingEmail';

    IF rid IS NULL THEN
        RAISE 'Unknown email verification code';
    END IF;

    UPDATE withdraw_request set state = 'requested'
    WHERE request_id = rid;

    RETURN rid;
END; $$ LANGUAGE plpgsql;