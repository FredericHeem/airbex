BEGIN;

SAVEPOINT before_tests;

-- User's first API key can do anything
DO $$
DECLARE
    uid int;
BEGIN
    uid := create_user('a@a', repeat('a', 64), FALSE);

    IF (
        SELECT api_key_id
        FROM api_key
        WHERE
            user_id = uid AND
            can_withdraw = TRUE AND
            can_deposit = TRUE AND
            can_trade = TRUE
    ) IS NULL THEN
        RAISE 'Failed, not found';
    END IF;
END; $$; ROLLBACK TO before_tests;

ROLLBACK;
