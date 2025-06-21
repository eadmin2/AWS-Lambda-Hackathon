-- Add user status management and improve payment tracking
-- Migration: 20250626000000_add_user_status_management.sql

-- Create user status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE user_payment_status AS ENUM ('registered', 'paid', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add payment_status column to profiles if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE profiles 
        ADD COLUMN payment_status user_payment_status DEFAULT 'registered';
    END IF;
END $$;

-- Create function to automatically update user payment status
CREATE OR REPLACE FUNCTION update_user_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the user's payment status based on their payments
    UPDATE profiles 
    SET payment_status = CASE
        WHEN profiles.role = 'admin' THEN 'admin'::user_payment_status
        WHEN EXISTS (
            SELECT 1 FROM payments 
            WHERE payments.user_id = profiles.id 
            AND (
                payments.subscription_status = 'active'
                OR payments.upload_credits > 0
                OR (
                    payments.subscription_status = 'trialing' 
                    AND payments.subscription_end_date > NOW()
                )
            )
        ) THEN 'paid'::user_payment_status
        ELSE 'registered'::user_payment_status
    END
    WHERE profiles.id = COALESCE(NEW.user_id, OLD.user_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update payment status when payments change
DROP TRIGGER IF EXISTS update_payment_status_trigger ON payments;
CREATE TRIGGER update_payment_status_trigger
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_user_payment_status();

-- Create trigger to update payment status when profiles change (for admin status)
DROP TRIGGER IF EXISTS update_payment_status_profile_trigger ON profiles;
CREATE TRIGGER update_payment_status_profile_trigger
    AFTER UPDATE OF role ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_payment_status();

-- Update existing users' payment status
UPDATE profiles 
SET payment_status = CASE
    WHEN profiles.role = 'admin' THEN 'admin'::user_payment_status
    WHEN EXISTS (
        SELECT 1 FROM payments 
        WHERE payments.user_id = profiles.id 
        AND (
            payments.subscription_status = 'active'
            OR payments.upload_credits > 0
            OR (
                payments.subscription_status = 'trialing' 
                AND payments.subscription_end_date > NOW()
            )
        )
    ) THEN 'paid'::user_payment_status
    ELSE 'registered'::user_payment_status
END;

-- Create function to check if user can upload
CREATE OR REPLACE FUNCTION user_can_upload(user_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles p
        LEFT JOIN payments pay ON p.id = pay.user_id
        WHERE p.id = user_can_upload.user_id
        AND (
            p.role = 'admin'
            OR pay.subscription_status = 'active'
            OR pay.upload_credits > 0
            OR (
                pay.subscription_status = 'trialing' 
                AND pay.subscription_end_date > NOW()
            )
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_id uuid)
RETURNS TABLE (
    can_upload boolean,
    can_access_paid_features boolean,
    can_access_admin_features boolean,
    has_active_subscription boolean,
    has_upload_credits boolean,
    upload_credits_remaining bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN p.role = 'admin' THEN true
            WHEN pay.subscription_status = 'active' THEN true
            WHEN pay.upload_credits > 0 THEN true
            WHEN pay.subscription_status = 'trialing' AND pay.subscription_end_date > NOW() THEN true
            ELSE false
        END as can_upload,
        CASE 
            WHEN p.role = 'admin' THEN true
            WHEN pay.subscription_status = 'active' THEN true
            WHEN pay.upload_credits > 0 THEN true
            WHEN pay.subscription_status = 'trialing' AND pay.subscription_end_date > NOW() THEN true
            ELSE false
        END as can_access_paid_features,
        CASE 
            WHEN p.role = 'admin' THEN true
            ELSE false
        END as can_access_admin_features,
        CASE 
            WHEN pay.subscription_status = 'active' THEN true
            WHEN pay.subscription_status = 'trialing' AND pay.subscription_end_date > NOW() THEN true
            ELSE false
        END as has_active_subscription,
        CASE 
            WHEN pay.upload_credits > 0 THEN true
            ELSE false
        END as has_upload_credits,
        COALESCE(SUM(pay.upload_credits), 0) as upload_credits_remaining
    FROM profiles p
    LEFT JOIN payments pay ON p.id = pay.user_id
    WHERE p.id = get_user_permissions.user_id
    GROUP BY p.id, p.role, pay.subscription_status, pay.subscription_end_date, pay.upload_credits;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies for the new payment_status field
-- Users can read their own payment status
CREATE POLICY "Users can read own payment status" ON profiles
    FOR SELECT USING (auth.uid() = id OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Only admins can update payment status directly (triggers handle automatic updates)
CREATE POLICY "Only admins can update payment status" ON profiles
    FOR UPDATE USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Add comment for documentation
COMMENT ON COLUMN profiles.payment_status IS 'Tracks user payment status: registered (no payment), paid (has active subscription or credits), admin (full access)';
COMMENT ON FUNCTION update_user_payment_status() IS 'Automatically updates user payment status when payments change';
COMMENT ON FUNCTION user_can_upload(uuid) IS 'Returns true if user has upload permissions';
COMMENT ON FUNCTION get_user_permissions(uuid) IS 'Returns comprehensive permission set for a user';