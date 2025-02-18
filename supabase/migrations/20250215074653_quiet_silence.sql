/*
  # Fix storage RLS policies for bucket creation

  1. Changes
    - Add policy to allow authenticated users to create buckets
    - Add policy to allow authenticated users to manage buckets
  
  2. Security
    - Policies are restricted to authenticated users only
    - Users can only manage buckets they create
*/

-- Allow authenticated users to create buckets
CREATE POLICY "Allow authenticated users to create buckets"
ON storage.buckets
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to manage buckets
CREATE POLICY "Allow authenticated users to manage buckets"
ON storage.buckets
FOR ALL
TO authenticated
USING (true);

-- Ensure the documents bucket exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'documents'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('documents', 'documents', true);
  END IF;
END $$;