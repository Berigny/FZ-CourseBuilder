/*
  # Add unique constraint for lessons

  1. Changes
    - Add function to extract course_id from metadata
    - Add expression index for metadata->>'course_id'
    - Add compound unique constraint for user_id and title within each course
    - This prevents duplicate lessons within the same course for a user

  2. Security
    - No changes to RLS policies
    - Maintains existing security model
*/

-- Create function to extract course_id from metadata
CREATE OR REPLACE FUNCTION get_lesson_course_id(metadata jsonb)
RETURNS text AS $$
BEGIN
  RETURN metadata->>'course_id';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create expression index for course_id extraction
CREATE INDEX IF NOT EXISTS lessons_course_id_idx 
ON lessons(get_lesson_course_id(metadata));

-- Add unique index for user_id, course_id, and title
CREATE UNIQUE INDEX IF NOT EXISTS lessons_user_course_title_idx 
ON lessons(user_id, get_lesson_course_id(metadata), title) 
WHERE get_lesson_course_id(metadata) IS NOT NULL;