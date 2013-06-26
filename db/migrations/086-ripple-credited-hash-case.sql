ALTER TABLE ripple_credited
    DROP CONSTRAINT IF EXISTS check_hash_length;

UPDATE ripple_credited
SET hash = upper(hash);

ALTER TABLE ripple_credited
  ADD CONSTRAINT check_hash_length CHECK (hash::text ~ '^[A-Z\d]{64}$'::text);
