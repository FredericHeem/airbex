CREATE OR REPLACE FUNCTION suspend_user_trigger (
) RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.suspended = TRUE THEN
        PERFORM cancel_user_order(OLD.user_id, order_id)
        FROM "order"
        WHERE user_id = OLD.user_id AND volume > 0;

        PERFORM cancel_withdraw_request(request_id, 'User suspended')
        FROM withdraw_request wr
        INNER JOIN account a ON a.account_id = wr.account_id
        WHERE a.user_id = OLD.user_id AND
            wr.state = 'requested';
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;
