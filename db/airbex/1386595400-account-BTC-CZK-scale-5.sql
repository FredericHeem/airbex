INSERT INTO "currency" (currency_id, fiat, scale)
VALUES ('CZK', true, 5);

INSERT INTO market (base_currency_id, quote_currency_id, scale)
VALUES ('BTC', 'CZK', 5);

INSERT INTO account (currency_id, type, user_id)
SELECT 'CZK', 'current', user_id
FROM "user";

INSERT INTO account (currency_id, type)
VALUES ('CZK', 'edge'), ('CZK', 'fee');