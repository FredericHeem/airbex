INSERT INTO currency (currency_id, scale, fiat)
VALUES ('LGS', 2, false);

INSERT INTO account (currency_id, type)
VALUES ('LGS', 'edge'), ('LGS', 'fee');

INSERT INTO wallet(currency_id, height) values('LGS', 0)
