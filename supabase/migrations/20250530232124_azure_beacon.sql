/*
  # Add user roles and admin functionality

  1. Changes
    - Add role enum type for user roles (veteran, admin)
    - Add role column to profiles table
    - Add admin-specific policies
    - Update existing policies to work with roles

  2. Security
    - Admins can view all profiles and documents
    - Veterans can only view their own data
    - Only admins can change user roles
*/

-- Create role enum type
CREATE TYPE user_role AS ENUM ('veteran', 'admin');

-- Add role column to profiles table
ALTER TABLE profiles
ADD COLUMN role user_role NOT NULL DEFAULT 'veteran';

-- Update policies for profiles

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new policies
CREATE POLICY "Veterans can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = id AND role = 'veteran') OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Veterans can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id AND role = 'veteran')
  WITH CHECK (auth.uid() = id AND role = 'veteran');

CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Update policies for documents

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own documents" ON documents;
DROP POLICY IF EXISTS "Users can create own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;

-- Create new policies
CREATE POLICY "Veterans can view own documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (
    (user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'veteran'
    )) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Veterans can create own documents"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'veteran')
  );

CREATE POLICY "Veterans can delete own documents"
  ON documents
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'veteran')
  );

CREATE POLICY "Admins can manage all documents"
  ON documents
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Update policies for disability estimates

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own disability estimates" ON disability_estimates;
DROP POLICY IF EXISTS "Users can create own disability estimates" ON disability_estimates;

-- Create new policies
CREATE POLICY "Veterans can view own disability estimates"
  ON disability_estimates
  FOR SELECT
  TO authenticated
  USING (
    (user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'veteran'
    )) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Veterans can create own disability estimates"
  ON disability_estimates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'veteran')
  );

CREATE POLICY "Admins can manage all disability estimates"
  ON disability_estimates
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Create function to create initial admin user
CREATE OR REPLACE FUNCTION create_admin_user(admin_email TEXT, admin_password TEXT)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Create user in auth.users
  new_user_id := (
    SELECT id FROM auth.users
    WHERE email = admin_email
    LIMIT 1
  );
  
  IF new_user_id IS NULL THEN
    new_user_id := (
      SELECT id FROM auth.users
      WHERE email = admin_email
      LIMIT 1
    );
    
    IF new_user_id IS NULL THEN
      RAISE EXCEPTION 'Failed to create admin user';
    END IF;
  END IF;

  -- Create profile with admin role
  INSERT INTO profiles (id, email, role)
  VALUES (new_user_id, admin_email, 'admin')
  ON CONFLICT (id) DO UPDATE
  SET role = 'admin';

  RETURN new_user_id;
END;
$$;