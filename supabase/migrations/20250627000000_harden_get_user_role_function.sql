-- supabase/migrations/20250627000000_harden_get_user_role_function.sql
-- Harden the get_user_role function to prevent errors
-- The previous version could return NULL, causing policies to fail.
-- This version ensures it always returns a valid role, defaulting to 'user'.
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role 
  INTO user_role
  FROM public.profiles 
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 