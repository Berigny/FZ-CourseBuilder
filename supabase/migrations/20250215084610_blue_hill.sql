/*
  # Fix index dependencies and function update

  1. Changes
    - Drop indexes that depend on the function first
    - Drop and recreate function with correct return type
    - Recreate indexes with proper dependencies
    - Add GIN index for metadata queries

  2. Improvements
    - Proper dependency handling
    - Better performance for JSON queries
    - Improved type safety
*/

-- First drop the dependent indexes
DROP INDEX IF EXISTS lessons_user_course_title_idx;
DROP INDEX IF EXISTS lessons_course_id_idx;
DROP INDEX IF EXISTS lessons_metadata_gin_idx;

-- Now we can safely drop the function
DROP FUNCTION IF EXISTS get_lesson_course_id(jsonb);

-- Create GIN index for metadata
CREATE INDEX lessons_metadata_gin_idx 
ON lessons USING GIN (metadata);

-- Recreate function with text return type
CREATE OR REPLACE FUNCTION get_lesson_course_id(metadata jsonb)
RETURNS text AS $$
BEGIN
  RETURN metadata->>'course_id';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create new indexes that depend on the function
CREATE INDEX lessons_course_id_idx 
ON lessons((get_lesson_course_id(metadata)));

CREATE UNIQUE INDEX lessons_user_course_title_idx 
ON lessons(user_id, (get_lesson_course_id(metadata)), title) 
WHERE get_lesson_course_id(metadata) IS NOT NULL;