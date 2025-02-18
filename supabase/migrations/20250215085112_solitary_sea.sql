/*
  # Fix metadata querying with JSONB operators

  1. Changes
    - Drop existing indexes
    - Create new indexes using JSONB containment operators
    - Add proper type casting for course_id
  
  2. Security
    - No changes to RLS policies
*/

-- First drop existing indexes
DROP INDEX IF EXISTS lessons_user_course_title_unique_idx;
DROP INDEX IF EXISTS lessons_metadata_course_id_idx;
DROP INDEX IF EXISTS lessons_metadata_gin_idx;

-- Create index for efficient metadata searching
CREATE INDEX lessons_metadata_gin_idx 
ON lessons USING GIN (metadata);

-- Create index specifically for course_id lookups
CREATE INDEX lessons_metadata_course_id_idx 
ON lessons((metadata->>'course_id'));

-- Create unique constraint for user's lessons within a course
-- Using proper JSONB operators and explicit type handling
CREATE UNIQUE INDEX lessons_user_course_title_unique_idx 
ON lessons(
  user_id, 
  ((metadata->>'course_id')::text), 
  title
) 
WHERE metadata->>'course_id' IS NOT NULL;