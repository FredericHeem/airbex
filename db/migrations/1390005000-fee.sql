DROP TABLE IF EXISTS fee CASCADE;
CREATE TABLE fee (
   user_id serial REFERENCES "user"(user_id),
   market_id serial REFERENCES "market"(market_id),
   fee_bid_taker decimal(6, 4) NOT NULL DEFAULT 0.005,
   fee_bid_maker decimal(6, 4) NOT NULL DEFAULT 0.002,
   fee_ask_taker decimal(6, 4) NOT NULL DEFAULT 0.005,
   fee_ask_maker decimal(6, 4) NOT NULL DEFAULT 0.002
);

ALTER TABLE market
ADD COLUMN fee_bid_taker decimal(6, 4) NOT NULL DEFAULT 0.005;

ALTER TABLE market
ADD COLUMN fee_bid_maker decimal(6, 4) NOT NULL DEFAULT 0.002;

ALTER TABLE market
ADD COLUMN fee_ask_taker decimal(6, 4) NOT NULL DEFAULT 0.005;

ALTER TABLE market
ADD COLUMN fee_ask_maker decimal(6, 4) NOT NULL DEFAULT 0.002;


CREATE OR REPLACE FUNCTION fee_bid_taker_ratio (
    uid int,
    mid int
) RETURNS fee_ratio AS $$
DECLARE
    result fee_ratio;
BEGIN
    result := (SELECT fee_bid_taker FROM fee f WHERE f.user_id = uid AND f.market_id = mid);

    IF result IS NOT NULL THEN
        RETURN result;
    END IF;

    result := (SELECT fee_bid_taker FROM market f WHERE f.market_id = mid);
    IF result IS NOT NULL THEN
        RETURN result;
    END IF;    
    
    -- default is 0.5% (0.005)
    RETURN 0.005;
END; $$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION fee_bid_maker_ratio (
    uid int,
    mid int
) RETURNS fee_ratio AS $$
DECLARE
    result fee_ratio;
BEGIN
    result := (SELECT fee_bid_maker FROM fee f WHERE f.user_id = uid AND f.market_id = mid);

    IF result IS NOT NULL THEN
        RETURN result;
    END IF;
    
    result := (SELECT fee_bid_maker FROM market f WHERE f.market_id = mid);
    IF result IS NOT NULL THEN
        RETURN result;
    END IF; 
    -- default is 0.2% (0.002)
    RETURN 0.002;
END; $$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION fee_ask_taker_ratio (
    uid int,
    mid int
) RETURNS fee_ratio AS $$
DECLARE
    result fee_ratio;
BEGIN
    result := (SELECT fee_ask_taker FROM fee f WHERE f.user_id = uid AND f.market_id = mid);

    IF result IS NOT NULL THEN
        RETURN result;
    END IF;
    
    result := (SELECT fee_ask_taker FROM market f WHERE f.market_id = mid);
    IF result IS NOT NULL THEN
        RETURN result;
    END IF; 
    -- default is 0.5% (0.005)
    RETURN 0.005;
END; $$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION fee_ask_maker_ratio (
    uid int,
    mid int
) RETURNS fee_ratio AS $$
DECLARE
    result fee_ratio;
BEGIN
    result := (SELECT fee_ask_maker FROM fee f WHERE f.user_id = uid AND f.market_id = mid);

    IF result IS NOT NULL THEN
        RETURN result;
    END IF;

    result := (SELECT fee_ask_maker FROM market f WHERE f.market_id = mid);
    IF result IS NOT NULL THEN
        RETURN result;
    END IF; 
    
    -- default is 0.2% (0.002)
    RETURN 0.002;
END; $$ LANGUAGE plpgsql STABLE;

-- order_insert()
-- Exeception if volume is 0
-- Set the column original
-- Insert into the hold table:
--   bid: (1 + fee_bid_taker_ratio) * volume * price (EUR)
--   ask: volune (BTC) 
-- Set the order hold_id

CREATE OR REPLACE FUNCTION order_insert()
  RETURNS trigger AS
$BODY$
DECLARE
    hid int;
    aid int;
    bc_scale int;
    qc_scale int;
    h bigint;
    bid_fee_ratio decimal(6, 4);
    
BEGIN
    IF NEW.volume = 0 THEN
        RAISE EXCEPTION 'Did not expect order to be inserted with zero volume';
    END IF;

    NEW.original = NEW.volume;   
    NEW.fee_ratio = 0;
    
    bid_fee_ratio := fee_bid_taker_ratio(NEW.user_id, NEW.market_id);

    RAISE NOTICE 'order_insert: volume:%, price: %, bid fee ratio: % to order #% (from user #%)',
        NEW.volume,
        NEW.price,
        bid_fee_ratio,
        NEW.order_id,
        NEW.user_id;

    IF NEW.price IS NOT NULL THEN
        INSERT INTO hold (account_id, amount)
        SELECT
            user_currency_account(
                NEW.user_id,
                CASE WHEN NEW.type = 'ask' THEN bc.currency_id ELSE qc.currency_id END
            ),
            CASE WHEN NEW.type = 'bid' THEN
                ceil((1 + bid_fee_ratio) * NEW.volume * NEW.price / (10^(bc.scale))::bigint)
            ELSE
                ceil(NEW.volume)
            END
        FROM
            market m,
            currency bc,
            currency qc
        WHERE
            m.market_id = NEW.market_id AND
            bc.currency_id = m.base_currency_id AND
            qc.currency_id = m.quote_currency_id
        RETURNING
            hold_id INTO hid;

        NEW.hold_id := hid;
    END IF;

    RETURN NEW;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

-- BEFORE UPDATE ON "order"
CREATE OR REPLACE FUNCTION order_before_update() RETURNS trigger AS $$
DECLARE
    fee_ratio decimal(6, 4);
    ao_id int;
    bo_id int;
BEGIN
            
        IF NEW.type = 'bid' THEN
            ao_id := (SELECT ask_order_id 
                      FROM match m 
                      WHERE m.bid_order_id = NEW.order_id 
                      ORDER BY match_id DESC LIMIT 1);
            IF ao_id > NEW.order_id THEN
                -- maker fee
                fee_ratio := fee_bid_maker_ratio(NEW.user_id, NEW.market_id);
            ELSE
                -- taker fee
                fee_ratio := fee_bid_taker_ratio(NEW.user_id, NEW.market_id);
            END IF;
        ELSE
            bo_id := (SELECT bid_order_id 
                      FROM match m 
                      WHERE m.ask_order_id = NEW.order_id 
                      ORDER BY match_id DESC LIMIT 1);
            IF bo_id > NEW.order_id THEN
                -- maker fee
                fee_ratio := fee_ask_maker_ratio(NEW.user_id, NEW.market_id);
            ELSE
                -- taker fee
                fee_ratio := fee_ask_taker_ratio(NEW.user_id, NEW.market_id);
            END IF;                 
        END IF; 
          
        NEW.fee_ratio = fee_ratio;
  
    RAISE NOTICE 'order_before_update: id %, volume :%, fee %',
            NEW.order_id,
            NEW.volume,
            fee_ratio;
              
    IF NEW.volume > OLD.volume THEN
        RAISE EXCEPTION 'volume of order increased';
    END IF;

    IF NEW.volume < OLD.volume THEN
        IF NEW.volume = 0 THEN
            NEW.hold_id = null;
        END IF;
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

-- AFTER UPDATE ON "order"
-- order_update_trigger:
-- Compute and set the fee ratio
-- Insert the "FillOrder" activity
    
CREATE OR REPLACE FUNCTION order_update_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
        
    IF NEW.matched > OLD.matched AND NEW.matched = NEW.original THEN
        
        RAISE NOTICE 'order_update_trigger: volume:%, price: %, original %, match new %, old %s to order #% (from user #%), fee %',
            NEW.volume,
            NEW.price,
            NEW.original,
            NEW.matched,
            OLD.matched,
            NEW.order_id,
            NEW.user_id,
            NEW.fee_ratio; 
        
        -- Order has been filled
        INSERT INTO activity (user_id, type, details)
        SELECT
            NEW.user_id,
            'FillOrder',
            (SELECT row_to_json(v) FROM (
                SELECT
                    m.base_currency_id || m.quote_currency_id market,
                    (
                        SELECT format_decimal(sum(price * volume)::bigint, bc.scale + qc.scale)
                        FROM "match"
                        WHERE
                            (NEW.type = 'bid' AND bid_order_id = NEW.order_id) OR
                            (NEW.type = 'ask' AND ask_order_id = NEW.order_id)
                    ) total,
                    NEW.type,
                    format_decimal(NEW.price, qc.scale) price,
                    format_decimal(NEW.original, bc.scale) original,
                    NEW.fee_ratio fee_ratio
                FROM market m
                INNER JOIN currency bc ON bc.currency_id = m.base_currency_id
                INNER JOIN currency qc ON qc.currency_id = m.quote_currency_id
                WHERE m.market_id = NEW.market_id
            ) v);
    END IF;

    RETURN NEW;
END; $$;

-- match_insert
-- Update the orders:
--    decrease "volume" and increase "match" by the matched volume
--    order_update_trigger() will be invoked
-- Reduce hold: 
--   ask hold = volume (i.e 2 BTC)
--   bid hold = (1 + bid_fee_ratio) * volume * price (EUR)
-- Insert transactions: bid, bid fee, ask and ask fee.
--   bid: set the credit in base currency (i.e BTC) to the buyer by the value of the volume matched, no fees here 
--   bid fees: in quote currency (i.e EUR): volume * price * bid_fee_ratio
--   ask: set the credit for the seller (i.e EUR)  : volume * price * (1 - ask_fee_ratio)
--   ask fees: in quote currency (i.e EUR): volume * price * ask_fee_ratio

CREATE OR REPLACE FUNCTION match_insert()
  RETURNS trigger AS
$BODY$
DECLARE
    bido order%ROWTYPE;
    asko order%ROWTYPE;
    ask_credit bigint;
    bid_credit bigint;
    bc_scale int;
    qc_scale int;
    m market%ROWTYPE;
    ucount int;
BEGIN
    SELECT * INTO bido FROM "order" WHERE order_id = NEW.bid_order_id;
    SELECT * INTO asko FROM "order" WHERE order_id = NEW.ask_order_id;
    SELECT * INTO m FROM market WHERE market_id = asko.market_id;

    bc_scale := (SELECT scale FROM currency WHERE currency_id = m.base_currency_id);
    qc_scale := (SELECT scale FROM currency WHERE currency_id = m.quote_currency_id);

    UPDATE "order"
    SET volume = volume - NEW.volume, matched = matched + NEW.volume
    WHERE order_id = bido.order_id OR order_id = asko.order_id;

    GET DIAGNOSTICS ucount = ROW_COUNT;

    IF ucount <> 2 THEN
        RAISE 'Expected 2 order updates, did %', ucount;
    END IF;

    bid_credit := NEW.volume;

    IF random() < 0.5 THEN
        ask_credit := ceil(NEW.price * NEW.volume / 10^(bc_scale));
    ELSE
        ask_credit := floor(NEW.price * NEW.volume * (1 - asko.fee_ratio) / 10^(bc_scale));
    END IF;

    RAISE NOTICE 'match_insert: price %, volume %, bid % fee %s, ask % fee %, bid id %, ask id %, mid %', 
        NEW.price,
        NEW.volume,
        bid_credit,
        bido.fee_ratio,
        ask_credit,
        asko.fee_ratio,
        NEW.bid_order_id,
        NEW.ask_order_id,
        asko.market_id;

    -- Reload the bid and ask order modified by the previous order table update
    SELECT * INTO bido FROM "order" WHERE order_id = NEW.bid_order_id;
    SELECT * INTO asko FROM "order" WHERE order_id = NEW.ask_order_id;

    -- Reduce asker hold
    UPDATE "hold"
    SET
        amount = asko.volume
    WHERE hold_id = asko.hold_id;

    -- Reduce bidder hold
    UPDATE "hold"
    SET
        amount = ceil((1 + bido.fee_ratio) * bido.volume * bido.price / (10^(bc_scale))::bigint)
    WHERE
        hold_id = bido.hold_id;

    IF bido.user_id <> asko.user_id THEN
        INSERT INTO transaction (debit_account_id, credit_account_id, amount, type, details)
        VALUES (
            user_currency_account(asko.user_id, m.base_currency_id),
            user_currency_account(bido.user_id, m.base_currency_id),
            bid_credit,
            'Match',
            (SELECT row_to_json(v) FROM (
                    SELECT
                        NEW.match_id
                ) v)
        );

        INSERT INTO transaction (debit_account_id, credit_account_id, amount, type, details)
        VALUES (
            user_currency_account(bido.user_id, m.quote_currency_id),
            user_currency_account(asko.user_id, m.quote_currency_id),
            ask_credit,
            'Match',
            (SELECT row_to_json(v) FROM (
                    SELECT
                        NEW.match_id
                ) v)
        );
    END IF;

    -- Fees
    IF asko.fee_ratio > 0 THEN
        INSERT INTO "transaction" (debit_account_id ,credit_account_id, amount, type, details)
        VALUES (
            user_currency_account(asko.user_id, m.quote_currency_id),
            special_account('fee', m.quote_currency_id),
            ceil(NEW.volume * NEW.price * asko.fee_ratio / (10^(bc_scale))::bigint),
            'MatchFee',
            (SELECT row_to_json(v) FROM (
                    SELECT
                        NEW.match_id,
                        asko.fee_ratio fee_ratio
                ) v)
        );
    END IF;

    IF bido.fee_ratio > 0 THEN
        INSERT INTO "transaction" (debit_account_id, credit_account_id, amount, type, details)
        VALUES (
            user_currency_account(bido.user_id, m.quote_currency_id),
            special_account('fee', m.quote_currency_id),
            ceil(NEW.price * NEW.volume * bido.fee_ratio / (10^(bc_scale))::bigint),
            'MatchFee',
            (SELECT row_to_json(v) FROM (
                    SELECT
                        NEW.match_id,
                        bido.fee_ratio fee_ratio
                ) v)
        );
    END IF;

    RETURN NEW;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;


DROP VIEW IF EXISTS market_summary_view;

CREATE VIEW market_summary_view AS
    SELECT m.market_id,
           m.name,
           m.base_currency_id, 
           m.quote_currency_id,
            (SELECT max(o.price) AS max FROM order_view o WHERE (((o.market_id = m.market_id) AND (o.type = 'bid')) AND (o.volume > 0))) AS bid, (SELECT min(o.price) AS min FROM order_view o WHERE (((o.market_id = m.market_id) AND (o.type = 'ask')) AND (o.volume > 0))) AS ask, (SELECT om.price FROM (match_view om JOIN "order" bo ON ((bo.order_id = om.bid_order_id))) WHERE (bo.market_id = m.market_id) ORDER BY om.created_at DESC LIMIT 1) AS last, (SELECT max(om.price) AS max FROM (match_view om JOIN "order" bo ON ((bo.order_id = om.bid_order_id))) WHERE ((bo.market_id = m.market_id) AND (age(om.created_at) < '1 day'::interval))) AS high, (SELECT min(om.price) AS min FROM (match_view om JOIN "order" bo ON ((bo.order_id = om.bid_order_id))) WHERE ((bo.market_id = m.market_id) AND (age(om.created_at) < '1 day'::interval))) AS low, (SELECT sum(ma.volume) AS sum FROM (match ma JOIN order_view o ON ((ma.bid_order_id = o.order_id))) WHERE ((o.market_id = m.market_id) AND (age(ma.created_at) < '1 day'::interval))) AS volume 
    FROM market m ORDER BY m.base_currency_id, m.quote_currency_id;


-- insert into fee(user_id, market_id) select u.user_id, m.market_id from market m, "user" u;

