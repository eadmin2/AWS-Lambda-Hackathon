/*
  # Add CFR-related columns to disability_estimates table
  
  This migration adds the following columns to support the RAG agent functionality:
  - `cfr_criteria` (text) - Stores the relevant CFR citation
  - `excerpt` (text) - Stores relevant text excerpt from the document
  - `matched_keywords` (text[]) - Stores matched keywords from the analysis
  - `document_id` (uuid) - References the document that was analyzed
  - `severity` (text) - Stores the severity level (mild/moderate/severe/total)
*/

-- Add new columns to disability_estimates table
ALTER TABLE disability_estimates 
ADD COLUMN IF NOT EXISTS cfr_criteria text,
ADD COLUMN IF NOT EXISTS excerpt text,
ADD COLUMN IF NOT EXISTS matched_keywords text[],
ADD COLUMN IF NOT EXISTS document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS severity text;

-- Create index for document_id for better query performance
CREATE INDEX IF NOT EXISTS idx_disability_estimates_document_id 
ON disability_estimates(document_id);

-- Update the unique constraint to include document_id and condition
-- First drop the existing constraint if it exists
ALTER TABLE disability_estimates 
DROP CONSTRAINT IF EXISTS disability_estimates_user_id_condition_key;

-- Add new unique constraint
ALTER TABLE disability_estimates 
ADD CONSTRAINT disability_estimates_user_id_document_id_condition_key 
UNIQUE (user_id, document_id, condition); 