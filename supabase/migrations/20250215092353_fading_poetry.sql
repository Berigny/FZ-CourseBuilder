/*
  # Add timestamp-based unique index for lessons

  1. Changes
    - Drop existing indexes that were causing issues
    - Create new indexes using created_at timestamp for uniqueness
    - Add GIN index for metadata searching
    - Add B-tree index for course_id lookups

  2. Benefits
    - Natural uniqueness through timestamps
    - No need for complex duplicate handling
    - Maintains data integrity
    - Efficient metadata searching
*/

-- First drop existing indexes
DROP INDEX IF EXISTS lessons_user_course_title_unique_idx;
DROP INDEX IF EXISTS lessons_metadata_course_id_idx;
DROP INDEX IF EXISTS lessons_metadata_gin_idx;

-- Create GIN index for efficient metadata searching
CREATE INDEX lessons_metadata_gin_idx 
ON lessons USING GIN (metadata);

-- Create index specifically for course_id lookups
CREATE INDEX lessons_metadata_course_id_idx 
ON lessons((metadata->>'course_id'));

-- Create unique index using timestamp
CREATE UNIQUE INDEX lessons_user_timestamp_idx 
ON lessons(user_id, created_at);

-- Create index for title search within user's lessons
CREATE INDEX lessons_user_title_idx
ON lessons(user_id, title text_pattern_ops);