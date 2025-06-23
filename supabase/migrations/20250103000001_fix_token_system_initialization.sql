-- Fix token system initialization issues
-- This migration addresses users not being able to upload documents due to missing token records

-- 1. Add INSERT policy for user_tokens table so the system can create token records
CREATE POLICY "System can insert user tokens" ON user_tokens
    FOR INSERT WITH CHECK (true);

-- 2. Update handle_new_user function to initialize user tokens
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'veteran');
  
  -- Also create a default payments record with free credits
  INSERT INTO public.payments (user_id, subscription_status, upload_credits)
  VALUES (NEW.id, 'free_tier', 3);
  
  -- Initialize user tokens record with 0 tokens
  -- This ensures users have a token record even if they haven't purchased tokens yet
  INSERT INTO public.user_tokens (user_id, tokens_available, tokens_used)
  VALUES (NEW.id, 0, 0);
  
  RETURN NEW;
END;
$$;

-- 3. Initialize token records for existing users who don't have them
-- This is crucial for users who registered before the token system was implemented
INSERT INTO user_tokens (user_id, tokens_available, tokens_used)
SELECT p.id, 0, 0
FROM profiles p
LEFT JOIN user_tokens ut ON p.id = ut.user_id
WHERE ut.user_id IS NULL;

-- 4. Create a helper function to manually add initial tokens for users if needed
CREATE OR REPLACE FUNCTION give_initial_tokens_to_user(p_user_id UUID, p_tokens INTEGER DEFAULT 50)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_balance INTEGER;
BEGIN
    -- Check if user already has tokens
    SELECT tokens_available INTO current_balance
    FROM user_tokens
    WHERE user_id = p_user_id;
    
    -- Only give tokens if user has 0 or if no record exists
    IF COALESCE(current_balance, 0) = 0 THEN
        INSERT INTO user_tokens (user_id, tokens_available, tokens_used)
        VALUES (p_user_id, p_tokens, 0)
        ON CONFLICT (user_id)
        DO UPDATE SET 
            tokens_available = user_tokens.tokens_available + p_tokens,
            updated_at = NOW();
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;