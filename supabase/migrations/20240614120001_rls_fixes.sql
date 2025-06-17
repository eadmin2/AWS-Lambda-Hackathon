-- Allow all authenticated users to read chatbot_config
DROP POLICY IF EXISTS "Authenticated can view chatbot config" ON chatbot_config;
CREATE POLICY "Authenticated can view chatbot config"
  ON chatbot_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to view their own documents
DROP POLICY IF EXISTS "Users can view own documents" ON documents;
CREATE POLICY "Users can view own documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow admins to view all documents
DROP POLICY IF EXISTS "Admins can view all documents" ON documents;
CREATE POLICY "Admins can view all documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Set SECURITY DEFINER for analytics RPCs
ALTER FUNCTION monthly_user_signups() SECURITY DEFINER;
ALTER FUNCTION monthly_document_uploads() SECURITY DEFINER;
ALTER FUNCTION monthly_revenue() SECURITY DEFINER;
ALTER FUNCTION active_inactive_users() SECURITY DEFINER; 