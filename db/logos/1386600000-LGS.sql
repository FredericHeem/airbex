INSERT INTO currency (currency_id, scale, fiat)
VALUES ('LGS', 8, false);

INSERT INTO account (currency_id, type)
VALUES ('LGS', 'edge'), ('LGS', 'fee');
