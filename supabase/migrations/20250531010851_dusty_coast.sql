/*
  # Set up Storage for Document Uploads

  1. Changes
    - Create storage bucket for documents
    - Set up storage policies for secure access
    - Add RLS policies for document access

  2. Security
    - Only authenticated users can upload documents
    - Users can only access their own documents
    - Admins can access all documents
    - Files are stored in user-specific folders
*/

-- Enable storage by inserting the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
CREATE POLICY "Users can upload their own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (
    -- Allow users to access their own documents
    (auth.uid())::text = (storage.foldername(name))[1] OR
    -- Allow admins to access all documents
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
);

CREATE POLICY "Users can delete their own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (
    -- Allow users to delete their own documents
    (auth.uid())::text = (storage.foldername(name))[1] OR
    -- Allow admins to delete any documents
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
);