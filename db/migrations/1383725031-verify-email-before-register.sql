-- Drop deps
DROP VIEW user_view;
DROP VIEW pending_email_notify;
DROP VIEW admin_user_view;

DROP FUNCTION create_email_verify_code(integer, email_verify_code);
DROP FUNCTION verify_email(email_verify_code);

CREATE DOMAIN api_key_id
  AS character varying(64)
  COLLATE pg_catalog."default"
  CONSTRAINT api_key_id_check CHECK (VALUE::text ~* '^[0-9a-f]{64}$'::text);

  CREATE TABLE user_pending (
    code email_verify_code PRIMARY KEY,
    email varchar(50) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT(now()),
    api_key_id api_key_id NOT NULL
);

CREATE UNIQUE INDEX user_pending_email_lower_unique
ON user_pending (LOWER(email));

CREATE OR REPLACE FUNCTION user_pending_email_lower_insert()
  RETURNS trigger AS
$BODY$
BEGIN
    IF EXISTS (SELECT 1 FROM "user" WHERE LOWER(email) = LOWER(NEW.email)) THEN
        RAISE 'Email already in use';
    END IF;

    RETURN NEW;
END; $BODY$
  LANGUAGE plpgsql;

CREATE INDEX activity_user_id_idx
ON activity (user_id);

CREATE INDEX btc_deposit_address_account_id_idx
ON btc_deposit_address (account_id);

CREATE INDEX ltc_deposit_address_account_id_idx
ON ltc_deposit_address (account_id);

CREATE INDEX api_key_user_id_idx
ON api_key (user_id);

CREATE INDEX account_user_id_idx
ON account (user_id);

CREATE INDEX bank_account_user_id_idx
ON bank_account (user_id);

CREATE OR REPLACE FUNCTION delete_user (
    uid int
) RETURNS void AS $$
BEGIN
    DELETE FROM activity
    WHERE user_id = uid;

    DELETE FROM btc_deposit_address bda
    USING account a
    WHERE a.account_id = bda.account_id AND a.user_id = uid;

    DELETE FROM ltc_deposit_address lda
    USING account a
    WHERE a.account_id = lda.account_id AND a.user_id = uid;

    DELETE FROM bank_account
    WHERE user_id = uid;

    DELETE FROM account
    WHERE user_id = uid;

    DELETE FROM api_key
    WHERE user_id = uid;

    DELETE FROM "user"
    WHERE user_id = uid;

    IF NOT FOUND THEN
        RAISE 'User % not found', uid;
    END IF;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER user_pending_email_lower_insert
  BEFORE INSERT
  ON user_pending
  FOR EACH ROW
  EXECUTE PROCEDURE user_pending_email_lower_insert();

CREATE FUNCTION create_user_end (
    c email_verify_code
) RETURNS int AS $$
DECLARE
    uid int;
    em varchar(50);
    ak api_key_id;
BEGIN
    SELECT email, api_key_id
    INTO em, ak
    FROM user_pending
    WHERE code = c;

    IF em IS NULL THEN
        RAISE 'Unknown email verification code';
    END IF;

    uid := create_user(em, ak);

    DELETE FROM user_pending
    WHERE code = c;

    RETURN uid;
END; $$ LANGUAGE plpgsql;

-- Migrate
UPDATE "user"
SET suspended = TRUE
WHERE email_verified_at IS NULL;

-- Delete users with no transactions
WITH user_with_tx AS (
    SELECT DISTINCT a.user_id
    FROM transaction t
    INNER JOIN account a ON a.account_id = t.debit_account_id
    WHERE a.user_id IS NOT NULL
    UNION
    SELECT DISTINCT a.user_id
    FROM transaction t
    INNER JOIN account a ON a.account_id = t.credit_account_id
)
SELECT delete_user(u.user_id)
FROM "user" u
WHERE
    u.email_verified_at IS NULL AND
    u.user_id NOT IN (SELECT user_id FROM user_with_tx);

ALTER TABLE "user"
DROP COLUMN email_verified_at,
DROP COLUMN email_verify_code,
DROP COLUMN email_verify_code_issued_at;

-- Re-create deps
CREATE OR REPLACE VIEW admin_user_view AS
 SELECT u.user_id, u.email, u.email_lower, u.created_at, u.admin,
    u.phone_number, u.phone_number_verify_code, u.phone_number_verify_attempts,
    u.phone_number_verify_attempt_at, u.phone_number_unverified, u.fee_ratio,
    u.first_name, u.last_name, u.address, u.postal_area, u.city, u.country,
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

CREATE OR REPLACE VIEW pending_email_notify AS
 SELECT a.activity_id, a.user_id, a.created_at, a.type, a.details, u.language,
    u.email, u.first_name
   FROM activity a
   JOIN "user" u ON u.user_id = a.user_id, settings s
  WHERE a.activity_id > s.notify_tip AND ((((s.notify_email_default || u.notify_email) || s.notify_user_visible) -> a.type::text)::boolean) IS TRUE;

CREATE OR REPLACE VIEW user_view AS
 SELECT "user".user_id, "user".email, "user".email_lower, "user".created_at,
    "user".admin, "user".phone_number, "user".phone_number_verify_code,
    "user".phone_number_verify_attempts, "user".phone_number_verify_attempt_at,
    "user".phone_number_unverified, "user".fee_ratio, "user".first_name,
    "user".last_name, "user".address, "user".postal_area, "user".city,
    "user".country,
    "user".reset_email_code, "user".reset_started_at, "user".reset_phone_code,
    "user".language, "user".tag, "user".suspended, "user".notify_email,
    "user".notify_web, "user".poi_approved_at, "user".poa_approved_at,
    "user".two_factor, "user".username,
        CASE
            WHEN "user".phone_number IS NULL THEN 1
            WHEN "user".first_name IS NULL THEN 2
            WHEN "user".poi_approved_at IS NULL THEN 3
            WHEN "user".poa_approved_at IS NULL THEN 3
            ELSE 4
        END AS security_level
   FROM "user";
