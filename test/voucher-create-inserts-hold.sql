BEGIN;
DO $$
DECLARE
        aid int;
        amnt bigint;
BEGIN
        INSERT INTO account (security_id, type) VALUES ('BTC', 'edge');
        aid := currval('account_account_id_seq');

        PERFORM create_voucher ('999999999999999999999999999999', aid, 123);

        SELECT h.amount INTO amnt
        FROM voucher v
        INNER JOIN hold h ON h.hold_id = v.hold_id
        WHERE voucher_id = '999999999999999999999999999999';

        IF amnt <> 123 THEN
                RAISE EXCEPTION 'bad hold amount';
        END IF;

        RETURN;
END; $$;

ROLLBACK;


