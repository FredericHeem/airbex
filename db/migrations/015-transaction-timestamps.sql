ALTER TABLE "transaction"
ADD COLUMN created timestamp NOT NULL DEFAULT now();
