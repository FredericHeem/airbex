CREATE VIEW account_transactions AS
SELECT * FROM (
	SELECT transaction_id, created, -amount amount, debit_account_id account_id, user_id
	FROM "transaction" dt
	INNER JOIN account a ON a.account_id = debit_account_id
	UNION
	SELECT transaction_id, created, amount, credit_account_id account_id, user_id
	FROM "transaction" ct
	INNER JOIN account a ON a.account_id = credit_account_id
) t
ORDER BY transaction_id;
