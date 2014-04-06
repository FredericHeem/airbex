INSERT INTO currency (currency_id, scale, fiat)
VALUES ('LTC', 8, false);

INSERT INTO account (currency_id, type)
VALUES ('LTC', 'edge'), ('LTC', 'fee');