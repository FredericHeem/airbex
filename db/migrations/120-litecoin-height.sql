ALTER TABLE settings
    ADD COLUMN litecoin_height int;

UPDATE settings
SET litecoin_height = height
FROM ltc_block;

DROP TABLE ltc_block;
