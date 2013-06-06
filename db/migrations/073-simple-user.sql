-- Make existing users advanced
ALTER TABLE "user"
    ADD COLUMN simple BOOLEAN NOT NULL DEFAULT(false);

ALTER TABLE "user"
    ALTER COLUMN simple DROP DEFAULT;

ALTER TABLE "order"
    ALTER COLUMN price DROP NOT NULL;

--- Replace create_user, adding simple flag

DROP FUNCTION create_user(character varying, character varying);

CREATE OR REPLACE FUNCTION create_user(email character varying, key character varying, simple boolean)
  RETURNS integer AS
$BODY$
DECLARE
        user_id int;
BEGIN
        INSERT INTO "user" (email, email_lower, simple) VALUES (email, LOWER(email), simple);
        user_id := currval('user_user_id_seq');

        INSERT INTO api_key (api_key_id, user_id, "primary")
        VALUES (key, user_id, true);

        -- Pre-create accounts so that user_currency_account is read-only safe
        INSERT INTO account (currency_id, "type", user_id)
        SELECT currency_id, 'current', user_id
        FROM currency;

        RETURN user_id;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
