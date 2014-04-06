ALTER TABLE "user"
    ADD COLUMN username varchar(50) CHECK (username ~* '^[a-z0-9](?:[\\._]?[a-z0-9]){2,24}$');

CREATE UNIQUE INDEX user_username_unique
ON "user" (username)
WHERE username IS NOT NULL;


DROP VIEW user_view;

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
    "user".two_factor, "user".username,
        CASE
            WHEN "user".email_verified_at IS NULL THEN 0
            WHEN "user".phone_number IS NULL THEN 1
            WHEN "user".first_name IS NULL THEN 2
            WHEN "user".poi_approved_at IS NULL THEN 3
            WHEN "user".poa_approved_at IS NULL THEN 3
            ELSE 4
        END AS security_level
   FROM "user";
