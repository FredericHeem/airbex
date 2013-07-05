-- New users should not be admin
BEGIN; DO $$ <<fn>>
DECLARE
    uid int;
BEGIN
    uid := create_user('a@a', repeat('a', 64));
    PERFORM replace_api_key(repeat('a', 64), repeat('a', 64));
END; $$; ROLLBACK;
