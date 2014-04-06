DROP VIEW admin_user_view;

ALTER TABLE ltc_credited
    ADD COLUMN transaction_id int
        REFERENCES transaction(transaction_id),
    ALTER address TYPE varchar(34);

ALTER TABLE ltc_deposit_address
    ALTER address TYPE varchar(34);

CREATE OR REPLACE FUNCTION ltc_credit(t character, a character, amnt bigint)
  RETURNS integer AS
$BODY$
DECLARE
    aid int;
    uid int;
    tid int;
BEGIN
    SELECT ac.account_id, ac.user_id
    INTO aid, uid
    FROM ltc_deposit_address lda
    INNER JOIN account ac ON ac.account_id = lda.account_id
    WHERE lda.address = a;

    tid := edge_credit(uid, 'LTC', amnt);

    INSERT INTO ltc_credited (txid, address, transaction_id)
    VALUES (t, a, tid);

    RETURN tid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE;

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
