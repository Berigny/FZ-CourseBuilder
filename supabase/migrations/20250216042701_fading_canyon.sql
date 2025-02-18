/*
  # Add dedicated course_id column to lessons table

  1. Changes
    - Add course_id column to lessons table
    - Create index for efficient querying
    - Update RLS policies
    - Migrate existing course_id values from metadata

  2. Security
    - Maintain RLS policies
    - Add foreign key constraint
*/

-- Add course_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lessons' 
    AND column_name = 'course_id'
  ) THEN
    ALTER TABLE lessons
    ADD COLUMN course_id uuid REFERENCES courses(id);

    -- Create index for course_id lookups
    CREATE INDEX lessons_course_id_idx ON lessons(course_id);

    -- Create compound index for user's lessons within a course
    CREATE INDEX lessons_user_course_idx ON lessons(user_id, course_id);

    -- Migrate existing course_id values from metadata
    UPDATE lessons
    SET course_id = (metadata->>'course_id')::uuid
    WHERE metadata ? 'course_id'
    AND metadata->>'course_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    -- Remove course_id from metadata after migration
    UPDATE lessons
    SET metadata = metadata - 'course_id'
    WHERE metadata ? 'course_id';
  END IF;
END $$;

-- Update RLS policies to use course_id column
DROP POLICY IF EXISTS "Users can read their own lessons" ON lessons;
CREATE POLICY "Users can read their own lessons"
ON lessons FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Add policy for course-based access
CREATE POLICY "Users can access lessons in their courses"
ON lessons FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = lessons.course_id
    AND courses.user_id = auth.uid()
  )
);