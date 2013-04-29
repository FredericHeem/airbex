CREATE TABLE activity (
    activity_id SERIAL NOT NULL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES "user"(user_id),
    created TIMESTAMPTZ NOT NULL DEFAULT now(),
    "type" varchar NOT NULL,
    details VARCHAR NOT NULL
);
