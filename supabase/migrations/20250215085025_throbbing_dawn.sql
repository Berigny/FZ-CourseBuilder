/*
  # Fix metadata querying with simplified approach

  1. Changes
    - Drop existing indexes and function
    - Create simplified indexes using direct JSON operators
    - Remove function-based approach entirely
  
  2. Security
    - No changes to RLS policies
*/

-- First drop existing indexes
DROP INDEX IF EXISTS lessons_user_course_title_idx;
DROP INDEX IF EXISTS lessons_course_id_idx;
DROP INDEX IF EXISTS lessons_metadata_gin_idx;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS get_lesson_course_id(jsonb);

-- Create direct index on course_id in metadata
CREATE INDEX lessons_metadata_course_id_idx 
ON lessons((metadata ->> 'course_id'));

-- Create index for efficient metadata searching
CREATE INDEX lessons_metadata_gin_idx 
ON lessons USING GIN (metadata);

-- Create unique constraint for user's lessons within a course
CREATE UNIQUE INDEX lessons_user_course_title_unique_idx 
ON lessons(user_id, (metadata ->> 'course_id'), title) 
WHERE metadata ? 'course_id';