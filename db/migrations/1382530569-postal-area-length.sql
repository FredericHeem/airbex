DROP VIEW admin_user_view;
DROP VIEW user_view;

ALTER TABLE "user"
ALTER COLUMN postal_area TYPE varchar(50);

CREATE OR REPLACE VIEW user_view AS
 SELECT "user".user_id, "user".email, "user".email_lower, "user".created_at,
    "user".admin, "user".phone_number, "user".phone_number_verify_code,
    "user".phone_number_verify_attempts, "user".phone_number_verify_attempt_at,
    "user".phone_number_unverified, "user".fee_ratio, "user".first_name,
    "user".last_name, "user".address, "user".postal_area, "user".city,
    "user".country, "user".email_verify_code,
    "user".email_verify_code_issued_at, "user".email_verified_at,
    "user".reset_email_code, "user".reset_started_at, "user".reset_phone_code,
    "user".language, "user".tag, "user".suspended, "user".notify_email,
    "user".notify_web, "user".poi_approved_at, "user".poa_approved_at,
    "user".two_factor,
        CASE
            WHEN "user".email_verified_at IS NULL THEN 0
            WHEN "user".phone_number IS NULL THEN 1
            WHEN "user".first_name IS NULL THEN 2
            WHEN "user".poi_approved_at IS NULL THEN 3
            WHEN "user".poa_approved_at IS NULL THEN 3
            ELSE 4
        END AS security_level
   FROM "user";

CREATE OR REPLACE VIEW admin_user_view AS
 SELECT u.user_id, u.email, u.email_lower, u.created_at, u.admin,
    u.phone_number, u.phone_number_verify_code, u.phone_number_verify_attempts,
    u.phone_number_verify_attempt_at, u.phone_number_unverified, u.fee_ratio,
    u.first_name, u.last_name, u.address, u.postal_area, u.city, u.country,
    u.email_verify_code, u.email_verify_code_issued_at, u.email_verified_at,
    u.reset_email_code, u.reset_started_at, u.reset_phone_code, u.language,
    u.tag, bda.address AS bitcoin_address, lda.address AS litecoin_address,
    u.suspended, u.poa_approved_at, u.poi_approved_at,
    u.two_factor IS NOT NULL AS two_factor
   FROM "user" u
   LEFT JOIN ( SELECT a.user_id, bda.address
           FROM btc_deposit_address bda
      JOIN account a ON a.account_id = bda.account_id) bda ON bda.user_id = u.user_id
   LEFT JOIN ( SELECT a.user_id, lda.address
      FROM ltc_deposit_address lda
   JOIN account a ON a.account_id = lda.account_id) lda ON lda.user_id = u.user_id;
