INSERT INTO "currency" (currency_id, fiat, scale)
VALUES ('USD', true, 5);

INSERT INTO market (base_currency_id, quote_currency_id, scale)
VALUES ('BTC', 'USD', 3);

INSERT INTO account (currency_id, type, user_id)
SELECT 'USD', 'current', user_id
FROM "user";

INSERT INTO account (currency_id, type)
VALUES ('USD', 'edge'), ('USD', 'fee');