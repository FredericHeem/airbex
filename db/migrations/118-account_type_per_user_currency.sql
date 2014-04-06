 CREATE UNIQUE INDEX account_type_per_user_currency
    ON account (user_id, currency_id, "type")
    WHERE user_id IS NOT NULL;
