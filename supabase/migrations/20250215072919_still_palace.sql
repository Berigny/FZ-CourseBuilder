/*
  # Create storage bucket for documents

  1. New Storage
    - Create 'documents' bucket for storing uploaded files
  2. Security
    - Enable public access for reading documents
    - Allow authenticated users to upload documents
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true);

-- Create policy to allow public access to read files
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');

-- Create policy to allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Create policy to allow authenticated users to update their files
CREATE POLICY "Authenticated users can update files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');

-- Create policy to allow authenticated users to delete their files
CREATE POLICY "Authenticated users can delete files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');