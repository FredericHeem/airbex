CREATE FUNCTION format_decimal(v bigint, s int)
RETURNS varchar AS $$
    SELECT round(v / (10^s)::numeric, s)::varchar;
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION order_update_trigger(
) RETURNS TRIGGER AS $$
BEGIN
    IF NEW.matched > OLD.matched AND NEW.matched = NEW.original THEN
        -- Order has been filled
        INSERT INTO activity (user_id, type, details)
        SELECT
            NEW.user_id,
            'FillOrder',
            (SELECT row_to_json(v) FROM (
                SELECT
                    m.base_currency_id || m.quote_currency_id market,
                    (
                        SELECT format_decimal(sum(price * volume)::bigint, bc.scale)
                        FROM "match"
                        WHERE
                            (NEW.side = 0 AND bid_order_id = NEW.order_id) OR
                            (NEW.side = 1 AND ask_order_id = NEW.order_id)
                    ) total,
                    NEW.side "type",
                    format_decimal(NEW.price, m.scale) price,
                    format_decimal(NEW.original, bc.scale - m.scale) original
                FROM market m
                INNER JOIN currency bc ON bc.currency_id = m.base_currency_id
                INNER JOIN currency qc ON qc.currency_id = m.quote_currency_id
                WHERE m.market_id = NEW.market_id
            ) v);
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

-- Complete withdraw request (WithdrawComplete)
CREATE OR REPLACE FUNCTION withdraw_request_complete_audit()
    RETURNS TRIGGER AS $$
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
        WHERE wr.request_id = NEW.request_id;
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION edge_credit(uid integer, cid currency_id, amnt bigint)
  RETURNS integer AS $$
BEGIN
    INSERT INTO "transaction" (debit_account_id, credit_account_id, amount)
    VALUES (special_account('edge', cid), user_currency_account(uid, cid), amnt);

    -- Log activity
    INSERT INTO activity (user_id, type, details)
    SELECT
        uid,
        'Credit',
        (SELECT row_to_json(v) FROM (
            SELECT
                cid currency,
                format_decimal(amnt, c.scale) amount
            FROM currency c
            WHERE c.currency_id = cid
        ) v);

    RETURN currval('transaction_transaction_id_seq');
END; $$
  LANGUAGE plpgsql VOLATILE
  COST 100;
