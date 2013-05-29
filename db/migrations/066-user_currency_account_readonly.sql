CREATE OR REPLACE FUNCTION create_user(email character varying, key character varying)
  RETURNS integer AS
$BODY$
DECLARE
        user_id int;
BEGIN
        INSERT INTO "user" (email, email_lower) VALUES (email, LOWER(email));
        user_id := currval('user_user_id_seq');

        INSERT INTO api_key (api_key_id, user_id, "primary")
        VALUES (key, user_id, true);

        -- Pre-create accounts so that user_currency_account is read-only safe
        INSERT INTO account (currency_id, "type", user_id) VALUES
            ('BTC', 'current', user_id),
            ('XRP', 'current', user_id),
            ('LTC', 'current', user_id),
            ('NOK', 'current', user_id);

        RETURN user_id;
END; $BODY$
  LANGUAGE plpgsql VOLATILE;

CREATE OR REPLACE FUNCTION user_currency_account(uid integer, cid currency_id)
  RETURNS integer AS
$BODY$
BEGIN
    RETURN (
        SELECT account_id
        FROM account
        WHERE user_id = uid AND currency_id = cid
    );
END; $BODY$
  LANGUAGE plpgsql STABLE;
