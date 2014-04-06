ALTER TABLE "user"
    ADD COLUMN two_factor_failures int,
    ADD COLUMN two_factor_failure_at timestamptz,
    ADD COLUMN two_factor_success_counter int;
