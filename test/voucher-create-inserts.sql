BEGIN;

DO $$
DECLARE
        aid int;
        cnt int;
BEGIN
        INSERT INTO account (security_id, type) VALUES ('BTC', 'edge');
        aid := currval('account_account_id_seq');

        PERFORM create_voucher ('999999999999999999999999999999', aid, 123);

        SELECT COUNT(*) INTO cnt FROM voucher WHERE voucher_id = '999999999999999999999999999999';

        IF cnt <> 1 THEN
                RAISE EXCEPTION 'voucher was not inserted';
        END IF;
END;
$$;

ROLLBACK;
