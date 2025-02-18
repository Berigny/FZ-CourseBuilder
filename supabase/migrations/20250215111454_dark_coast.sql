-- Drop existing objects if they exist
DROP TRIGGER IF EXISTS validate_lesson_metadata_trigger ON lessons;
DROP FUNCTION IF EXISTS validate_lesson_metadata();
DROP INDEX IF EXISTS lessons_metadata_gin_idx;
DROP INDEX IF EXISTS lessons_metadata_course_id_idx;
DROP INDEX IF EXISTS lessons_user_course_status_idx;
DROP INDEX IF EXISTS lessons_user_metadata_idx;

-- Create improved JSONB path operator index
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'lessons_metadata_gin_idx'
  ) THEN
    CREATE INDEX lessons_metadata_gin_idx 
    ON lessons USING GIN ((metadata -> 'course_id'));
  END IF;
END $$;

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
      -- Remove invalid course_id
      NEW.metadata := NEW.metadata - 'course_id';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for metadata validation
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'validate_lesson_metadata_trigger'
    AND tgrelid = 'lessons'::regclass
  ) THEN
    CREATE TRIGGER validate_lesson_metadata_trigger
      BEFORE INSERT OR UPDATE ON lessons
      FOR EACH ROW
      EXECUTE FUNCTION validate_lesson_metadata();
  END IF;
END $$;

-- Clean up any existing invalid course_ids
UPDATE lessons
SET metadata = metadata - 'course_id'
WHERE metadata ? 'course_id' 
AND NOT (metadata->>'course_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- Create index for efficient filtering using proper JSONB path operators
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'lessons_user_metadata_idx'
  ) THEN
    CREATE INDEX lessons_user_metadata_idx
    ON lessons(user_id, ((metadata -> 'course_id')::text))
    WHERE metadata ? 'course_id';
  END IF;
END $$;

-- Update RLS policies to use proper JSONB operators
DROP POLICY IF EXISTS "Users can read their own lessons" ON lessons;
CREATE POLICY "Users can read their own lessons"
ON lessons FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  AND (
    NOT (metadata ? 'course_id')
    OR (metadata->>'course_id')::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  )
);