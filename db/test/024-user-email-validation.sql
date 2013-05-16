BEGIN; DO $$
BEGIN
    BEGIN
        PERFORM create_user('test@', 'key', 'secret');
    EXCEPTION
        WHEN OTHERS THEN
            RETURN;
    END;

    RAISE 'Fail';
END; $$; ROLLBACK;
