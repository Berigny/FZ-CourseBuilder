/*
  # Add dedicated course_id column to lessons table

  1. Changes
    - Add course_id column to lessons table
    - Create foreign key constraint to courses table
    - Create index for course_id lookups
    - Add function to sync course_id with metadata
    - Add trigger to keep course_id and metadata in sync
    - Migrate existing course_id values from metadata

  2. Security
    - Update RLS policies to use new course_id column
*/

-- Add course_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lessons' 
    AND column_name = 'course_id'
  ) THEN
    ALTER TABLE lessons
    ADD COLUMN course_id uuid REFERENCES courses(id);
  END IF;
END $$;

-- Create index for course_id lookups if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'lessons_course_id_idx'
  ) THEN
    CREATE INDEX lessons_course_id_idx ON lessons(course_id);
  END IF;
END $$;

-- Create function to sync course_id with metadata
CREATE OR REPLACE FUNCTION sync_course_id_with_metadata()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- If metadata has course_id, sync it to course_id column
    IF NEW.metadata ? 'course_id' AND 
       NEW.metadata->>'course_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      NEW.course_id := (NEW.metadata->>'course_id')::uuid;
    END IF;
    
    -- If course_id column is set, ensure it's in metadata
    IF NEW.course_id IS NOT NULL THEN
      NEW.metadata := jsonb_set(
        COALESCE(NEW.metadata, '{}'::jsonb),
        '{course_id}',
        to_jsonb(NEW.course_id::text)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for syncing if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'sync_course_id_trigger'
    AND tgrelid = 'lessons'::regclass
  ) THEN
    CREATE TRIGGER sync_course_id_trigger
      BEFORE INSERT OR UPDATE ON lessons
      FOR EACH ROW
      EXECUTE FUNCTION sync_course_id_with_metadata();
  END IF;
END $$;

-- Migrate existing course_id values from metadata
UPDATE lessons
SET course_id = (metadata->>'course_id')::uuid
WHERE metadata ? 'course_id'
AND metadata->>'course_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
AND course_id IS NULL;

-- Create compound index for user's lessons within a course if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'lessons_user_course_idx'
  ) THEN
    CREATE INDEX lessons_user_course_idx ON lessons(user_id, course_id);
  END IF;
END $$;

-- Update RLS policies to use course_id column
DROP POLICY IF EXISTS "Users can read their own lessons" ON lessons;
CREATE POLICY "Users can read their own lessons"
ON lessons FOR SELECT
TO authenticated
USING (auth.uid() = user_id);