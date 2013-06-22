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
        rwr.request_id = wr.request_id AND
        a.account_id = wr.account_id AND
        c.currency_id = a.currency_id AND
        wr.request_id = (
            SELECT MIN(rwr.request_id)
            FROM
                ripple_withdraw_request rwr
            INNER JOIN
                withdraw_request wr ON wr.request_id = rwr.request_id
            INNER JOIN
                account a ON a.account_id = wr.account_id
            INNER JOIN
                currency c ON c.currency_id = a.currency_id
            WHERE
                wr.state = 'requested'
        )
    RETURNING
        wr.request_id,
        wr.amount,
        c.currency_id::currency_id,
        c.scale,
        rwr.address;
END; $BODY$
  LANGUAGE plpgsql;
