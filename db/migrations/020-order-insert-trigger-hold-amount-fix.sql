CREATE OR REPLACE FUNCTION order_insert()
  RETURNS trigger AS
$BODY$
DECLARE
    hid int;
    aid int;
    b book%ROWTYPE;
    bs_scale int;
    qs_scale int;
    h bigint;
BEGIN
    RAISE NOTICE 'before insert trigger for order %', NEW.order_id;

    IF NEW.hold_id IS NOT NULL THEN
        RAISE EXCEPTION 'did not expect order to have hold set at insert';
    END IF;

    IF NEW.volume = 0 THEN
        RAISE EXCEPTION 'did not expect order to be inserted with zero volume';
    END IF;

    SELECT * INTO b FROM book WHERE book_id = NEW.book_id;

    IF NEW.side = 0 THEN
        aid = user_security_account(NEW.user_id, b.quote_security_id);
    ELSE
        aid = user_security_account(NEW.user_id, b.base_security_id);
    END IF;

    SELECT scale INTO bs_scale FROM security WHERE security_id = b.base_security_id;
    SELECT scale INTO qs_scale FROM security WHERE security_id = b.quote_security_id;

    -- create hold
    RAISE NOTICE 'creating hold on account % for order %', aid, NEW.order_id;

    h := ceil(CASE WHEN NEW.side = 0 THEN NEW.price * NEW.volume / 10^(bs_scale - qs_scale) ELSE NEW.volume END);

    RAISE NOTICE 'hold %', h;

    INSERT INTO hold (account_id, amount) VALUES (aid, h);
    hid := currval('hold_hold_id_seq');

    NEW.hold_id := hid;
    NEW.original = NEW.volume;

    RETURN NEW;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
