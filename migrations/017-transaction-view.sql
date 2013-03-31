CREATE VIEW transaction_view AS
SELECT t.*, amount / 10^scale amount_decimal
FROM "transaction" t
INNER JOIN account da ON da.account_id = t.debit_account_id
INNER JOIN "security" s ON s.security_id = da.security_id;

-- mistakenly pluralized
DROP VIEW account_transactions;

CREATE VIEW account_transaction AS
SELECT * FROM (
	SELECT transaction_id, created, -amount amount, -amount_decimal amount_decimal, debit_account_id account_id, user_id
	FROM "transaction_view" dt
	INNER JOIN account a ON a.account_id = debit_account_id
	UNION
	SELECT transaction_id, created, amount, amount_decimal, credit_account_id account_id, user_id
	FROM "transaction_view" ct
	INNER JOIN account a ON a.account_id = credit_account_id
) t
ORDER BY transaction_id;
