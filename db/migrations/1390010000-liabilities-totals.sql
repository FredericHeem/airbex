ALTER TABLE liability
  ADD column balance bigint NOT NULL default 0,
  ADD column users int NOT NULL default 0;