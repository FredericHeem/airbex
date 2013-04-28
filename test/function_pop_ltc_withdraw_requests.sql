BEGIN; DO $$ <<fn>>
BEGIN
    PERFORM pop_ltc_withdraw_requests();
END; $$; ROLLBACK;
