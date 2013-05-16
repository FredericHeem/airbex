BEGIN; DO $$ <<fn>>
DECLARE
  a decimal;
  e decimal := 0.00000001;
BEGIN
    a := to_decimal('1', 'BTC');

    IF a <> e THEN
        RAISE 'Expected %, actual %', e, a;
    END IF;
END; $$; ROLLBACK;
