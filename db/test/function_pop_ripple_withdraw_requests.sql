BEGIN; DO $$ <<fn>>
BEGIN
    CREATE TEMP TABLE discard AS
    SELECT * FROM pop_ripple_withdraw_requests();
END; $$; ROLLBACK;
