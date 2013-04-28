BEGIN; DO $$ <<fn>>
BEGIN
    PERFORM pop_ripple_withdraw_requests();
END; $$; ROLLBACK;
