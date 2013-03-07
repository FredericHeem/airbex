BEGIN;
DO $$
DECLARE
        aid int;
        bal bigint;
BEGIN
        INSERT INTO account (security_id, type) VALUES ('BTC', 'edge');
        aid := currval('account_account_id_seq');

        PERFORM create_voucher ('999999999999999999999999999999', aid, 123);

        IF (SELECT hold FROM account WHERE account_id = aid) <> 123 THEN
                RAISE EXCEPTION 'hold not created';
        END IF;

        IF (SELECT balance FROM account WHERE account_id = aid) <> 0 THEN
                RAISE EXCEPTION 'balance incorrect, %', (SELECT balance FROM account WHERE account_id = aid);
        END IF;

        PERFORM redeem_voucher('999999999999999999999999999999', aid);

        IF (SELECT hold FROM account WHERE account_id = aid) <> 0 THEN
                RAISE EXCEPTION 'voucher not redeemed, account balance %, hold %',
                        (SELECT balance FROM account WHERE account_id = aid),
                        (SELECT hold FROM account WHERE account_id = aid);
        END IF;

        RETURN;
END; $$;
ROLLBACK;
