UPDATE api_key
SET api_key_id = api_key_id || repeat('a', 64 - 20)
WHERE length(api_key_id) = 20;

ALTER TABLE api_key
    DROP CONSTRAINT key_length_or_legacy,
    DROP COLUMN secret,
    ADD CONSTRAINT key_length CHECK (length(api_key_id) = '64');

DROP FUNCTION replace_legacy_api_key(character varying, character varying, character varying);
