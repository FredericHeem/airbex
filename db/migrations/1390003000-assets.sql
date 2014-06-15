DROP TABLE IF EXISTS asset;
CREATE TABLE asset (
   asset_id serial PRIMARY KEY,
   currency currency_id NOT NULL,
   blockhash text DEFAULT '',
   asset_json json NOT NULL DEFAULT '{}',
   created_at timestamptz NOT NULL DEFAULT current_timestamp
);
 
