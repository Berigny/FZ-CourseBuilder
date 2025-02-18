/*
  # Add Topics Taxonomy Tables and Policies

  1. New Tables
    - `topic_categories` - Main categories for topics
    - `topic_templates` - Predefined topic templates
  
  2. Changes
    - Add category_id to topics table
    - Add template_id to topics table
    - Add RLS policies if they don't exist
*/

-- Create topic categories table
CREATE TABLE IF NOT EXISTS topic_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create topic templates table
CREATE TABLE IF NOT EXISTS topic_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES topic_categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  learning_objectives jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add category reference to topics table
ALTER TABLE topics
ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES topic_categories(id);

-- Add template reference to topics table
ALTER TABLE topics
ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES topic_templates(id);

-- Enable RLS
ALTER TABLE topic_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for topic categories if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'topic_categories' 
    AND policyname = 'Everyone can read topic categories'
  ) THEN
    CREATE POLICY "Everyone can read topic categories"
      ON topic_categories FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Create policies for topic templates if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'topic_templates' 
    AND policyname = 'Everyone can read topic templates'
  ) THEN
    CREATE POLICY "Everyone can read topic templates"
      ON topic_templates FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS topic_templates_category_id_idx ON topic_templates(category_id);
CREATE INDEX IF NOT EXISTS topics_category_id_idx ON topics(category_id);
CREATE INDEX IF NOT EXISTS topics_template_id_idx ON topics(template_id);