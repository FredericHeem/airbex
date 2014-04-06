ALTER TABLE bank_account DROP CONSTRAINT enough_information;

ALTER TABLE bank_account
  ADD CONSTRAINT enough_information CHECK (
    account_number IS NOT NULL AND iban IS NULL AND swiftbic IS NULL AND routing_number IS NULL OR
    account_number IS NULL AND iban IS NOT NULL AND swiftbic IS NOT NULL AND routing_number IS NULL OR
    account_number IS NOT NULL AND iban IS NULL AND swiftbic IS NOT NULL);
