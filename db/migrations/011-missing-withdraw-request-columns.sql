ALTER TABLE withdraw_request
ADD COLUMN error text,
ADD COLUMN state varchar(50) DEFAULT 'requested';

