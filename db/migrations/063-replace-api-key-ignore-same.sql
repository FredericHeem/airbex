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

    INSERT INTO api_key (api_key_id, user_id, "primary")
    VALUES (new_key, fn.user_id, TRUE);
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
