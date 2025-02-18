/*
  # Fix JSONB metadata handling

  1. Changes
    - Add function to safely handle course_id extraction
    - Add function to validate course_id format
    - Create optimized indexes for metadata querying
    - Add trigger to ensure valid course_id format
    - Clean up any invalid metadata values

  2. Security
    - Maintain RLS policies
    - Add validation for UUID format
*/

-- Drop existing indexes that might conflict
DROP INDEX IF EXISTS lessons_metadata_gin_idx;
DROP INDEX IF EXISTS lessons_metadata_course_id_idx;
DROP INDEX IF EXISTS lessons_user_course_idx;

-- Create function to validate UUID format
CREATE OR REPLACE FUNCTION is_valid_uuid(text) RETURNS boolean AS $$
BEGIN
  RETURN $1 ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to safely extract and validate course_id
CREATE OR REPLACE FUNCTION get_valid_course_id(metadata jsonb) RETURNS uuid AS $$
DECLARE
  course_id text;
BEGIN
  -- Extract course_id from metadata
  course_id := metadata->>'course_id';
  
  -- Return null if no course_id
  IF course_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Validate UUID format
  IF NOT is_valid_uuid(course_id) THEN
    RETURN NULL;
  END IF;
  
  -- Return as UUID if valid
  RETURN course_id::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create optimized indexes for metadata querying
CREATE INDEX lessons_metadata_gin_idx 
ON lessons USING GIN (metadata jsonb_path_ops);

CREATE INDEX lessons_metadata_course_id_idx 
ON lessons(get_valid_course_id(metadata))
WHERE metadata ? 'course_id';

-- Create trigger to validate course_id format before insert/update
CREATE OR REPLACE FUNCTION validate_lesson_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate course_id if present
  IF NEW.metadata ? 'course_id' THEN
    IF NOT is_valid_uuid(NEW.metadata->>'course_id') THEN
      RAISE EXCEPTION 'Invalid course_id format in metadata. Must be a valid UUID.';
    END IF;
  END IF;
  
  -- Ensure metadata is a valid JSONB object
  IF NEW.metadata IS NULL THEN
    NEW.metadata := '{}'::jsonb;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS validate_lesson_metadata_trigger ON lessons;
CREATE TRIGGER validate_lesson_metadata_trigger
  BEFORE INSERT OR UPDATE ON lessons
  FOR EACH ROW
  EXECUTE FUNCTION validate_lesson_metadata();

-- Clean up any invalid metadata values
UPDATE lessons
SET metadata = metadata - 'course_id'
WHERE metadata ? 'course_id' 
AND NOT is_valid_uuid(metadata->>'course_id');

-- Create efficient index for user-course queries
CREATE INDEX lessons_user_course_idx
ON lessons(user_id, (get_valid_course_id(metadata)))
WHERE metadata ? 'course_id';

-- Create index for course title search
CREATE INDEX lessons_course_title_idx
ON lessons((metadata->>'course_title') text_pattern_ops)
WHERE metadata ? 'course_title';