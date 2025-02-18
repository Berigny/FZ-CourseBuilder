/*
  # Fix metadata querying with proper type casting

  1. Changes
    - Drop existing indexes and function
    - Create new GIN index for metadata
    - Create new function for safe course_id extraction with proper error handling
    - Create new indexes with proper type casting
  
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
ON lessons USING GIN (metadata jsonb_path_ops);

-- Create function to safely extract course_id with better error handling
CREATE OR REPLACE FUNCTION get_lesson_course_id(metadata jsonb)
RETURNS text AS $$
BEGIN
  IF metadata IS NULL OR metadata->>'course_id' IS NULL THEN
    RETURN NULL;
  END IF;
  -- Return course_id as text to avoid UUID validation issues
  RETURN metadata->>'course_id';
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create new indexes with proper type casting
CREATE INDEX lessons_course_id_idx 
ON lessons((get_lesson_course_id(metadata)));

-- Create unique index for preventing duplicates with proper NULL handling
CREATE UNIQUE INDEX lessons_user_course_title_idx 
ON lessons(user_id, (get_lesson_course_id(metadata)), title) 
WHERE get_lesson_course_id(metadata) IS NOT NULL;