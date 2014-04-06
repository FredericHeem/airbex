INSERT INTO currency (currency_id, scale, fiat)
VALUES ('BTC', 8, false);

INSERT INTO account (currency_id, type)
VALUES ('BTC', 'edge'), ('BTC', 'fee');