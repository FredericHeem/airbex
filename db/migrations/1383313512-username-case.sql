DROP INDEX user_username_unique;

CREATE UNIQUE INDEX user_username_unique
  ON "user"(LOWER(username))
  WHERE username IS NOT NULL;
