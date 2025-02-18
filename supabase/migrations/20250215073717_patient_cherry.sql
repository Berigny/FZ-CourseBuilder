/*
  # Storage bucket and error handling improvements

  1. Changes
    - Add safe bucket creation with existence check
    - Ensure bucket is created before policies
    - Add proper error handling for bucket operations

  2. Security
    - Maintain existing security policies
    - Ensure proper bucket configuration
*/

-- Safely create the documents bucket if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'documents'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('documents', 'documents', true);
  END IF;
END $$;