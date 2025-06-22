-- Migration to support token-based system
-- Create user_tokens table to track token balances
CREATE TABLE IF NOT EXISTS user_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tokens_available INTEGER NOT NULL DEFAULT 0,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint to ensure one token record per user
ALTER TABLE user_tokens ADD CONSTRAINT user_tokens_user_id_unique UNIQUE (user_id);

-- Create token_purchases table to track token purchases
CREATE TABLE IF NOT EXISTS token_purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    stripe_payment_intent_id TEXT,
    product_type TEXT NOT NULL, -- 'starter', 'file-review', 'full-review', 'tokens-100', etc.
    tokens_purchased INTEGER NOT NULL,
    amount_paid INTEGER NOT NULL, -- in cents
    currency TEXT NOT NULL DEFAULT 'usd',
    status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create promotional_codes table for coupons/discounts
CREATE TABLE IF NOT EXISTS promotional_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL, -- 'percentage', 'fixed_amount', 'free_tokens'
    discount_value INTEGER NOT NULL, -- percentage (1-100) or amount in cents or token count
    max_uses INTEGER, -- NULL for unlimited
    current_uses INTEGER NOT NULL DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_promotional_codes table to track which users used which codes
CREATE TABLE IF NOT EXISTS user_promotional_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    promotional_code_id UUID NOT NULL REFERENCES promotional_codes(id) ON DELETE CASCADE,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint to prevent users from using the same code multiple times
ALTER TABLE user_promotional_codes ADD CONSTRAINT user_promo_code_unique UNIQUE (user_id, promotional_code_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_token_purchases_user_id ON token_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_token_purchases_status ON token_purchases(status);
CREATE INDEX IF NOT EXISTS idx_promotional_codes_code ON promotional_codes(code);
CREATE INDEX IF NOT EXISTS idx_user_promotional_codes_user_id ON user_promotional_codes(user_id);

-- Add RLS policies
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotional_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_promotional_codes ENABLE ROW LEVEL SECURITY;

-- User tokens policies
CREATE POLICY "Users can view their own tokens" ON user_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens" ON user_tokens
    FOR UPDATE USING (auth.uid() = user_id);

-- Token purchases policies
CREATE POLICY "Users can view their own purchases" ON token_purchases
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own purchases" ON token_purchases
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Promotional codes policies (read-only for users)
CREATE POLICY "Users can view active promotional codes" ON promotional_codes
    FOR SELECT USING (active = TRUE AND (valid_until IS NULL OR valid_until > NOW()));

-- User promotional codes policies
CREATE POLICY "Users can view their own promotional code usage" ON user_promotional_codes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own promotional code usage" ON user_promotional_codes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin policies (admins can manage everything)
CREATE POLICY "Admins can manage all tokens" ON user_tokens
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can manage all purchases" ON token_purchases
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can manage promotional codes" ON promotional_codes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can manage user promotional codes" ON user_promotional_codes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Function to get user token balance
CREATE OR REPLACE FUNCTION get_user_token_balance(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER update_user_tokens_updated_at BEFORE UPDATE ON user_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_token_purchases_updated_at BEFORE UPDATE ON token_purchases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promotional_codes_updated_at BEFORE UPDATE ON promotional_codes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add token-related columns to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS estimated_tokens INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS tokens_consumed INTEGER DEFAULT 0; 