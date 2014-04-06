DROP VIEW account_view;

DROP FUNCTION from_decimal(numeric, currency_id);
DROP FUNCTION to_decimal(bigint, currency_id);

CREATE OR REPLACE VIEW account_view AS
SELECT
    a.account_id,
    a.currency_id,
    a.balance,
    a.hold,
    a.type,
    a.user_id,
    a.available
FROM (
    SELECT
        account_id,
        currency_id,
        balance,
        hold,
        type,
        user_id,
        balance - hold AS available
    FROM account
) a;
