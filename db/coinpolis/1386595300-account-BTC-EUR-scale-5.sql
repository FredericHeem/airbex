INSERT INTO "currency" (currency_id, fiat, scale)
VALUES ('EUR', true, 5);

INSERT INTO market (base_currency_id, quote_currency_id, scale)
VALUES ('BTC', 'EUR', 3);

INSERT INTO account (currency_id, type, user_id)
SELECT 'EUR', 'current', user_id
FROM "user";

INSERT INTO account (currency_id, type)
VALUES ('EUR', 'edge'), ('EUR', 'fee');