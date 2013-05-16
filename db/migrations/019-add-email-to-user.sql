ALTER TABLE "user"
ADD COLUMN email varchar(50) DEFAULT('user' || FLOOR(RANDOM() * 1e4) || '@gmail.com'),
ADD COLUMN email_lower varchar(50);

UPDATE "user" SET email_lower = email;

ALTER TABLE "user"
ALTER COLUMN email_lower SET NOT NULL;
 