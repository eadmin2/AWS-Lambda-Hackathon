-- Add tokens_consumed column to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS tokens_consumed INTEGER DEFAULT 0; 