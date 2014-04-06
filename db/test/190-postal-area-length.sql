BEGIN; DO $$ <<fn>>
DECLARE
    uid int;
BEGIN
    uid := create_user('a@a', repeat('x', 64));

    UPDATE "user"
    SET
        first_name = 'Sandy',
        last_name = 'Bover',
        address = 'Flat C-5 Zamhrsi Lane\nTansubi Rd. New Nilie',
        city = 'Momfasa',
        postal_area = '50105-75492',
        country = 'KE'
    WHERE
        user_id = uid;

    IF NOT FOUND THEN
        RAISE 'User not found';
    END IF;
END; $$; ROLLBACK;
