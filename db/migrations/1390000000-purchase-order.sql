-- purchase_order
DROP TABLE IF EXISTS purchase_order;
CREATE TABLE "purchase_order" (
    id serial PRIMARY KEY,
    user_id int NOT NULL REFERENCES "user"(user_id),
    market_id int NOT NULL REFERENCES market(market_id),
    type order_type NOT NULL,
    amount bigint NOT NULL CHECK (amount >= 0),
    amount_credited bigint DEFAULT 0 CHECK (amount_credited >= 0),
    address text,
    state text NOT NULL DEFAULT 'created',
    created_at timestamptz DEFAULT(current_timestamp),
    lastupdated_at timestamptz DEFAULT(current_timestamp)
);

DROP TABLE IF EXISTS bank_credit;

CREATE TABLE bank_credit
(
  bank_credit_id serial NOT NULL,
  state bank_credit_state NOT NULL DEFAULT 'review'::bank_credit_state,
  transaction_id integer,
  reference character varying(50),
  purchase_order_id int,
  amount bigint NOT NULL,
  currency_id currency_id NOT NULL,
  user_id integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT bank_credit_pkey PRIMARY KEY (bank_credit_id)
);

CREATE OR REPLACE FUNCTION bank_credit_approved_trigger()
    RETURNS TRIGGER AS $$
DECLARE
    tid int;
BEGIN
    RAISE NOTICE 'bank_credit_approved_trigger: user %, % => %, poid: %, %s %s',
        NEW.user_id,
        OLD.state,
        NEW.state,
        OLD.purchase_order_id,
        NEW.amount,
        NEW.currency_id;
        
    IF OLD.state = 'review' AND NEW.state = 'approved' THEN
        NEW.transaction_id := edge_credit(NEW.user_id, NEW.currency_id, NEW.amount);
        NEW.state := 'credited';        
            
        UPDATE purchase_order
        SET state='credited',
            amount_credited=NEW.amount
        WHERE id = OLD.purchase_order_id AND state = 'created';            
        
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER bank_credit_approved_trigger
  BEFORE UPDATE
  ON bank_credit
  FOR EACH ROW
  EXECUTE PROCEDURE bank_credit_approved_trigger();
