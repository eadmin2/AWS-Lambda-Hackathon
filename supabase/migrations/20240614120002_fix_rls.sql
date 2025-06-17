-- Allow all authenticated users to read profiles
DROP POLICY IF EXISTS "Authenticated can read profiles" ON profiles;
CREATE POLICY "Authenticated can read profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow all authenticated users to read documents
DROP POLICY IF EXISTS "Authenticated can read documents" ON documents;
CREATE POLICY "Authenticated can read documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (true); 