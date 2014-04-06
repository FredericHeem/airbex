CREATE TYPE bank_credit_state AS ENUM
   ('review',
    'approved',
    'canceled',
    'credited');

DROP TABLE IF EXISTS bank_credit;

CREATE TABLE bank_credit
(
  bank_credit_id serial NOT NULL,
  state bank_credit_state NOT NULL DEFAULT 'review'::bank_credit_state,
  transaction_id integer,
  reference character varying(50),
  amount bigint NOT NULL,
  currency_id currency_id NOT NULL,
  user_id integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT bank_credit_pkey PRIMARY KEY (bank_credit_id)
);

INSERT INTO bank_credit (state, transaction_id, reference, amount, currency_id, user_id, created_at)
SELECT
    'credited',
    t.transaction_id,
    bc.reference,
    t.amount,
    a.currency_id,
    a.user_id,
    t.created_at
FROM
    bank_credited bc
INNER JOIN transaction t
    ON t.transaction_id = bc.transaction_id
INNER JOIN account a
    ON a.account_id = t.credit_account_id;

DROP TABLE bank_credited;

CREATE OR REPLACE FUNCTION bank_credit_approved_trigger()
    RETURNS TRIGGER AS $$
DECLARE
    tid int;
BEGIN
    IF OLD.state = 'review' AND NEW.state = 'approved' THEN
        NEW.transaction_id := edge_credit(NEW.user_id, NEW.currency_id, NEW.amount);
        NEW.state := 'credited';
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER bank_credit_approved_trigger
  BEFORE UPDATE
  ON bank_credit
  FOR EACH ROW
  EXECUTE PROCEDURE bank_credit_approved_trigger();
