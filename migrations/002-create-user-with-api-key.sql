DROP FUNCTION create_user();

CREATE FUNCTION create_user (
        key varchar(100),
        secret varchar(100)
) RETURNS int AS $$
DECLARE
        user_id int;
BEGIN
        user_id = nextval('user_user_id_seq');
        INSERT INTO "user" (user_id) VALUES (user_id);

        INSERT INTO api_key (api_key_id, secret, user_id)
        VALUES (key, secret, user_id);

        PERFORM user_security_account(user_id, 'BTC');

        RETURN user_id;
END; $$ LANGUAGE plpgsql;
