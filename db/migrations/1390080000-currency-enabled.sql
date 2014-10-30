ALTER TABLE currency
ADD COLUMN active boolean DEFAULT true;

ALTER TABLE market
ADD COLUMN active boolean DEFAULT true;

DROP VIEW IF EXISTS currency_active_view;
    
CREATE VIEW currency_active_view AS
    SELECT * FROM currency WHERE active=true;
    
DROP VIEW IF EXISTS market_view;

CREATE VIEW market_active_view AS
    SELECT * FROM market WHERE active=true;
    
DROP VIEW IF EXISTS market_summary_view;

CREATE VIEW market_summary_view AS
    SELECT m.market_id,
           m.name,
           m.base_currency_id, 
           m.quote_currency_id,
            (SELECT max(o.price) AS max FROM order_view o WHERE (((o.market_id = m.market_id) AND (o.type = 'bid')) AND (o.volume > 0))) AS bid, (SELECT min(o.price) AS min FROM order_view o WHERE (((o.market_id = m.market_id) AND (o.type = 'ask')) AND (o.volume > 0))) AS ask, (SELECT om.price FROM (match_view om JOIN "order" bo ON ((bo.order_id = om.bid_order_id))) WHERE (bo.market_id = m.market_id) ORDER BY om.created_at DESC LIMIT 1) AS last, (SELECT max(om.price) AS max FROM (match_view om JOIN "order" bo ON ((bo.order_id = om.bid_order_id))) WHERE ((bo.market_id = m.market_id) AND (age(om.created_at) < '1 day'::interval))) AS high, (SELECT min(om.price) AS min FROM (match_view om JOIN "order" bo ON ((bo.order_id = om.bid_order_id))) WHERE ((bo.market_id = m.market_id) AND (age(om.created_at) < '1 day'::interval))) AS low, (SELECT sum(ma.volume) AS sum FROM (match ma JOIN order_view o ON ((ma.bid_order_id = o.order_id))) WHERE ((o.market_id = m.market_id) AND (age(ma.created_at) < '1 day'::interval))) AS volume 
    FROM market_active_view m ORDER BY m.base_currency_id, m.quote_currency_id;

DROP VIEW account_view;

ALTER TABLE account
ADD COLUMN active boolean DEFAULT true;

CREATE OR REPLACE VIEW account_view AS
SELECT
    a.account_id,
    a.currency_id,
    a.balance,
    a.hold,
    a.type,
    a.user_id,
    a.available
FROM (
    SELECT
        account_id,
        currency_id,
        balance,
        hold,
        type,
        user_id,
        balance - hold AS available
    FROM account
    WHERE active=true
) a;

CREATE OR REPLACE FUNCTION create_user(email character varying, key character varying)
  RETURNS integer AS
$BODY$
DECLARE
        user_id int;
BEGIN
        INSERT INTO "user" (email) VALUES (email);
        user_id := currval('user_user_id_seq');

        INSERT INTO api_key (api_key_id, user_id, "primary", can_deposit, can_withdraw, can_trade)
        VALUES (key, user_id, TRUE, TRUE, TRUE, TRUE);

        -- Pre-create accounts so that user_currency_account is read-only safe
        INSERT INTO account (currency_id, "type", user_id)
        SELECT currency_id, 'current', user_id
        FROM currency_active_view;

        RETURN user_id;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;



