/*
  # Add Topics Hierarchy

  1. New Tables
    - `lessons_topics` (junction table)
      - `lesson_id` (uuid, references lessons)
      - `topic_id` (uuid, references topics)
      - `created_at` (timestamp)

  2. Changes
    - Add course_title and course_description to lessons metadata
    - Add topic_ids array to lessons metadata
    - Update existing lessons to maintain data consistency

  3. Security
    - Enable RLS on lessons_topics table
    - Add policies for authenticated users
*/

-- Create lessons_topics junction table
CREATE TABLE IF NOT EXISTS lessons_topics (
  lesson_id uuid REFERENCES lessons(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES topics(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (lesson_id, topic_id)
);

-- Enable RLS
ALTER TABLE lessons_topics ENABLE ROW LEVEL SECURITY;

-- Create policies for lessons_topics
CREATE POLICY "Users can read their own lesson topics"
  ON lessons_topics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = lesson_id
      AND lessons.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own lesson topics"
  ON lessons_topics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = lesson_id
      AND lessons.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own lesson topics"
  ON lessons_topics
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = lesson_id
      AND lessons.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX lessons_topics_lesson_id_idx ON lessons_topics(lesson_id);
CREATE INDEX lessons_topics_topic_id_idx ON lessons_topics(topic_id);

-- Update existing lessons to include course information in metadata
UPDATE lessons
SET metadata = jsonb_set(
  metadata,
  '{course_title}',
  COALESCE(
    (
      SELECT to_jsonb(title)
      FROM courses
      WHERE courses.id = (metadata->>'course_id')::uuid
    ),
    '"Untitled Course"'::jsonb
  )
)
WHERE metadata->>'course_id' IS NOT NULL
AND metadata->>'course_title' IS NULL;

UPDATE lessons
SET metadata = jsonb_set(
  metadata,
  '{course_description}',
  COALESCE(
    (
      SELECT to_jsonb(description)
      FROM courses
      WHERE courses.id = (metadata->>'course_id')::uuid
    ),
    'null'::jsonb
  )
)
WHERE metadata->>'course_id' IS NOT NULL
AND metadata->>'course_description' IS NULL;