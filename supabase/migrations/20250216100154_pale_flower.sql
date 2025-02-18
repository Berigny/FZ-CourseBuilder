/*
  # Fix Lesson ID Generation

  1. Changes
    - Add UUID generation function
    - Update lessons table to use UUID for id column
    - Add trigger to auto-generate UUIDs
  
  2. Security
    - Maintain RLS policies
    - Ensure data integrity
*/

-- Create UUID generation function if it doesn't exist
CREATE OR REPLACE FUNCTION generate_lesson_uuid()
RETURNS uuid AS $$
BEGIN
  RETURN gen_random_uuid();
END;
$$ LANGUAGE plpgsql;

-- Modify lessons table to ensure UUID compliance
ALTER TABLE lessons
ALTER COLUMN id SET DEFAULT generate_lesson_uuid();

-- Create trigger to ensure UUID format
CREATE OR REPLACE FUNCTION validate_lesson_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := generate_lesson_uuid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'ensure_lesson_uuid_trigger'
  ) THEN
    CREATE TRIGGER ensure_lesson_uuid_trigger
      BEFORE INSERT ON lessons
      FOR EACH ROW
      EXECUTE FUNCTION validate_lesson_id();
  END IF;
END $$;