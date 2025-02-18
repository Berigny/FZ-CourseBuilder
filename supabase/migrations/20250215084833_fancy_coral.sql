/*
  # Fix metadata querying

  1. Changes
    - Drop existing indexes and function
    - Create new GIN index for metadata
    - Create new function for safe course_id extraction
    - Create new indexes with proper casting
  
  2. Security
    - No changes to RLS policies
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

-- Create function to safely extract course_id
CREATE OR REPLACE FUNCTION get_lesson_course_id(metadata jsonb)
RETURNS text AS $$
BEGIN
  -- Cast the course_id to text to avoid UUID validation
  RETURN metadata->>'course_id';
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create new indexes with text-based course_id
CREATE INDEX lessons_course_id_idx 
ON lessons((get_lesson_course_id(metadata)));

-- Create unique index for preventing duplicates
CREATE UNIQUE INDEX lessons_user_course_title_idx 
ON lessons(user_id, (get_lesson_course_id(metadata)), title) 
WHERE get_lesson_course_id(metadata) IS NOT NULL;