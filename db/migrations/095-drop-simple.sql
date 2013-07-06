DROP FUNCTION create_user(character varying, character varying, boolean);

CREATE OR REPLACE FUNCTION create_user(email character varying, key character varying)
  RETURNS integer AS
$BODY$
DECLARE
        user_id int;
BEGIN
        INSERT INTO "user" (email, email_lower) VALUES (email, LOWER(email));
        user_id := currval('user_user_id_seq');

        INSERT INTO api_key (api_key_id, user_id, "primary", can_deposit, can_withdraw, can_trade)
        VALUES (key, user_id, TRUE, TRUE, TRUE, TRUE);

        -- Pre-create accounts so that user_currency_account is read-only safe
        INSERT INTO account (currency_id, "type", user_id)
        SELECT currency_id, 'current', user_id
        FROM currency;

        RETURN user_id;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

CREATE OR REPLACE FUNCTION bank_credit(uid integer, cid currency_id, amnt bigint, ref character varying)
  RETURNS integer AS
$BODY$
DECLARE
    tid int;
    mid int;
BEGIN
    tid := edge_credit(uid, cid, amnt);

    INSERT INTO bank_credited (transaction_id, reference)
    VALUES (tid, ref);

    RETURN tid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

DROP VIEW admin_user_view;

ALTER TABLE "user"
    DROP COLUMN "simple";

CREATE OR REPLACE VIEW admin_user_view AS
 SELECT u.user_id, u.email, u.email_lower, u.created, u.admin, u.phone_number,
    u.phone_number_verify_code, u.phone_number_verify_attempts,
    u.phone_number_verify_attempt_at, u.phone_number_unverified, u.fee_ratio,
    u.first_name, u.last_name, u.address, u.postal_area, u.city, u.country,
    u.email_verify_code, u.email_verify_code_issued_at, u.email_verified_at,
    u.reset_email_code, u.reset_started_at, u.reset_phone_code, u.language,
    u.tag, bda.address AS bitcoin_address, lda.address AS litecoin_address
   FROM "user" u
   LEFT JOIN ( SELECT a.user_id, bda.address
           FROM btc_deposit_address bda
      JOIN account a ON a.account_id = bda.account_id) bda ON bda.user_id = u.user_id
   LEFT JOIN ( SELECT a.user_id, lda.address
      FROM ltc_deposit_address lda
   JOIN account a ON a.account_id = lda.account_id) lda ON lda.user_id = u.user_id;
