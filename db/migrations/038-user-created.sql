ALTER TABLE "user"
ADD COLUMN created timestamptz NOT NULL DEFAULT now();
