/*
  # Fix RLS policies for profiles and related tables

  1. Changes
    - Remove existing RLS policies that cause infinite recursion
    - Create simplified RLS policies for profiles table
    - Update RLS policies for documents table
    - Update RLS policies for disability_estimates table
    
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for admins to manage all data
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Veterans can view own profile" ON profiles;
DROP POLICY IF EXISTS "Veterans can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

DROP POLICY IF EXISTS "Veterans can create own documents" ON documents;
DROP POLICY IF EXISTS "Veterans can delete own documents" ON documents;
DROP POLICY IF EXISTS "Veterans can view own documents" ON documents;
DROP POLICY IF EXISTS "Admins can manage all documents" ON documents;

DROP POLICY IF EXISTS "Veterans can create own disability estimates" ON disability_estimates;
DROP POLICY IF EXISTS "Veterans can view own disability estimates" ON disability_estimates;
DROP POLICY IF EXISTS "Admins can manage all disability estimates" ON disability_estimates;

-- Profiles table policies
CREATE POLICY "Enable insert for authenticated users creating their own profile" 
ON profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable select for users viewing their own profile" 
ON profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = id OR role = 'admin');

CREATE POLICY "Enable update for users modifying their own profile" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id OR role = 'admin')
WITH CHECK (auth.uid() = id OR role = 'admin');

-- Documents table policies
CREATE POLICY "Enable all operations for users on their own documents" 
ON documents FOR ALL 
TO authenticated 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Disability estimates table policies
CREATE POLICY "Enable all operations for users on their own disability estimates" 
ON disability_estimates FOR ALL 
TO authenticated 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);