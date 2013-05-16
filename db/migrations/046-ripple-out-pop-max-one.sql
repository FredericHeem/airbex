CREATE OR REPLACE FUNCTION pop_ripple_withdraw_requests()
  RETURNS TABLE(request_id integer, amount bigint, currency_id currency_id, scale integer, address character varying) AS
$BODY$
BEGIN
    RETURN QUERY
    UPDATE withdraw_request wr
    SET state = 'processing'
    FROM
        ripple_withdraw_request rwr,
        account a,
        currency c
    WHERE
        wr.request_id = (
            SELECT MIN(wr.request_id)
            FROM
                withdraw_request wr,
                ripple_withdraw_request rwr,
                account a,
                currency c
            WHERE
                wr.request_id = rwr.request_id AND
                a.account_id = wr.account_id AND
                c.currency_id = a.currency_id AND
                wr.state = 'requested'
        )
    RETURNING
        wr.request_id,
        wr.amount,
        c.currency_id::currency_id,
        c.scale,
        rwr.address;
END; $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100
  ROWS 1000;

