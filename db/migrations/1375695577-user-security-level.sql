CREATE VIEW user_view AS
SELECT
*,
CASE
    WHEN email_verified_at IS NULL THEN 0
    WHEN phone_number IS NULL THEN 1
    WHEN first_name IS NULL THEN 2
    WHEN poi_approved_at IS NULL THEN 3
    WHEN poa_approved_at IS NULL THEN 3
    ELSE 4
END security_level
FROM "user";
