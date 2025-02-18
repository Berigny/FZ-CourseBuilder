/*
  # Add user_id to courses table

  1. Changes
    - Add user_id column to courses table
    - Make user_id NOT NULL
    - Add index on user_id
    - Add compound index for user-specific sorting
    - Update RLS policies to be user-specific

  2. Security
    - Users can only access their own courses
    - Proper authentication checks on all policies
*/

-- Add user_id column to courses table
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Make user_id NOT NULL
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' 
    AND column_name = 'user_id' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE courses 
    ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- Add index on user_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'courses' 
    AND indexname = 'courses_user_id_idx'
  ) THEN
    CREATE INDEX courses_user_id_idx ON courses(user_id);
  END IF;
END $$;

-- Add compound index for user-specific sorting
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'courses' 
    AND indexname = 'courses_user_id_created_at_idx'
  ) THEN
    CREATE INDEX courses_user_id_created_at_idx ON courses(user_id, created_at DESC);
  END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read all courses" ON courses;
DROP POLICY IF EXISTS "Users can insert courses" ON courses;
DROP POLICY IF EXISTS "Users can update their courses" ON courses;

-- Create new policies with proper authentication checks
CREATE POLICY "Users can read their own courses"
ON courses FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own courses"
ON courses FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own courses"
ON courses FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Create trigger to automatically set user_id on insert
CREATE OR REPLACE FUNCTION set_course_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_course_user_id_trigger ON courses;

CREATE TRIGGER set_course_user_id_trigger
  BEFORE INSERT ON courses
  FOR EACH ROW
  EXECUTE FUNCTION set_course_user_id();