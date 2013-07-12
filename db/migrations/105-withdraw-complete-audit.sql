-- Complete withdraw request (WithdrawComplete)
CREATE OR REPLACE FUNCTION withdraw_request_complete_audit()
    RETURNS TRIGGER AS $$
BEGIN
    IF OLD.state <> NEW.state AND NEW.state = 'completed' THEN
        INSERT INTO activity (user_id, type, details)
        SELECT
            a.user_id,
            'WithdrawComplete',
            (SELECT row_to_json(v) FROM (
                SELECT
                    (amount / 10^c.scale)::varchar amount,
                    a.currency_id currency,
                    wr.method
            ) v)
        FROM withdraw_request wr
        INNER JOIN account a ON a.account_id = wr.account_id
        INNER JOIN currency c ON c.currency_id = a.currency_id
        WHERE wr.request_id = NEW.request_id;
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS withdraw_request_complete_audit
    ON withdraw_request;

CREATE TRIGGER withdraw_request_complete_audit
    AFTER UPDATE ON withdraw_request
    FOR EACH ROW
    EXECUTE PROCEDURE withdraw_request_complete_audit();
