BEGIN;
DO $$
DECLARE
    bob int;
    bob_oid int;
    alice_oid int;
    alice int;
    bid int;
    mid int;
BEGIN
    
    INSERT INTO currency (currency_id, scale, fiat)
    VALUES ('BTC', 8, false);

    INSERT INTO account (currency_id, type)
    VALUES ('BTC', 'edge'), ('BTC', 'fee');
    
    INSERT INTO currency (currency_id, scale, fiat)
    VALUES ('LTC', 8, false);

    INSERT INTO account (currency_id, type)
    VALUES ('LTC', 'edge'), ('LTC', 'fee');
    
    INSERT INTO market (base_currency_id, quote_currency_id, scale)
    VALUES ('BTC', 'LTC', 8);
    
    INSERT INTO currency (currency_id, scale, fiat)
    VALUES ('EUR', 5, true);

    INSERT INTO account (currency_id, type)
    VALUES ('EUR', 'edge'), ('EUR', 'fee');

    INSERT INTO market (base_currency_id, quote_currency_id, scale)
    VALUES ('BTC', 'EUR', 3);
    
    INSERT INTO currency (currency_id, scale, fiat)
    VALUES ('CHF', 5, true);
    
    INSERT INTO market (base_currency_id, quote_currency_id, scale)
    VALUES ('BTC', 'CHF', 3);

    INSERT INTO account (currency_id, type)
    VALUES ('CHF', 'edge'), ('CHF', 'fee');

END; $$;
COMMIT;
