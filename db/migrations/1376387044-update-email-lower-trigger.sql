CREATE OR REPLACE FUNCTION create_user(email character varying, key character varying)
  RETURNS integer AS
$BODY$
DECLARE
        user_id int;
BEGIN
        INSERT INTO "user" (email) VALUES (email);
        user_id := currval('user_user_id_seq');

        INSERT INTO api_key (api_key_id, user_id, "primary", can_deposit, can_withdraw, can_trade)
        VALUES (key, user_id, TRUE, TRUE, TRUE, TRUE);

        -- Pre-create accounts so that user_currency_account is read-only safe
        INSERT INTO account (currency_id, "type", user_id)
        SELECT currency_id, 'current', user_id
        FROM currency;

        RETURN user_id;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

CREATE FUNCTION user_email_lower() RETURNS trigger AS $$
BEGIN
    NEW.email_lower = LOWER(NEW.email);

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER user_email_lower_insert
    BEFORE INSERT OR
    UPDATE OF email
    ON "user"
    FOR EACH ROW
    EXECUTE PROCEDURE user_email_lower();
