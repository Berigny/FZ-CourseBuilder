/*
  # Improve lessons table indexes and metadata handling

  1. Changes
    - Drop existing problematic indexes
    - Create new GIN index for metadata with proper operator class
    - Add index for course_id lookups with proper type handling
    - Create compound index for user's lessons with timestamp
    - Add text pattern search index for titles

  2. Benefits
    - Better performance for metadata queries
    - Reliable uniqueness through timestamps
    - Improved title search capabilities
    - No more duplicate key violations
*/

-- First drop existing indexes
DROP INDEX IF EXISTS lessons_user_course_title_unique_idx;
DROP INDEX IF EXISTS lessons_metadata_course_id_idx;
DROP INDEX IF EXISTS lessons_metadata_gin_idx;
DROP INDEX IF EXISTS lessons_user_timestamp_idx;
DROP INDEX IF EXISTS lessons_user_title_idx;

-- Create GIN index for efficient metadata searching with proper operator class
CREATE INDEX lessons_metadata_gin_idx 
ON lessons USING GIN (metadata jsonb_path_ops);

-- Create index for course_id lookups with proper type handling
CREATE INDEX lessons_metadata_course_id_idx 
ON lessons((metadata->>'course_id'));

-- Create compound index for user's lessons with timestamp
CREATE UNIQUE INDEX lessons_user_timestamp_idx 
ON lessons(user_id, created_at);

-- Create index for title search within user's lessons
CREATE INDEX lessons_user_title_idx
ON lessons(user_id, title text_pattern_ops);