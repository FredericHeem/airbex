CREATE TABLE bank_account (
    bank_account_id serial PRIMARY KEY,
    user_id int NOT NULL REFERENCES "user"(user_id),
    created_at timestamptz NOT NULL DEFAULT(current_timestamp),
    verified_at timestamptz,
    details json NOT NULL
);

ALTER TABLE "user"
    ADD COLUMN first_name varchar(50),
    ADD COLUMN last_name varchar(50),
    ADD COLUMN address varchar(200),
    ADD COLUMN postal_area varchar(10),
    ADD COLUMN city varchar(50),
    ADD COLUMN country char(2),
    ADD CONSTRAINT full_details_or_no_details CHECK (
        first_name IS NULL = last_name IS NULL AND
        first_name IS NULL = address IS NULL AND
        first_name IS NULL = postal_area IS NULL AND
        first_name IS NULL = city IS NULL AND
        first_name IS NULL = country IS NULL
    );
