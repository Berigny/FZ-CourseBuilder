/*
  # Fix JSONB querying and metadata handling

  1. Changes
    - Add proper JSONB indexing for course_id field
    - Add function to safely extract course_id
    - Update existing metadata to ensure proper UUID format
    - Add constraints to ensure valid course_id format

  2. Indexes
    - GIN index for full metadata search
    - B-tree index for course_id lookups
    - Compound index for user-course combinations

  3. Data Cleanup
    - Fix any malformed course_id values
    - Ensure all course_id values are valid UUIDs
*/

-- Drop existing indexes that might conflict
DROP INDEX IF EXISTS lessons_metadata_gin_idx;
DROP INDEX IF EXISTS lessons_metadata_course_id_idx;

-- Create function to validate UUID
CREATE OR REPLACE FUNCTION is_valid_uuid(text) RETURNS boolean AS $$
BEGIN
  RETURN $1 ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to safely extract course_id
CREATE OR REPLACE FUNCTION get_course_id(metadata jsonb) RETURNS uuid AS $$
BEGIN
  IF metadata IS NULL OR metadata->>'course_id' IS NULL THEN
    RETURN NULL;
  END IF;
  
  IF is_valid_uuid(metadata->>'course_id') THEN
    RETURN (metadata->>'course_id')::uuid;
  END IF;
  
  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create optimized indexes
CREATE INDEX lessons_metadata_gin_idx 
ON lessons USING GIN (metadata);

CREATE INDEX lessons_metadata_course_id_idx 
ON lessons(get_course_id(metadata));

-- Create trigger to validate course_id format
CREATE OR REPLACE FUNCTION validate_course_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.metadata ? 'course_id' AND NOT is_valid_uuid(NEW.metadata->>'course_id') THEN
    RAISE EXCEPTION 'Invalid course_id format. Must be a valid UUID.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_course_id_trigger ON lessons;
CREATE TRIGGER validate_course_id_trigger
  BEFORE INSERT OR UPDATE ON lessons
  FOR EACH ROW
  EXECUTE FUNCTION validate_course_id();

-- Clean up any invalid course_id values
UPDATE lessons
SET metadata = metadata - 'course_id'
WHERE metadata ? 'course_id' 
AND NOT is_valid_uuid(metadata->>'course_id');

-- Create index for efficient user-course queries
CREATE INDEX lessons_user_course_idx
ON lessons(user_id, (get_course_id(metadata)))
WHERE metadata ? 'course_id';