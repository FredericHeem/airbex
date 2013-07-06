ALTER TABLE "user"
    ADD COLUMN suspended boolean NOT NULL DEFAULT(false);

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
        WHERE a.user_id = OLD.user_id;
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER user_suspend_trigger
    AFTER UPDATE ON "user"
    FOR EACH ROW
    EXECUTE PROCEDURE suspend_user_trigger();

DROP VIEW admin_user_view;

CREATE OR REPLACE VIEW admin_user_view AS
 SELECT u.user_id, u.email, u.email_lower, u.created, u.admin, u.phone_number,
    u.phone_number_verify_code, u.phone_number_verify_attempts,
    u.phone_number_verify_attempt_at, u.phone_number_unverified, u.fee_ratio,
    u.first_name, u.last_name, u.address, u.postal_area, u.city, u.country,
    u.email_verify_code, u.email_verify_code_issued_at, u.email_verified_at,
    u.reset_email_code, u.reset_started_at, u.reset_phone_code, u.language,
    u.tag, bda.address AS bitcoin_address, lda.address AS litecoin_address,
    u.suspended
   FROM "user" u
   LEFT JOIN ( SELECT a.user_id, bda.address
           FROM btc_deposit_address bda
      JOIN account a ON a.account_id = bda.account_id) bda ON bda.user_id = u.user_id
   LEFT JOIN ( SELECT a.user_id, lda.address
      FROM ltc_deposit_address lda
   JOIN account a ON a.account_id = lda.account_id) lda ON lda.user_id = u.user_id;
