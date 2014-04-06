-- document id
CREATE TABLE document (
   user_id int REFERENCES "user"(user_id),
   document_id serial PRIMARY KEY,
   name text NOT null,
   filename text NOT NULL default '',
   file_extension text NOT NULL default '',
   path text NOT NULL default '',
   "type" text NOT NULL DEFAULT '',
   size bigint NOT NULL DEFAULT 0,
   image text NOT NULL DEFAULT '',
   created timestamptz NOT NULL DEFAULT current_timestamp,
   status text NOT NULL,
   last_modified_date timestamptz NOT NULL DEFAULT current_timestamp,
   message text NOT NULL DEFAULT ''
);