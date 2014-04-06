-- liability
CREATE TABLE liability (
   currency currency_id NOT NULL,
   tree json NOT NULL DEFAULT '{}',
   created_at timestamptz NOT NULL DEFAULT current_timestamp
);