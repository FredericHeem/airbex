-- market table
-- 20140424 add min and max for volume and price for market

ALTER TABLE market
ADD COLUMN name text NOT NULL default '';

ALTER TABLE market
ADD COLUMN askminvolume bigint NOT NULL default 1;

ALTER TABLE market
ADD COLUMN askmaxprice bigint NOT NULL default 1000000000;

ALTER TABLE market
ADD COLUMN bidminvolume bigint NOT NULL default 1;

ALTER TABLE market
ADD COLUMN bidminprice bigint NOT NULL default 1;

