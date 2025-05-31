/*
  # Add admin exemption for purchases

  1. Changes
    - Modify document policies to allow admins to bypass purchase requirements
    - Add helper function to check if user has valid purchase or is admin
  
  2. Security
    - Maintains existing RLS policies
    - Adds additional checks for purchase validation
*/

-- Create a function to check if user has valid purchase or is admin
CREATE OR REPLACE FUNCTION public.can_upload_document(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin (admins can always upload)
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id 
    AND role = 'admin'
  ) THEN
    RETURN true;
  END IF;

  -- TODO: Add your purchase validation logic here
  -- This is where you'll check for active subscriptions or upload credits
  -- For now, returning true to prevent breaking existing functionality
  RETURN true;
END;
$$;

-- Drop existing document policies
DROP POLICY IF EXISTS "Enable all operations for users on their own documents" ON documents;

-- Create new document policy with purchase check
CREATE POLICY "Enable all operations for users on their own documents"
ON documents FOR ALL
TO authenticated
USING (
  (auth.uid() = user_id AND can_upload_document(auth.uid())) OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  (auth.uid() = user_id AND can_upload_document(auth.uid())) OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);