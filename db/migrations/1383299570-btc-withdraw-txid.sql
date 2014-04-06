ALTER TABLE btc_withdraw_request
ADD COLUMN txid varchar(64) CHECK (txid IS NULL OR txid ~ '^[a-z0-9]{64}$');
