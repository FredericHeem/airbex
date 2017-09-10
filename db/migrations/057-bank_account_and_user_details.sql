CREATE TABLE bank_account (
    bank_account_id serial PRIMARY KEY,
    user_id int NOT NULL REFERENCES "user"(user_id),
    created_at timestamptz NOT NULL DEFAULT(current_timestamp),
    verified_at timestamptz,
    details json NOT NULL,
    display_name varchar(25) NOT NULL
);

ALTER TABLE "user"
    ADD COLUMN first_name varchar(50),
    ADD COLUMN last_name varchar(50),
    ADD COLUMN address varchar(200),
    ADD COLUMN postal_area varchar(10),
    ADD COLUMN city varchar(50),
    ADD COLUMN country char(2);

DROP VIEW withdraw_request_view;

CREATE OR REPLACE VIEW withdraw_request_view AS
 SELECT wr.request_id, wr.created, wr.completed, wr.method, wr.amount, wr.state,
    wr.error, a.currency_id, a.user_id, rwr.address AS ripple_address,
    bwr.address AS bitcoin_address, lwr.address AS litecoin_address,
    mwr.destination manual_destination
   FROM withdraw_request wr
   JOIN account a ON a.account_id = wr.account_id
   LEFT JOIN ripple_withdraw_request rwr ON rwr.request_id = wr.request_id
   LEFT JOIN btc_withdraw_request bwr ON bwr.request_id = wr.request_id
   LEFT JOIN ltc_withdraw_request lwr ON lwr.request_id = wr.request_id
   LEFT JOIN manual_withdraw_request mwr ON mwr.request_id = wr.request_id
  ORDER BY wr.request_id DESC;
