/*
  # Update storage policies

  1. Changes
    - Add policy for authenticated users to read their own files
    - Ensure proper path-based access control
    - Maintain existing public read access for shared resources

  2. Security
    - Restrict file access to file owners
    - Maintain public read access where needed
    - Enforce path-based ownership validation
*/

-- Update the public read policy to be more restrictive
DROP POLICY IF EXISTS "Allow public read for documents" ON storage.objects;

CREATE POLICY "Allow public read for documents"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Add policy for authenticated users to read their own files
CREATE POLICY "Allow users to read their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);