CREATE VIEW admin_user_view AS
SELECT
    u.*,
    bda.address bitcoin_address,
    lda.address litecoin_address
FROM
    "user" u
LEFT JOIN
    (
        SELECT a.user_id, address
        FROM btc_deposit_address bda
        INNER JOIN account a ON a.account_id = bda.account_id
    ) bda ON bda.user_id = u.user_id
LEFT JOIN
    (
        SELECT a.user_id, address
        FROM ltc_deposit_address lda
        INNER JOIN account a ON a.account_id = lda.account_id
    ) lda ON lda.user_id = u.user_id
WHERE
    bda.user_id = u.user_id;
