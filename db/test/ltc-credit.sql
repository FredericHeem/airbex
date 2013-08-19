BEGIN; DO $$
DECLARE
    uid int;
    addr varchar := 'LLHwYSCDXmZNb3irKBgVoWi3vsQ6GrX5xf';
    tx varchar := 'afc43c58683cc8da13d978a16ba55b7b22b626753b2470ddc321f30a3e0298d7';
BEGIN
    INSERT INTO currency (currency_id, scale, fiat)
    VALUES ('LTC', 8, false);

    INSERT INTO account (currency_id, type)
    VALUES ('LTC', 'edge');

    uid := create_user('a@a', repeat('a', 64));

    INSERT INTO ltc_deposit_address (address, account_id)
    VALUES (addr, user_currency_account(uid, 'LTC'));

    -- Legal
    PERFORM ltc_credit(
        tx,
        addr,
        10e8::bigint);

    -- Illegal
    BEGIN
        PERFORM ltc_credit('a', addr, 10e8::bigint);
        ROLLBACK;
    EXCEPTION WHEN others THEN
        IF NOT SQLERRM ~ 'ltc_txid_check' THEN
            RAISE '%', SQLERRM;
        END IF;
    END;

    BEGIN
        PERFORM ltc_credit(tx, addr, 10e8::bigint);
    EXCEPTION WHEN others THEN
        --
    END;
END; $$; ROLLBACK;
