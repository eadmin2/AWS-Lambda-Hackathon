-- Enforce allowed file extensions for uploads to the documents bucket
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;

CREATE POLICY "Users can upload their own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND (
    right(lower(name), 4) = '.pdf'
    OR right(lower(name), 4) = '.png'
    OR right(lower(name), 4) = '.jpg'
    OR right(lower(name), 5) = '.jpeg'
    OR right(lower(name), 5) = '.tiff'
    OR right(lower(name), 4) = '.tif'
    OR right(lower(name), 4) = '.doc'
    OR right(lower(name), 5) = '.docx'
    OR right(lower(name), 4) = '.txt'
  )
); 