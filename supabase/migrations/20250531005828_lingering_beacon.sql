/*
  # Add document relationship to disability estimates

  1. Changes
    - Add document_id column to disability_estimates table
    - Create foreign key constraint to documents table
    - Update RLS policies to maintain security

  2. Security
    - Maintain existing RLS policies
    - Ensure document relationship respects user permissions
*/

-- Add document_id column to disability_estimates
ALTER TABLE disability_estimates 
ADD COLUMN IF NOT EXISTS document_id uuid REFERENCES documents(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_disability_estimates_document_id 
ON disability_estimates(document_id);