/*
  # Fix duplicate lessons and add unique constraints

  1. Changes
    - Handle existing duplicate lessons by adding numbered suffixes
    - Create optimized indexes for metadata and course_id lookups
    - Add unique constraint to prevent future duplicates
    
  2. Security
    - No changes to security policies
    
  3. Notes
    - Existing duplicates will be renamed with "(1)", "(2)", etc. suffixes
    - Future attempts to create duplicates will fail with unique constraint error
*/

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
    -- Skip the first (oldest) lesson and update the rest
    FOR i IN 2..array_length(duplicate.lesson_ids, 1) LOOP
      -- Keep trying new titles until we find a unique one
      LOOP
        new_title := duplicate.title || ' (' || counter || ')';
        EXIT WHEN NOT EXISTS (
          SELECT 1 FROM lessons 
          WHERE user_id = duplicate.user_id 
          AND metadata->>'course_id' IS NOT DISTINCT FROM duplicate.course_id
          AND title = new_title
        );
        counter := counter + 1;
      END LOOP;
      
      -- Update the title
      UPDATE lessons 
      SET title = new_title
      WHERE id = duplicate.lesson_ids[i];
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the duplicate handling function
SELECT temp_handle_duplicate_lessons();

-- Drop the temporary function
DROP FUNCTION temp_handle_duplicate_lessons();

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS lessons_metadata_gin_idx 
ON lessons USING GIN (metadata);

CREATE INDEX IF NOT EXISTS lessons_metadata_course_id_idx 
ON lessons((metadata->>'course_id'));

-- Create unique constraint for lessons
CREATE UNIQUE INDEX IF NOT EXISTS lessons_user_course_title_unique_idx 
ON lessons(
  user_id, 
  COALESCE(metadata->>'course_id', ''), 
  title
);