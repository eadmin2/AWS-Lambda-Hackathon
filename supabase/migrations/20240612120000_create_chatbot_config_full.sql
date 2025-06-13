-- Create chatbot_config table (full definition)
CREATE TABLE IF NOT EXISTS chatbot_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enabled BOOLEAN NOT NULL DEFAULT true,
    welcome_message TEXT NOT NULL DEFAULT 'Hello! How can I help you today?',
    max_tokens INTEGER NOT NULL DEFAULT 1000,
    temperature DECIMAL(3,2) NOT NULL DEFAULT 0.70,
    model TEXT NOT NULL DEFAULT 'gpt-4',
    bot_name TEXT NOT NULL DEFAULT 'VA Assistant',
    status_message TEXT NOT NULL DEFAULT 'Online • Typically replies instantly',
    input_placeholder TEXT NOT NULL DEFAULT 'Type your message...',
    primary_color TEXT NOT NULL DEFAULT '#3b82f6',
    header_color TEXT NOT NULL DEFAULT '#f8fafc',
    user_text_color TEXT NOT NULL DEFAULT '#ffffff',
    position TEXT NOT NULL DEFAULT 'bottom-right' CHECK (position IN ('bottom-right', 'bottom-left')),
    quick_replies JSONB NOT NULL DEFAULT '[
        {"id": "1", "text": "Calculate my rating", "action": "calculator"},
        {"id": "2", "text": "Upload documents", "action": "upload"},
        {"id": "3", "text": "Pricing info", "action": "pricing"},
        {"id": "4", "text": "Contact support", "action": "support"}
    ]'::jsonb,
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

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_chatbot_config_updated_at'
    ) THEN
        CREATE TRIGGER update_chatbot_config_updated_at
            BEFORE UPDATE ON chatbot_config
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Insert default configuration
INSERT INTO chatbot_config (
    enabled,
    welcome_message,
    max_tokens,
    temperature,
    model,
    bot_name,
    status_message,
    input_placeholder,
    primary_color,
    header_color,
    user_text_color,
    position,
    quick_replies
)
VALUES (
    true,
    'Hello! How can I help you today?',
    1000,
    0.70,
    'gpt-4',
    'VA Assistant',
    'Online • Typically replies instantly',
    'Type your message...',
    '#3b82f6',
    '#f8fafc',
    '#ffffff',
    'bottom-right',
    '[
        {"id": "1", "text": "Calculate my rating", "action": "calculator"},
        {"id": "2", "text": "Upload documents", "action": "upload"},
        {"id": "3", "text": "Pricing info", "action": "pricing"},
        {"id": "4", "text": "Contact support", "action": "support"}
    ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Add RLS policies
ALTER TABLE chatbot_config ENABLE ROW LEVEL SECURITY;

-- Only allow admins to read the config
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'chatbot_config' 
        AND policyname = 'Allow admins to read chatbot config'
    ) THEN
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
    END IF;
END $$;

-- Only allow admins to update the config
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'chatbot_config' 
        AND policyname = 'Allow admins to update chatbot config'
    ) THEN
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
    END IF;
END $$;

-- Only allow admins to insert new config
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'chatbot_config' 
        AND policyname = 'Allow admins to insert chatbot config'
    ) THEN
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
    END IF;
END $$; 