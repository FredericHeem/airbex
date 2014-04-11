INSERT INTO currency (currency_id, scale, fiat)
VALUES ('LGS', 2, false);

INSERT INTO account (currency_id, type)
VALUES ('LGS', 'edge'), ('LGS', 'fee');

UPDATE deamon SET height = 0 where currency='lgs';
