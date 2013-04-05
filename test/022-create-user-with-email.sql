BEGIN; DO $$
DECLARE
  uid int;
BEGIN
	uid := create_user('test@TEST.com', 'key', 'secret');

	IF (SELECT COUNT(*) FROM "user" WHERE email = 'test@TEST.com') <> 1 THEN
		RAISE 'User not found by email';
	END IF;

	IF (SELECT COUNT(*) FROM "user" WHERE email_lower = 'test@test.com') <> 1 THEN
		RAISE 'User not found by email_lower';
	END IF;

	IF (SELECT COUNT(*) FROM api_key WHERE api_key_id = 'key' AND secret = 'secret' AND user_id = uid) <> 1 THEN
		RAISE 'User first api key/secret not found';
	END IF;
END; $$; ROLLBACK;
