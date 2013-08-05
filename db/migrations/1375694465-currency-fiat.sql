ALTER TABLE currency
    ADD COLUMN fiat boolean;

UPDATE currency
SET fiat = (currency_id = 'NOK');

ALTER TABLE currency
    ALTER fiat SET NOT NULL;
