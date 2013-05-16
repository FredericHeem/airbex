ALTER TABLE api_key
ALTER COLUMN api_key_id TYPE VARCHAR(64),
ALTER COLUMN secret TYPE VARCHAR(20),
ALTER COLUMN secret DROP NOT NULL;

DROP FUNCTION create_user(character varying, character varying, character varying);

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

        PERFORM user_security_account(user_id, 'BTC');
        PERFORM user_security_account(user_id, 'XRP');

        RETURN user_id;
END; $BODY$
  LANGUAGE plpgsql VOLATILE;

CREATE OR REPLACE FUNCTION replace_api_key(
    old_key varchar(64),
    new_key varchar(64)
) RETURNS void AS $$ <<fn>>
DECLARE
    user_id int := (SELECT a.user_id FROM api_key a WHERE api_key_id = old_key);
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
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION replace_legacy_api_key(
    old_key varchar(20),
    old_secret varchar(20),
    new_key varchar(64)
) RETURNS void AS $$ <<fn>>
DECLARE
    user_id int := (SELECT a.user_id FROM api_key a WHERE api_key_id = old_key AND secret = old_secret);
BEGIN
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'The specified old_key/old_secret combination was not found';
    END IF;

    DELETE FROM api_key WHERE api_key_id = old_key;

    INSERT INTO api_key (api_key_id, user_id)
    VALUES (new_key, fn.user_id);
END; $$ LANGUAGE plpgsql;

ALTER TABLE api_key
ADD CONSTRAINT key_length_or_legacy CHECK (secret IS NOT NULL OR LENGTH(api_key_id) = 64);
