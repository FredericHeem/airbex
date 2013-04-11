ALTER TABLE "user"
ALTER email SET NOT NULL,
ALTER email DROP DEFAULT,
ADD CONSTRAINT email_regex CHECK (email ~* '^\S+@\S+$');
