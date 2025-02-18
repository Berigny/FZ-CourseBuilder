-- Create a new migration to fix JSONB querying
CREATE OR REPLACE FUNCTION get_course_id_safe(metadata jsonb) RETURNS uuid AS $$
BEGIN
  IF metadata IS NULL OR NOT metadata ? 'course_id' THEN
    RETURN NULL;
  END IF;

  -- Validate UUID format
  IF metadata->>'course_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN (metadata->>'course_id')::uuid;
  END IF;

  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create index using the safe function
DROP INDEX IF EXISTS lessons_metadata_course_id_idx;
CREATE INDEX lessons_metadata_course_id_idx 
ON lessons(get_course_id_safe(metadata))
WHERE metadata ? 'course_id';

-- Create function to validate course ID in metadata
CREATE OR REPLACE FUNCTION validate_course_id_in_metadata()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.metadata ? 'course_id' THEN
    IF NOT (NEW.metadata->>'course_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN
      RAISE EXCEPTION 'Invalid course_id format in metadata. Must be a valid UUID.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for course ID validation
DROP TRIGGER IF EXISTS validate_course_id_trigger ON lessons;
CREATE TRIGGER validate_course_id_trigger
  BEFORE INSERT OR UPDATE ON lessons
  FOR EACH ROW
  EXECUTE FUNCTION validate_course_id_in_metadata();