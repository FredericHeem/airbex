BEGIN; DO $$ <<fn>>
BEGIN
    CREATE TEMP TABLE discard AS
    SELECT * FROM pop_ltc_withdraw_requests();
END; $$; ROLLBACK;
