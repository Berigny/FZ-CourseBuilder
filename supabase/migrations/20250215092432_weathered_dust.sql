/*
  # Improve lessons table indexes and metadata handling

  1. Changes
    - Drop existing problematic indexes
    - Create new GIN index for metadata with proper operator class
    - Add index for course_id lookups with proper type handling
    - Create compound index for user's lessons with timestamp
    - Add text pattern search index for titles

  2. Benefits
    - Better performance for metadata queries
    - Reliable uniqueness through timestamps
    - Improved title search capabilities
    - No more duplicate key violations
*/

-- First drop existing indexes
DROP INDEX IF EXISTS lessons_user_course_title_unique_idx;
DROP INDEX IF EXISTS lessons_metadata_course_id_idx;
DROP INDEX IF EXISTS lessons_metadata_gin_idx;
DROP INDEX IF EXISTS lessons_user_timestamp_idx;
DROP INDEX IF EXISTS lessons_user_title_idx;

-- Create GIN index for efficient metadata searching with proper operator class
CREATE INDEX lessons_metadata_gin_idx 
ON lessons USING GIN (metadata jsonb_path_ops);

-- Create index for course_id lookups with proper type handling
CREATE INDEX lessons_metadata_course_id_idx 
ON lessons((metadata->>'course_id'));

-- Create compound index for user's lessons with timestamp
CREATE UNIQUE INDEX lessons_user_timestamp_idx 
ON lessons(user_id, created_at);

-- Create index for title search within user's lessons
CREATE INDEX lessons_user_title_idx
ON lessons(user_id, title text_pattern_ops);

-- Create function to ensure unique titles within a course
CREATE OR REPLACE FUNCTION ensure_unique_lesson_title()
RETURNS TRIGGER AS $$
DECLARE
  base_title TEXT;
  new_title TEXT;
  counter INTEGER := 1;
BEGIN
  -- If title already exists for this user and course, append a timestamp
  IF EXISTS (
    SELECT 1 FROM lessons 
    WHERE user_id = NEW.user_id 
    AND metadata->>'course_id' = NEW.metadata->>'course_id'
    AND title = NEW.title
    AND id != NEW.id
  ) THEN
    base_title := NEW.title;
    NEW.title := base_title || ' (' || to_char(NEW.created_at, 'YYYY-MM-DD HH24:MI:SS') || ')';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for unique titles
DROP TRIGGER IF EXISTS ensure_unique_lesson_title_trigger ON lessons;
CREATE TRIGGER ensure_unique_lesson_title_trigger
  BEFORE INSERT OR UPDATE ON lessons
  FOR EACH ROW
  EXECUTE FUNCTION ensure_unique_lesson_title();