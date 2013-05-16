CREATE VIEW withdraw_request_view AS
SELECT
    wr.request_id,
    wr.created,
    wr.completed,
    wr.method,
    wr.amount,
    wr.state,
    wr.error,
    a.currency_id,
    a.user_id,
    rwr.address ripple_address,
    bwr.address bitcoin_address,
    lwr.address litecoin_address
FROM
    withdraw_request wr
INNER JOIN
    account a ON a.account_id = wr.account_id
LEFT JOIN
    ripple_withdraw_request rwr ON rwr.request_id = wr.request_id
LEFT JOIN
    btc_withdraw_request bwr ON bwr.request_id = wr.request_id
LEFT JOIN
    ltc_withdraw_request lwr ON lwr.request_id = wr.request_id
ORDER BY
    wr.request_id DESC;
