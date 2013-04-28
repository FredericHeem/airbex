BEGIN; DO $$ <<fn>>
BEGIN
    PERFORM pop_btc_withdraw_requests();
END; $$; ROLLBACK;
