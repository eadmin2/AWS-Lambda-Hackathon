-- ================================================
-- SUPABASE RAG MIGRATION SCRIPT
-- This safely adds RAG capabilities to your existing database
-- ================================================

-- Enable necessary extensions (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ================================================
-- 1. UPDATE EXISTING DOCUMENTS TABLE
-- Add new columns for RAG functionality
-- ================================================

-- Add RAG-related columns to existing documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS document_name TEXT,
ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'medical_record',
ADD COLUMN IF NOT EXISTS mime_type TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS upload_status TEXT DEFAULT 'uploaded',
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS total_pages INTEGER,
ADD COLUMN IF NOT EXISTS total_chunks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS language_detected TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS display_on_dashboard BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Update existing records with sensible defaults
UPDATE documents 
SET 
    document_name = COALESCE(file_name, 'Untitled Document'),
    document_type = 'medical_record',
    upload_status = 'uploaded',
    processing_status = 'pending',
    updated_at = COALESCE(uploaded_at, NOW()),
    display_on_dashboard = true
WHERE document_name IS NULL OR upload_status IS NULL;

-- ================================================
-- 2. CREATE NEW RAG TABLES
-- ================================================

-- Document chunks table (for RAG text chunks with embeddings)
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL,
    chunk_index INTEGER NOT NULL,
    page_number INTEGER,
    
    -- Text content for RAG
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'text', -- 'text', 'table', 'header', 'footer', 'form_field'
    
    -- Vector embeddings for RAG similarity search
    embedding vector(1536), -- OpenAI ada-002 dimension, adjust as needed
    
    -- Textract metadata
    confidence_score DECIMAL(5,4),
    bounding_box JSONB, -- {top, left, width, height}
    
    -- Hierarchical structure
    parent_chunk_id UUID,
    section_title TEXT,
    
    -- Metadata for better RAG context
    word_count INTEGER,
    char_count INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_document_chunks_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_parent_chunk FOREIGN KEY (parent_chunk_id) REFERENCES document_chunks(id),
    UNIQUE(document_id, chunk_index)
);

-- Medical entities table (extracted structured data)
CREATE TABLE IF NOT EXISTS medical_entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL,
    chunk_id UUID, -- reference to specific chunk if applicable
    
    entity_type TEXT NOT NULL, -- 'patient_name', 'diagnosis', 'medication', 'date', 'provider', etc.
    entity_value TEXT NOT NULL,
    normalized_value TEXT, -- standardized/cleaned version
    
    -- Confidence and positioning
    confidence_score DECIMAL(5,4),
    bounding_box JSONB,
    
    -- Medical coding
    icd_code TEXT,
    snomed_code TEXT,
    rxnorm_code TEXT,
    
    -- Relationships
    related_entities UUID[], -- array of related entity IDs
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_medical_entities_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_medical_entities_chunk FOREIGN KEY (chunk_id) REFERENCES document_chunks(id) ON DELETE SET NULL
);

-- Textract jobs tracking
CREATE TABLE IF NOT EXISTS textract_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL,
    aws_job_id TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'PROCESSING', -- 'PROCESSING', 'SUCCEEDED', 'FAILED'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    -- Raw Textract output storage
    raw_output JSONB, -- store full Textract response
    
    CONSTRAINT fk_textract_jobs_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Document summaries for RAG context
CREATE TABLE IF NOT EXISTS document_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL UNIQUE,
    
    -- Different summary levels for RAG
    executive_summary TEXT, -- high-level overview
    detailed_summary TEXT, -- comprehensive summary
    key_points TEXT[], -- bullet points of main topics
    
    -- Medical-specific summaries
    diagnoses_summary TEXT,
    medications_summary TEXT,
    procedures_summary TEXT,
    
    -- RAG optimization
    summary_embedding vector(1536),
    topics TEXT[], -- extracted topics/themes
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_document_summaries_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- ================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ================================================

-- Vector similarity search indexes
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding 
ON document_chunks USING ivfflat (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_document_summaries_embedding 
ON document_summaries USING ivfflat (summary_embedding vector_cosine_ops);

-- Regular indexes for common queries
CREATE INDEX IF NOT EXISTS idx_documents_type_status 
ON documents(document_type, processing_status);

CREATE INDEX IF NOT EXISTS idx_documents_updated_at 
ON documents(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id 
ON document_chunks(document_id);

CREATE INDEX IF NOT EXISTS idx_document_chunks_content_type 
ON document_chunks(content_type);

CREATE INDEX IF NOT EXISTS idx_medical_entities_type 
ON medical_entities(entity_type);

CREATE INDEX IF NOT EXISTS idx_medical_entities_document_id 
ON medical_entities(document_id);

CREATE INDEX IF NOT EXISTS idx_textract_jobs_aws_job_id 
ON textract_jobs(aws_job_id);

CREATE INDEX IF NOT EXISTS idx_textract_jobs_status 
ON textract_jobs(status);

-- ================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ================================================

-- Enable RLS on new tables
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE textract_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_chunks
CREATE POLICY "Users can access chunks of their documents" ON document_chunks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM documents 
            WHERE documents.id = document_chunks.document_id 
            AND documents.user_id = auth.uid()
        )
    );

-- RLS Policies for medical_entities
CREATE POLICY "Users can access entities from their documents" ON medical_entities
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM documents 
            WHERE documents.id = medical_entities.document_id 
            AND documents.user_id = auth.uid()
        )
    );

-- RLS Policies for textract_jobs
CREATE POLICY "Users can access their textract jobs" ON textract_jobs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM documents 
            WHERE documents.id = textract_jobs.document_id 
            AND documents.user_id = auth.uid()
        )
    );

-- RLS Policies for document_summaries
CREATE POLICY "Users can access summaries of their documents" ON document_summaries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM documents 
            WHERE documents.id = document_summaries.document_id 
            AND documents.user_id = auth.uid()
        )
    );

-- ================================================
-- 5. TRIGGERS AND FUNCTIONS
-- ================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for documents updated_at
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON documents
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for document_summaries updated_at
DROP TRIGGER IF EXISTS update_document_summaries_updated_at ON document_summaries;
CREATE TRIGGER update_document_summaries_updated_at 
    BEFORE UPDATE ON document_summaries
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 6. USEFUL VIEWS FOR RAG QUERIES
-- ================================================

-- View for RAG document retrieval with all metadata
CREATE OR REPLACE VIEW rag_documents AS
SELECT 
    d.id,
    d.user_id,
    d.document_name,
    d.file_name,
    d.document_type,
    d.processing_status,
    d.total_chunks,
    d.uploaded_at,
    d.processed_at,
    ds.executive_summary,
    ds.topics,
    COALESCE(d.total_chunks, 0) as chunk_count
FROM documents d
LEFT JOIN document_summaries ds ON d.id = ds.document_id
WHERE d.processing_status = 'completed'
    AND d.display_on_dashboard = true;

-- View for searchable content chunks
CREATE OR REPLACE VIEW searchable_chunks AS
SELECT 
    dc.id,
    dc.document_id,
    dc.content,
    dc.content_type,
    dc.page_number,
    dc.chunk_index,
    dc.confidence_score,
    dc.word_count,
    d.document_name,
    d.document_type,
    d.user_id
FROM document_chunks dc
JOIN documents d ON dc.document_id = d.id
WHERE d.processing_status = 'completed';

-- ================================================
-- 7. SAMPLE FUNCTIONS FOR RAG OPERATIONS
-- ================================================

-- Function to search similar content using vector similarity
CREATE OR REPLACE FUNCTION search_similar_content(
    query_embedding vector(1536),
    user_filter uuid DEFAULT NULL,
    similarity_threshold float DEFAULT 0.7,
    max_results int DEFAULT 10
)
RETURNS TABLE (
    chunk_id uuid,
    document_id uuid,
    content text,
    document_name text,
    similarity float,
    page_number int
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.id,
        dc.document_id,
        dc.content,
        d.document_name,
        1 - (dc.embedding <=> query_embedding) as similarity,
        dc.page_number
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE 
        dc.embedding IS NOT NULL
        AND (user_filter IS NULL OR d.user_id = user_filter)
        AND d.processing_status = 'completed'
        AND (1 - (dc.embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- MIGRATION COMPLETE
-- ================================================

-- Verify the migration
SELECT 
    'documents' as table_name, 
    count(*) as row_count,
    array_agg(DISTINCT processing_status) as statuses
FROM documents
UNION ALL
SELECT 
    'document_chunks' as table_name, 
    count(*) as row_count,
    array['created'] as statuses
FROM document_chunks
UNION ALL
SELECT 
    'medical_entities' as table_name, 
    count(*) as row_count,
    array['created'] as statuses
FROM medical_entities;

-- Show table info
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN ('documents', 'document_chunks', 'medical_entities', 'textract_jobs', 'document_summaries')
ORDER BY table_name, ordinal_position;