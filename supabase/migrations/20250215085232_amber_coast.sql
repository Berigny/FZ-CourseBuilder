/*
  # Fix metadata querying with JSONB operators

  1. Changes
    - Drop existing indexes
    - Create new GIN index for metadata
    - Add proper type casting for course_id
    - Add function to safely extract course_id
  
  2. Security
    - No changes to RLS policies
*/

-- First drop existing indexes
DROP INDEX IF EXISTS lessons_user_course_title_unique_idx;
DROP INDEX IF EXISTS lessons_metadata_course_id_idx;
DROP INDEX IF EXISTS lessons_metadata_gin_idx;

-- Create function to safely extract course_id
CREATE OR REPLACE FUNCTION get_course_id_from_metadata(metadata jsonb)
RETURNS text AS $$
BEGIN
  RETURN CASE 
    WHEN metadata IS NULL THEN NULL
    WHEN metadata ? 'course_id' THEN metadata->>'course_id'
    ELSE NULL
  END;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create GIN index for efficient metadata searching
CREATE INDEX lessons_metadata_gin_idx 
ON lessons USING GIN (metadata);

-- Create index specifically for course_id lookups
CREATE INDEX lessons_metadata_course_id_idx 
ON lessons(get_course_id_from_metadata(metadata));

-- Create unique constraint for user's lessons within a course
CREATE UNIQUE INDEX lessons_user_course_title_unique_idx 
ON lessons(
  user_id, 
  get_course_id_from_metadata(metadata), 
  title
) 
WHERE metadata ? 'course_id';