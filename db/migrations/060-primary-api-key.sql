ALTER TABLE api_key
    ADD COLUMN "primary" boolean DEFAULT(true);

ALTER TABLE api_key
    ALTER COLUMN "primary" DROP DEFAULT;

CREATE UNIQUE INDEX api_key_one_primary_per_user
    ON api_key (user_id)
    WHERE "primary" = TRUE;

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
        PERFORM user_currency_account(user_id, 'BTC');
        PERFORM user_currency_account(user_id, 'XRP');
        PERFORM user_currency_account(user_id, 'LTC');
        PERFORM user_currency_account(user_id, 'NOK');

        RETURN user_id;
END; $BODY$
  LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION replace_api_key(old_key character varying, new_key character varying)
  RETURNS void AS
$BODY$ <<fn>>
DECLARE
    user_id int := (
        SELECT a.user_id
        FROM api_key a
        WHERE
            api_key_id = old_key AND
            "primary" = TRUE
    );
BEGIN
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'The specified old_key was not found';
    END IF;

    IF old_key = new_key THEN
        RAISE EXCEPTION 'old_key must not equal new_key';
    END IF;

    DELETE FROM api_key WHERE api_key_id = old_key;

    INSERT INTO api_key (api_key_id, user_id)
    VALUES (new_key, fn.user_id);
END; $BODY$ LANGUAGE plpgsql;
