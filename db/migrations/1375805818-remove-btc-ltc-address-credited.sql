ALTER TABLE btc_deposit_address
    DROP COLUMN credited;

ALTER TABLE ltc_deposit_address
    DROP CONSTRAINT credited_non_negative;

ALTER TABLE ltc_deposit_address
    DROP COLUMN credited;
