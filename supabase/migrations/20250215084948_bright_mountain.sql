/*
  # Fix metadata querying with proper JSON path operators

  1. Changes
    - Drop existing indexes and function
    - Create new GIN index for metadata with proper operator class
    - Create new function for safe course_id extraction with proper error handling
    - Create new indexes with proper JSON path operators
  
  2. Security
    - No changes to RLS policies
*/

-- First drop the dependent indexes
DROP INDEX IF EXISTS lessons_user_course_title_idx;
DROP INDEX IF EXISTS lessons_course_id_idx;
DROP INDEX IF EXISTS lessons_metadata_gin_idx;

-- Now we can safely drop the function
DROP FUNCTION IF EXISTS get_lesson_course_id(jsonb);

-- Create GIN index for metadata with proper operator class
CREATE INDEX lessons_metadata_gin_idx 
ON lessons USING GIN ((metadata -> 'course_id'));

-- Create function to safely extract course_id with better error handling
CREATE OR REPLACE FUNCTION get_lesson_course_id(metadata jsonb)
RETURNS text AS $$
BEGIN
  IF metadata IS NULL THEN
    RETURN NULL;
  END IF;
  -- Use proper JSON path operator and handle NULL values
  RETURN CASE 
    WHEN jsonb_typeof(metadata -> 'course_id') = 'string' 
    THEN metadata ->> 'course_id'
    ELSE NULL
  END;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create new indexes with proper JSON path operators
CREATE INDEX lessons_course_id_idx 
ON lessons((metadata ->> 'course_id'));

-- Create unique index for preventing duplicates with proper NULL handling
CREATE UNIQUE INDEX lessons_user_course_title_idx 
ON lessons(user_id, (metadata ->> 'course_id'), title) 
WHERE metadata ->> 'course_id' IS NOT NULL;