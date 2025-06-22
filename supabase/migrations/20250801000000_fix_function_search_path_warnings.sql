-- This migration fixes the function_search_path_mutable security warnings
-- by setting a secure search_path for the affected functions.

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$;

-- Function to get user token balance
CREATE OR REPLACE FUNCTION get_user_token_balance(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    token_balance INTEGER;
BEGIN
    SELECT tokens_available INTO token_balance
    FROM user_tokens
    WHERE user_id = p_user_id;
    
    RETURN COALESCE(token_balance, 0);
END;
$$;

-- Function to add tokens to user account
CREATE OR REPLACE FUNCTION add_user_tokens(p_user_id UUID, p_tokens INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO user_tokens (user_id, tokens_available)
    VALUES (p_user_id, p_tokens)
    ON CONFLICT (user_id)
    DO UPDATE SET 
        tokens_available = user_tokens.tokens_available + p_tokens,
        updated_at = NOW();
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Function to use tokens
CREATE OR REPLACE FUNCTION use_user_tokens(p_user_id UUID, p_tokens INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_balance INTEGER;
BEGIN
    -- Get current balance
    SELECT tokens_available INTO current_balance
    FROM user_tokens
    WHERE user_id = p_user_id;
    
    -- Check if user has enough tokens
    IF COALESCE(current_balance, 0) < p_tokens THEN
        RETURN FALSE;
    END IF;
    
    -- Update token balance
    UPDATE user_tokens
    SET 
        tokens_available = tokens_available - p_tokens,
        tokens_used = tokens_used + p_tokens,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Function to validate promotional code
CREATE OR REPLACE FUNCTION validate_promotional_code(p_code TEXT, p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    promo_record promotional_codes%ROWTYPE;
    user_used_count INTEGER;
    result JSON;
BEGIN
    -- Get promotional code details
    SELECT * INTO promo_record
    FROM promotional_codes
    WHERE code = p_code AND active = TRUE;
    
    -- Check if code exists
    IF NOT FOUND THEN
        RETURN json_build_object('valid', false, 'message', 'Invalid promotional code');
    END IF;
    
    -- Check if code is still valid (date range)
    IF promo_record.valid_until IS NOT NULL AND promo_record.valid_until < NOW() THEN
        RETURN json_build_object('valid', false, 'message', 'Promotional code has expired');
    END IF;
    
    -- Check if code has reached max uses
    IF promo_record.max_uses IS NOT NULL AND promo_record.current_uses >= promo_record.max_uses THEN
        RETURN json_build_object('valid', false, 'message', 'Promotional code has reached maximum uses');
    END IF;
    
    -- Check if user has already used this code
    SELECT COUNT(*) INTO user_used_count
    FROM user_promotional_codes
    WHERE user_id = p_user_id AND promotional_code_id = promo_record.id;
    
    IF user_used_count > 0 THEN
        RETURN json_build_object('valid', false, 'message', 'You have already used this promotional code');
    END IF;
    
    -- Code is valid
    RETURN json_build_object(
        'valid', true,
        'discount_type', promo_record.discount_type,
        'discount_value', promo_record.discount_value,
        'code_id', promo_record.id
    );
END;
$$; 