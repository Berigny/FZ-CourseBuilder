-- Drop existing functions and indexes
DROP FUNCTION IF EXISTS get_course_id_safe(jsonb);
DROP FUNCTION IF EXISTS validate_course_id_in_metadata();
DROP TRIGGER IF EXISTS validate_course_id_trigger ON lessons;
DROP INDEX IF EXISTS lessons_metadata_course_id_idx;
DROP INDEX IF EXISTS lessons_metadata_gin_idx;

-- Create improved JSONB path operator index
CREATE INDEX lessons_metadata_gin_idx 
ON lessons USING GIN (metadata jsonb_path_ops);

-- Create function to safely extract and validate course_id
CREATE OR REPLACE FUNCTION get_course_id_safe(metadata jsonb) RETURNS uuid AS $$
DECLARE
  course_id text;
BEGIN
  -- Extract course_id from metadata
  course_id := metadata->>'course_id';
  
  -- Return null if no course_id or invalid format
  IF course_id IS NULL OR 
     NOT (course_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN
    RETURN NULL;
  END IF;
  
  -- Return as UUID if valid
  RETURN course_id::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create index for course_id lookups
CREATE INDEX lessons_metadata_course_id_idx 
ON lessons((metadata->>'course_id'))
WHERE metadata ? 'course_id';

-- Create function to validate metadata
CREATE OR REPLACE FUNCTION validate_lesson_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Initialize metadata if null
  IF NEW.metadata IS NULL THEN
    NEW.metadata := '{}'::jsonb;
  END IF;

  -- Validate course_id if present
  IF NEW.metadata ? 'course_id' THEN
    IF NOT (NEW.metadata->>'course_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN
      -- Instead of raising an exception, remove invalid course_id
      NEW.metadata := NEW.metadata - 'course_id';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for metadata validation
CREATE TRIGGER validate_lesson_metadata_trigger
  BEFORE INSERT OR UPDATE ON lessons
  FOR EACH ROW
  EXECUTE FUNCTION validate_lesson_metadata();

-- Clean up any existing invalid course_ids
UPDATE lessons
SET metadata = metadata - 'course_id'
WHERE metadata ? 'course_id' 
AND NOT (metadata->>'course_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- Create index for efficient filtering
CREATE INDEX lessons_user_course_status_idx
ON lessons(user_id, (metadata->>'course_id'), status)
WHERE metadata ? 'course_id';