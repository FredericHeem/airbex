CREATE INDEX transaction_type_ix
ON transaction (type);

CREATE INDEX transaction_type_and_id_ix
ON transaction (type, transaction_id);

CREATE INDEX withdraw_request_account_ix
ON withdraw_request (account_id);

CREATE INDEX transaction_credit_account_ix
ON transaction (credit_account_id);

CREATE INDEX transaction_debit_account_ix
ON transaction (debit_account_id);

CREATE INDEX transaction_credit_and_debit_account_ix
ON transaction (credit_account_id, debit_account_id);

CREATE INDEX transaction_created_ix
ON transaction (created_at);

CREATE INDEX withdraw_request_method_state_ix
ON withdraw_request (method, state);
