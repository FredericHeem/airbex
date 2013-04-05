DROP FUNCTION create_user(character varying, character varying);

CREATE OR REPLACE FUNCTION create_user(email varchar, key character varying, secret character varying)
  RETURNS integer AS
$BODY$
DECLARE
        user_id int;
BEGIN
        INSERT INTO "user" (email, email_lower) VALUES (email, LOWER(email));
        user_id := currval('user_user_id_seq');

        INSERT INTO api_key (api_key_id, secret, user_id)
        VALUES (key, secret, user_id);

        PERFORM user_security_account(user_id, 'BTC');
        PERFORM user_security_account(user_id, 'XRP');

        RETURN user_id;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
