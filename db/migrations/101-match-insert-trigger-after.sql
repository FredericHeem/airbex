-- Fix match_insert trigger to run after insert
DROP TRIGGER match_insert ON match;

CREATE TRIGGER match_insert
  AFTER INSERT
  ON match
  FOR EACH ROW
  EXECUTE PROCEDURE match_insert();
