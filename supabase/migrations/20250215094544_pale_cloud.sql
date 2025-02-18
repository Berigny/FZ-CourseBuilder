/*
  # Add Content Validation and Status Update

  1. Changes
    - Add content_length field to metadata
    - Add estimated_duration field to metadata
    - Update status check constraint to allow 'incomplete' status
    - Add function to calculate estimated reading time
*/

-- First modify the status check constraint to allow 'incomplete'
ALTER TABLE lessons 
DROP CONSTRAINT IF EXISTS lessons_status_check;

ALTER TABLE lessons 
ADD CONSTRAINT lessons_status_check 
CHECK (status IN ('processing', 'complete', 'failed', 'needs_refinement', 'incomplete'));

-- Create function to estimate reading time in minutes
CREATE OR REPLACE FUNCTION calculate_reading_time(content text)
RETURNS float AS $$
DECLARE
  words_per_minute constant float := 200.0; -- Average reading speed
  word_count float;
BEGIN
  -- Count words by splitting on whitespace
  word_count := array_length(regexp_split_to_array(content, '\s+'), 1);
  RETURN GREATEST(COALESCE(word_count / words_per_minute, 0), 0); -- Ensure non-negative
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update lessons to include content metrics in metadata
DO $$ 
DECLARE
  lesson_record RECORD;
BEGIN
  -- Update each lesson individually to avoid transaction issues
  FOR lesson_record IN 
    SELECT id, content, metadata, status 
    FROM lessons 
    WHERE content IS NOT NULL
  LOOP
    -- Calculate metrics
    UPDATE lessons 
    SET 
      metadata = jsonb_set(
        jsonb_set(
          COALESCE(lesson_record.metadata, '{}'::jsonb),
          '{content_length}',
          to_jsonb(length(lesson_record.content))
        ),
        '{estimated_duration}',
        to_jsonb(calculate_reading_time(lesson_record.content))
      ),
      status = CASE 
        WHEN calculate_reading_time(lesson_record.content) < 1.0 
          OR length(lesson_record.content) < 200 
        THEN 'incomplete'
        ELSE lesson_record.status
      END
    WHERE id = lesson_record.id;
  END LOOP;
END $$;