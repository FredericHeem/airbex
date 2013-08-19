BEGIN; DO $$ <<fn>>
DECLARE
  uid int;
  key varchar(64) := repeat('x', 64);
  baid int;
  rid int;
  wr withdraw_request%ROWTYPE;
  bwr bank_withdraw_request%ROWTYPE;
  h hold%ROWTYPE;
BEGIN
    INSERT INTO currency (currency_id, scale, fiat)
    VALUES ('NOK', 5, true);

    INSERT INTO account (currency_id, type)
    VALUES ('NOK', 'edge');

    uid := create_user('a@a', fn.key);

    -- Credit the user 100 NOK
    PERFORM edge_credit(uid, 'NOK', 100e5::bigint);

    -- Create a bank account for the user
    INSERT INTO bank_account (user_id, account_number)
    VALUES (uid, '12345')
    RETURNING bank_account_id INTO baid;

    -- Withdraw to that bank account
    rid := withdraw_bank(baid, 'NOK'::currency_id, 100e5::bigint);

    -- Verify
    SELECT * INTO wr FROM withdraw_request WHERE request_id = rid;

    IF wr IS NULL THEN
        RAISE 'request not found';
    END IF;

    IF wr.method <> 'bank' THEN
        RAISE 'wrong request method %', wr.method;
    END IF;

    SELECT * INTO h FROM hold WHERE hold_id = wr.hold_id;

    IF h IS NULL THEN
        RAISE 'hold not found';
    END IF;

    IF h.amount <> 100e5::bigint THEN
        RAISE 'hold amount % is incorrect', h.amount;
    END IF;

    IF (SELECT currency_id FROM account WHERE account_id = h.account_id) <> 'NOK' THEN
        RAISE 'incorrect currency';
    END IF;

    SELECT * INTO bwr FROM bank_withdraw_request WHERE request_id = rid;

    IF bwr IS NULL THEN
        RAISE 'bank withdraw request not found';
    END IF;

    IF bwr.bank_account_id <> baid THEN
        RAISE 'bank account id is wrong';
    END IF;
END; $$; ROLLBACK;
