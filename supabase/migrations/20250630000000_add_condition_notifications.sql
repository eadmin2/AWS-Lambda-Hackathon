-- Add notification preferences to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean DEFAULT true;

-- Create condition_updates table to track when conditions are updated
CREATE TABLE IF NOT EXISTS condition_updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notification_sent BOOLEAN DEFAULT false,
    notification_sent_at TIMESTAMP WITH TIME ZONE
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_condition_updates_user_id ON condition_updates(user_id);
CREATE INDEX IF NOT EXISTS idx_condition_updates_notification_sent ON condition_updates(notification_sent);

-- Enable RLS
ALTER TABLE condition_updates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own condition updates"
ON condition_updates FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create function to track condition updates
CREATE OR REPLACE FUNCTION track_condition_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Only track updates that add or modify conditions
    IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.* IS DISTINCT FROM NEW.*)) THEN
        INSERT INTO condition_updates (user_id, document_id)
        VALUES (NEW.user_id, NEW.document_id)
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to track updates
DROP TRIGGER IF EXISTS user_conditions_update_trigger ON user_conditions;
CREATE TRIGGER user_conditions_update_trigger
    AFTER INSERT OR UPDATE ON user_conditions
    FOR EACH ROW
    EXECUTE FUNCTION track_condition_update();

DROP TRIGGER IF EXISTS disability_estimates_update_trigger ON disability_estimates;
CREATE TRIGGER disability_estimates_update_trigger
    AFTER INSERT OR UPDATE ON disability_estimates
    FOR EACH ROW
    EXECUTE FUNCTION track_condition_update(); 