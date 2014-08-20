INSERT INTO currency (currency_id, scale, fiat, withdraw_min, withdraw_max, name, address_regex, withdraw_fee, scale_display)
VALUES ('DRK', 8, false, 100000, 10000000000, 'Darkcoin', '^(X|3|m|n)[A-Za-z0-9]{26,33}$', 100000, 3);

INSERT INTO account (currency_id, type)
VALUES ('DRK', 'edge'), ('DRK', 'fee');

INSERT INTO account (currency_id, "type", user_id)
SELECT 'DRK', 'current', user_id
FROM "user";

INSERT INTO wallet(currency_id, height) values('DRK', 17000)