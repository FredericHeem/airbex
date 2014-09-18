-- notify_activity_insert
CREATE OR REPLACE FUNCTION notify_activity_insert() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('activity_watcher', NEW.details);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER notify_activity_trigger AFTER INSERT ON activity
FOR EACH ROW EXECUTE PROCEDURE notify_activity_insert();

-- user_pending
CREATE OR REPLACE FUNCTION notify_user_pending_insert() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('user_pending_watcher', '');
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER notify_user_pending_trigger AFTER INSERT ON user_pending
FOR EACH ROW EXECUTE PROCEDURE notify_user_pending_insert();