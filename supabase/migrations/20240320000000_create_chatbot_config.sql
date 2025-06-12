-- Create chatbot_config table
CREATE TABLE IF NOT EXISTS chatbot_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enabled BOOLEAN NOT NULL DEFAULT true,
    welcome_message TEXT NOT NULL DEFAULT 'Hello! How can I help you today?',
    max_tokens INTEGER NOT NULL DEFAULT 1000,
    temperature DECIMAL(3,2) NOT NULL DEFAULT 0.70,
    model TEXT NOT NULL DEFAULT 'gpt-4',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chatbot_config_updated_at
    BEFORE UPDATE ON chatbot_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default configuration
INSERT INTO chatbot_config (enabled, welcome_message, max_tokens, temperature, model)
VALUES (true, 'Hello! How can I help you today?', 1000, 0.70, 'gpt-4')
ON CONFLICT (id) DO NOTHING;

-- Add RLS policies
ALTER TABLE chatbot_config ENABLE ROW LEVEL SECURITY;

-- Only allow admins to read the config
CREATE POLICY "Allow admins to read chatbot config"
    ON chatbot_config
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Only allow admins to update the config
CREATE POLICY "Allow admins to update chatbot config"
    ON chatbot_config
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Only allow admins to insert new config
CREATE POLICY "Allow admins to insert chatbot config"
    ON chatbot_config
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    ); 