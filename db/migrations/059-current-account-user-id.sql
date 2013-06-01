ALTER TABLE account
ADD CONSTRAINT user_account_types
    CHECK (
        ("type" = 'current' AND user_id IS NOT NULL) OR
        ("type" = 'fee' AND user_id IS NULL) OR
        ("type" = 'edge' AND user_id IS NULL)
    );
