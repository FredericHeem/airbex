INSERT INTO currency (currency_id, scale)
VALUES ('NOK', 5);

INSERT INTO account (currency_id, type)
VALUES ('NOK', 'edge');

INSERT INTO market (base_currency_id, quote_currency_id, scale)
VALUES ('BTC', 'NOK', 3);

SELECT user_currency_account(user_id, 'NOK')
FROM "user";

CREATE OR REPLACE FUNCTION create_user(email character varying, key character varying)
  RETURNS integer AS
$BODY$
DECLARE
        user_id int;
BEGIN
        INSERT INTO "user" (email, email_lower) VALUES (email, LOWER(email));
        user_id := currval('user_user_id_seq');

        INSERT INTO api_key (api_key_id, user_id)
        VALUES (key, user_id);

        -- Pre-create accounts so that user_currency_account is read-only safe
        PERFORM user_currency_account(user_id, 'BTC');
        PERFORM user_currency_account(user_id, 'XRP');
        PERFORM user_currency_account(user_id, 'LTC');
        PERFORM user_currency_account(user_id, 'NOK');

        RETURN user_id;
END; $BODY$
  LANGUAGE plpgsql;
