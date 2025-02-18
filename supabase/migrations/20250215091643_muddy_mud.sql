/*
  # Handle duplicate lessons and create unique constraints

  1. Changes
    - Drop existing indexes for clean slate
    - Create temporary function to identify duplicates
    - Update duplicate titles with unique suffixes
    - Create optimized indexes for metadata and course_id
    - Create unique constraint for lessons
  
  2. Security
    - Maintain existing RLS policies
    - No changes to access control
*/

-- First drop existing indexes
DROP INDEX IF EXISTS lessons_user_course_title_unique_idx;
DROP INDEX IF EXISTS lessons_metadata_course_id_idx;
DROP INDEX IF EXISTS lessons_metadata_gin_idx;

-- Create temporary function to handle duplicates
CREATE OR REPLACE FUNCTION temp_handle_duplicate_lessons()
RETURNS void AS $$
DECLARE
  duplicate RECORD;
  counter INTEGER;
  new_title TEXT;
BEGIN
  -- Find and update duplicates
  FOR duplicate IN (
    SELECT 
      user_id,
      metadata->>'course_id' as course_id,
      title,
      array_agg(id ORDER BY created_at) as lesson_ids
    FROM lessons
    GROUP BY user_id, metadata->>'course_id', title
    HAVING COUNT(*) > 1
  ) LOOP
    counter := 1;
    -- Update all but the first (oldest) lesson
    FOR i IN 2..array_length(duplicate.lesson_ids, 1) LOOP
      new_title := duplicate.title || ' (' || counter || ')';
      -- Update the title
      UPDATE lessons 
      SET title = new_title
      WHERE id = duplicate.lesson_ids[i];
      counter := counter + 1;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the duplicate handling function
SELECT temp_handle_duplicate_lessons();

-- Drop the temporary function
DROP FUNCTION temp_handle_duplicate_lessons();

-- Create optimized indexes
CREATE INDEX lessons_metadata_gin_idx 
ON lessons USING GIN (metadata);

CREATE INDEX lessons_metadata_course_id_idx 
ON lessons((metadata->>'course_id'));

-- Create unique constraint for lessons
CREATE UNIQUE INDEX lessons_user_course_title_unique_idx 
ON lessons(
  user_id, 
  COALESCE(metadata->>'course_id', ''), 
  title
);