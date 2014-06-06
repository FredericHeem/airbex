INSERT INTO currency (currency_id, scale, fiat)
VALUES ('DOGE', 8, false);

INSERT INTO account (currency_id, type)
VALUES ('DOGE', 'edge'), ('DOGE', 'fee');

INSERT INTO account (currency_id, "type", user_id)
SELECT 'DOGE', 'current', user_id
FROM "user";
        
INSERT INTO wallet(currency_id, height) values('DOGE', 192422)