ALTER TABLE api_key
    ADD COLUMN can_deposit BOOLEAN NOT NULL DEFAULT(FALSE),
    ADD COLUMN can_withdraw BOOLEAN NOT NULL DEFAULT(FALSE),
    ADD COLUMN can_trade BOOLEAN NOT NULL DEFAULT(FALSE);

UPDATE
    api_key
SET
    can_deposit = TRUE,
    can_withdraw = TRUE,
    can_trade = TRUE
WHERE
    "primary" = TRUE;

-- Allow current api keys to continue trading.
UPDATE api_key
SET can_trade = TRUE;

ALTER TABLE api_key
    ADD CONSTRAINT primary_can_do_all
        CHECK ("primary" = FALSE OR (
            can_deposit = TRUE AND
            can_withdraw = TRUE AND
            can_trade = TRUE
        ));

-- Default API key should have all can_'s as true
CREATE OR REPLACE FUNCTION create_user(email character varying, key character varying, simple boolean)
  RETURNS integer AS
$BODY$
DECLARE
        user_id int;
BEGIN
        INSERT INTO "user" (email, email_lower, simple) VALUES (email, LOWER(email), simple);
        user_id := currval('user_user_id_seq');

        INSERT INTO api_key (api_key_id, user_id, "primary", can_deposit, can_withdraw, can_trade)
        VALUES (key, user_id, TRUE, TRUE, TRUE, TRUE);

        -- Pre-create accounts so that user_currency_account is read-only safe
        INSERT INTO account (currency_id, "type", user_id)
        SELECT currency_id, 'current', user_id
        FROM currency;

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
        RETURN;
    END IF;

    DELETE FROM api_key WHERE api_key_id = old_key;

    INSERT INTO api_key (api_key_id, user_id, "primary", can_trade, can_withdraw, can_deposit)
    VALUES (new_key, fn.user_id, TRUE, TRUE, TRUE, TRUE);
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
