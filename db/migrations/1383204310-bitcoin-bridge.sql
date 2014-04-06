CREATE TABLE ripple_bitcoin_bridge_withdraw_request (
    request_id int PRIMARY KEY
        REFERENCES btc_withdraw_request(request_id),
    hash varchar(64) NOT NULL UNIQUE CHECK (hash::text ~ '^[A-Z\d]{64}$'::text),
    source_tag int,
    source_account varchar(34) NOT NULL CHECK(source_account ~ '^r[1-9A-Za-z]{25,34}$'),
    returning_at timestamptz,
    returned_at timestamptz,
    CONSTRAINT returning_check CHECK (returning_at IS NULL AND returned_at IS NULL OR returned_at IS NULL)
);

CREATE OR REPLACE FUNCTION withdraw_request_complete_audit()
  RETURNS trigger AS
$BODY$
BEGIN
    IF OLD.state <> NEW.state AND NEW.state = 'completed' THEN
        INSERT INTO activity (user_id, type, details)
        SELECT
            a.user_id,
            'WithdrawComplete',
            (SELECT row_to_json(v) FROM (
                SELECT
                    format_decimal(amount, c.scale) amount,
                    a.currency_id currency,
                    wr.method
            ) v)
        FROM withdraw_request wr
        INNER JOIN account a ON a.account_id = wr.account_id
        INNER JOIN currency c ON c.currency_id = a.currency_id
        WHERE wr.request_id = NEW.request_id AND a.user_id IS NOT NULL;
    END IF;

    RETURN NEW;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

CREATE OR REPLACE FUNCTION create_ripple_bitcoin_bridge_withdraw_request (
    h varchar(64),
    sa varchar(34),
    stag int,
    addr varchar(34),
    amnt bigint
) RETURNS int AS $$
DECLARE
    rid int;
    hid int;
BEGIN
    IF EXISTS (SELECT * FROM ripple_bitcoin_bridge_withdraw_request WHERE hash = h) THEN
        RETURN NULL;
    END IF;

    INSERT INTO hold (account_id, amount)
    VALUES (special_account('edge', 'BTC'), amnt)
    RETURNING hold_id INTO hid;

    INSERT INTO withdraw_request(method, hold_id, account_id, amount)
    VALUES ('BTC', hid, special_account('edge', 'BTC'), amnt)
    RETURNING request_id INTO rid;

    INSERT INTO btc_withdraw_request (request_id, address)
    VALUES (rid, addr);

    INSERT INTO ripple_bitcoin_bridge_withdraw_request (request_id, hash, source_tag, source_account)
    VALUES (rid, h, stag, sa);

    RETURN rid;
END; $$ LANGUAGE plpgsql;
