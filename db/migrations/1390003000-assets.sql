DROP TABLE IF EXISTS asset CASCADE;
CREATE TABLE asset (
   asset_id serial PRIMARY KEY,
   currency currency_id NOT NULL,
   blockhash text NOT NULL,
   message text NOT NULL,
   created_at timestamptz NOT NULL DEFAULT current_timestamp
);
 
DROP TABLE IF EXISTS signatures;
CREATE TABLE signatures (
   asset_id int NOT NULL REFERENCES "asset"(asset_id),
   address text NOT NULL,
   signature text NOT NULL,
   wallet text
);