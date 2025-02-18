/*
  # Create lessons and processing queue tables

  1. New Tables
    - `lessons`
      - `id` (uuid, primary key)
      - `title` (text)
      - `content` (text)
      - `category` (enum: core, supplementary, exploratory)
      - `status` (enum: processing, complete, failed)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `processing_queue`
      - `id` (uuid, primary key)
      - `lesson_id` (uuid, foreign key to lessons)
      - `status` (enum: pending, processing, complete, failed)
      - `step` (text)
      - `error` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text CHECK (category IN ('core', 'supplementary', 'exploratory')) DEFAULT 'core',
  status text CHECK (status IN ('processing', 'complete', 'failed')) DEFAULT 'processing',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create processing_queue table
CREATE TABLE IF NOT EXISTS processing_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid REFERENCES lessons(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending', 'processing', 'complete', 'failed')) DEFAULT 'pending',
  step text NOT NULL,
  error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_queue ENABLE ROW LEVEL SECURITY;

-- Create policies for lessons
CREATE POLICY "Users can read all lessons"
  ON lessons
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert lessons"
  ON lessons
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their lessons"
  ON lessons
  FOR UPDATE
  TO authenticated
  USING (true);

-- Create policies for processing_queue
CREATE POLICY "Users can read processing queue"
  ON processing_queue
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert into processing queue"
  ON processing_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update processing queue"
  ON processing_queue
  FOR UPDATE
  TO authenticated
  USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON lessons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_processing_queue_updated_at
  BEFORE UPDATE ON processing_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();