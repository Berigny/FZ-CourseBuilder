/*
  # Update RLS policies for lessons table

  1. Security Changes
    - Drop existing policies
    - Create new policies with proper user authentication checks
    - Add user_id column to track ownership
*/

-- Add user_id column to lessons table
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read all lessons" ON lessons;
DROP POLICY IF EXISTS "Users can insert lessons" ON lessons;
DROP POLICY IF EXISTS "Users can update their lessons" ON lessons;

-- Create new policies with proper authentication checks
CREATE POLICY "Users can read their own lessons"
ON lessons FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lessons"
ON lessons FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lessons"
ON lessons FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Update the lessons table to automatically set user_id on insert
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_user_id_trigger ON lessons;

CREATE TRIGGER set_user_id_trigger
  BEFORE INSERT ON lessons
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();