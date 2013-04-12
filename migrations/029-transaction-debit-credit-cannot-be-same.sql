ALTER TABLE "transaction"
ADD CONSTRAINT transaction_debit_credit_not_same CHECK (debit_account_id <> credit_account_id);
