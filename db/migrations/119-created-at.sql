-- Drop deps
DROP VIEW activity_web;
DROP VIEW admin_order_view;
DROP VIEW active_order_view;
DROP VIEW market_summary_view;
DROP VIEW match_view;
DROP VIEW order_depth_view;
DROP VIEW order_view;
DROP VIEW pending_email_notify;
DROP VIEW bank_withdraw_request_view;
DROP VIEW withdraw_request_view;
DROP VIEW admin_user_view;
DROP VIEW account_transaction_view;
DROP VIEW transaction_view;

-- Migrations
ALTER TABLE account
    ADD COLUMN created_at timestamptz DEFAULT(current_timestamp);

ALTER TABLE activity
    RENAME created TO created_at;

ALTER TABLE "match"
    RENAME created TO created_at;

ALTER TABLE "order"
    ADD COLUMN created_at timestamptz DEFAULT(current_timestamp);

ALTER TABLE "transaction"
    RENAME created TO created_at;

ALTER TABLE "transaction"
    ALTER created_at TYPE timestamptz;

ALTER TABLE "user"
    RENAME created TO created_at;

ALTER TABLE voucher
    ADD COLUMN created_at timestamptz DEFAULT(current_timestamp);

ALTER TABLE withdraw_request
    RENAME created TO created_at;

ALTER TABLE withdraw_request
    RENAME completed TO completed_at;

ALTER TABLE withdraw_request
    ALTER completed_at TYPE timestamptz;

ALTER TABLE withdraw_request
    ADD COLUMN cancelled_at timestamptz;

-- Restore deps

CREATE OR REPLACE VIEW transaction_view AS
 SELECT t.transaction_id, t.debit_account_id, t.credit_account_id, t.amount,
    t.created_at,
    (t.amount::double precision / (10::double precision ^ c.scale::double precision))::numeric AS amount_decimal
   FROM transaction t
   JOIN account da ON da.account_id = t.debit_account_id
   JOIN currency c ON c.currency_id::text = da.currency_id::text;

CREATE OR REPLACE VIEW account_transaction_view AS
 SELECT t.transaction_id, t.created_at, t.amount, t.amount_decimal, t.account_id,
    t.currency_id, t.user_id
   FROM (         SELECT dt.transaction_id, dt.created_at, - dt.amount AS amount,
                    - dt.amount_decimal AS amount_decimal,
                    dt.debit_account_id AS account_id, a.currency_id, a.user_id
                   FROM transaction_view dt
              JOIN account a ON a.account_id = dt.debit_account_id
        UNION
                 SELECT ct.transaction_id, ct.created_at, ct.amount,
                    ct.amount_decimal, ct.credit_account_id AS account_id,
                    a.currency_id, a.user_id
                   FROM transaction_view ct
              JOIN account a ON a.account_id = ct.credit_account_id) t
  ORDER BY t.transaction_id;

CREATE OR REPLACE VIEW admin_user_view AS
 SELECT u.user_id, u.email, u.email_lower, u.created_at, u.admin, u.phone_number,
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

CREATE OR REPLACE VIEW withdraw_request_view AS
 SELECT wr.request_id, wr.created_at, wr.completed_at, wr.method, wr.amount, wr.state,
    wr.error, a.currency_id, a.user_id, rwr.address AS ripple_address,
    bwr.address AS bitcoin_address, lwr.address AS litecoin_address,
    bawr.bank_account_id
   FROM withdraw_request wr
   JOIN account a ON a.account_id = wr.account_id
   LEFT JOIN ripple_withdraw_request rwr ON rwr.request_id = wr.request_id
   LEFT JOIN btc_withdraw_request bwr ON bwr.request_id = wr.request_id
   LEFT JOIN ltc_withdraw_request lwr ON lwr.request_id = wr.request_id
   LEFT JOIN bank_withdraw_request bawr ON bawr.request_id = wr.request_id
  ORDER BY wr.request_id DESC;

CREATE OR REPLACE VIEW bank_withdraw_request_view AS
 SELECT bawr.request_id, wr.amount, a.user_id, a.currency_id, wr.state,
    wr.error, wr.created_at, wr.completed_at, bawr.bank_account_id
   FROM bank_withdraw_request bawr
   JOIN withdraw_request wr ON wr.request_id = bawr.request_id
   JOIN account a ON a.account_id = wr.account_id
  ORDER BY bawr.request_id DESC;

CREATE OR REPLACE VIEW pending_email_notify AS
 SELECT a.activity_id, a.user_id, a.created_at, a.type, a.details, u.language,
    u.email, u.first_name
   FROM activity a
   JOIN "user" u ON u.user_id = a.user_id, settings s
  WHERE a.activity_id > s.notify_tip AND u.email_verified_at IS NOT NULL AND ((((s.notify_email_default || u.notify_email) || s.notify_user_visible) -> a.type::text)::boolean) IS TRUE;

CREATE OR REPLACE VIEW order_view AS
 SELECT o.order_id, o.market_id, o.side, o.price, o.volume, o.original,
    o.cancelled, o.matched, o.user_id, o.hold_id, o.created_at,
    (o.price::double precision / (10::double precision ^ m.scale::double precision))::numeric AS price_decimal,
    (o.volume::double precision / (10::double precision ^ (bc.scale - m.scale)::double precision))::numeric AS volume_decimal,
    (o.original::double precision / (10::double precision ^ (bc.scale - m.scale)::double precision))::numeric AS original_decimal,
    (o.cancelled::double precision / (10::double precision ^ (bc.scale - m.scale)::double precision))::numeric AS cancelled_decimal,
    (o.matched::double precision / (10::double precision ^ (bc.scale - m.scale)::double precision))::numeric AS matched_decimal
   FROM "order" o
   JOIN market m ON m.market_id = o.market_id
   JOIN currency bc ON bc.currency_id::text = m.base_currency_id::text;

CREATE OR REPLACE VIEW order_depth_view AS
 SELECT order_view.market_id, order_view.side, order_view.price_decimal,
    sum(order_view.volume_decimal) AS volume_decimal, order_view.price,
    sum(order_view.volume) AS volume
   FROM order_view
  WHERE order_view.volume > 0
  GROUP BY order_view.market_id, order_view.side, order_view.price_decimal, order_view.price
  ORDER BY order_view.market_id, order_view.price_decimal;


CREATE OR REPLACE VIEW match_view AS
 SELECT om.match_id, om.bid_order_id, om.ask_order_id, om.price, om.volume,
    om.created_at,
    (om.price::double precision / (10::double precision ^ m.scale::double precision))::numeric AS price_decimal,
    (om.volume::double precision / (10::double precision ^ (bc.scale - m.scale)::double precision))::numeric AS volume_decimal
   FROM match om
   JOIN "order" bo ON bo.order_id = om.bid_order_id
   JOIN market m ON m.market_id = bo.market_id
   JOIN currency bc ON bc.currency_id::text = m.base_currency_id::text;

CREATE OR REPLACE VIEW market_summary_view AS
 SELECT m.market_id, m.scale, m.base_currency_id, m.quote_currency_id,
    ( SELECT max(o.price) AS max
           FROM order_view o
          WHERE o.market_id = m.market_id AND o.side = 0 AND o.volume > 0) AS bid,
    ( SELECT min(o.price) AS min
           FROM order_view o
          WHERE o.market_id = m.market_id AND o.side = 1 AND o.volume > 0) AS ask,
    ( SELECT om.price
           FROM match_view om
      JOIN "order" bo ON bo.order_id = om.bid_order_id
     WHERE bo.market_id = m.market_id
     ORDER BY om.created_at DESC
    LIMIT 1) AS last,
    ( SELECT max(om.price) AS max
           FROM match_view om
      JOIN "order" bo ON bo.order_id = om.bid_order_id
     WHERE bo.market_id = m.market_id AND age(om.created_at) < '1 day'::interval) AS high,
    ( SELECT min(om.price) AS min
           FROM match_view om
      JOIN "order" bo ON bo.order_id = om.bid_order_id
     WHERE bo.market_id = m.market_id AND age(om.created_at) < '1 day'::interval) AS low,
    ( SELECT sum(ma.volume) AS sum
           FROM match ma
      JOIN order_view o ON ma.bid_order_id = o.order_id
     WHERE o.market_id = m.market_id AND age(ma.created_at) < '1 day'::interval) AS volume
   FROM market m
  ORDER BY m.base_currency_id, m.quote_currency_id;

CREATE OR REPLACE VIEW active_order_view AS
 SELECT order_view.order_id, order_view.market_id, order_view.side,
    order_view.price, order_view.volume, order_view.original,
    order_view.cancelled, order_view.matched, order_view.user_id,
    order_view.hold_id, order_view.price_decimal, order_view.volume_decimal,
    order_view.original_decimal, order_view.cancelled_decimal, order_view.created_at
   FROM order_view
  WHERE order_view.volume > 0;

CREATE OR REPLACE VIEW admin_order_view AS
 SELECT format_decimal(o.price, m.scale) AS price, o.side AS type,
    format_decimal(o.volume, bc.scale - m.scale) AS remaining,
    format_decimal(o.original, bc.scale - m.scale) AS original,
    format_decimal(o.matched, bc.scale - m.scale) AS matched, o.market_id,
    m.base_currency_id::text || m.quote_currency_id::text AS market, u.user_id,
    u.email
   FROM "order" o
   JOIN market m ON m.market_id = o.market_id
   JOIN "user" u ON u.user_id = o.user_id
   JOIN currency bc ON bc.currency_id::text = m.base_currency_id::text
  WHERE o.volume > 0
  ORDER BY o.side,
CASE
    WHEN o.side = 0 THEN - o.price
    ELSE o.price
END;

CREATE OR REPLACE VIEW activity_web AS
 SELECT a.activity_id, a.user_id, a.created_at, a.type, a.details
   FROM activity a
   JOIN "user" u ON u.user_id = a.user_id, settings s
  WHERE ((((s.notify_web_default || u.notify_web) || s.notify_user_visible) -> a.type::text)::boolean) IS TRUE;


CREATE OR REPLACE FUNCTION cancel_withdraw_request(rid integer, err character varying)
  RETURNS integer AS
$BODY$
DECLARE
        hid int;
BEGIN
    hid := (SELECT hold_id FROM withdraw_request WHERE request_id = rid);

    IF hid IS NULL THEN
        RAISE 'Withdraw request % does not exist or has no hold', rid;
    END IF;

    DELETE FROM "hold" WHERE hold_id = hid;

    UPDATE withdraw_request SET state = 'cancelled', error = err,
      cancelled_at = current_timestamp
    WHERE request_id = rid;

    RETURN rid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

CREATE OR REPLACE FUNCTION confirm_withdraw(rid integer)
  RETURNS integer AS
$BODY$
DECLARE
        aid int;
        hmnt bigint;
        itid int;
        hid int;
        cid currency_id;
BEGIN
        SELECT h.account_id, h.amount, h.hold_id, a.currency_id INTO aid, hmnt, hid, cid
        FROM withdraw_request wr
        INNER JOIN hold h ON wr.hold_id = h.hold_id
        INNER JOIN account a ON h.account_id = a.account_id
        WHERE wr.request_id = rid;

        IF NOT FOUND THEN
                RAISE EXCEPTION 'request/hold not found';
        END IF;

        UPDATE withdraw_request
        SET
            hold_id = NULL,
            completed_at = current_timestamp,
            state = 'completed'
        WHERE request_id = rid;

        DELETE from hold WHERE hold_id = hid;

        INSERT INTO transaction (debit_account_id, credit_account_id, amount)
        VALUES (aid, special_account('edge', cid), hmnt);

        itid := currval('transaction_transaction_id_seq');

        RETURN itid;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
