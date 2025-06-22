# Token System Troubleshooting Guide

## Issue Description
Users with purchased tokens are unable to upload documents because the system shows they have zero tokens available, even though tokens were purchased successfully.

## Root Cause Analysis

### Primary Causes:
1. **Missing Token Records**: Users who registered before the token system was fully implemented don't have records in the `user_tokens` table
2. **Incomplete User Registration**: The `handle_new_user` function wasn't initializing token records for new users
3. **Missing RLS Policy**: No INSERT policy existed for the `user_tokens` table, preventing proper token record creation

### How Token System Works:
1. Users purchase tokens via Stripe checkout
2. Stripe webhook (`stripe-webhook/index.ts`) processes the payment
3. Webhook calls `add_user_tokens` RPC function to add tokens to user's balance
4. `FileUploader` component calls `getUserTokenBalance` to check available tokens
5. `getUserTokenBalance` queries the `user_tokens` table via `get_user_token_balance` RPC

### The Problem:
If a user doesn't have a record in `user_tokens`, the `get_user_token_balance` function returns 0, even if they purchased tokens through Stripe.

## Solution Implementation

### 1. Database Migration
Run the migration `20250103000001_fix_token_system_initialization.sql`:

```sql
-- Adds INSERT policy for user_tokens
-- Updates handle_new_user to initialize token records
-- Creates token records for existing users
-- Adds helper function for manual token grants
```

### 2. Immediate Fix for Affected Users
Use `fix_user_tokens.sql` to:
- Check current token status for all users
- Initialize missing token records
- Manually grant tokens if needed

### 3. Verification Steps

#### Check User Token Status:
```sql
SELECT 
    p.email,
    COALESCE(ut.tokens_available, 0) as tokens_available,
    CASE 
        WHEN ut.user_id IS NULL THEN 'NO_TOKEN_RECORD'
        WHEN ut.tokens_available = 0 THEN 'ZERO_BALANCE'
        ELSE 'HAS_TOKENS'
    END as status
FROM profiles p
LEFT JOIN user_tokens ut ON p.id = ut.user_id
WHERE p.email = 'user@example.com';
```

#### Check Token Purchases:
```sql
SELECT 
    product_type,
    tokens_purchased,
    status,
    created_at
FROM token_purchases 
WHERE user_id = (SELECT id FROM profiles WHERE email = 'user@example.com')
ORDER BY created_at DESC;
```

## Prevention Measures

### 1. Monitoring
- Set up alerts for Stripe webhook failures
- Monitor `token_purchases` table for failed transactions
- Regular checks for users with zero token balances who have purchase history

### 2. Error Handling
- Implement retry logic in Stripe webhook for token additions
- Add fallback token initialization in the frontend
- Improve error messages in FileUploader component

### 3. User Communication
- Clear messaging about token requirements
- Better error messages when tokens are insufficient
- Purchase flow integration in the upload interface

## Manual Token Grant Process

If you need to manually grant tokens to a user:

```sql
-- Grant 50 tokens to a specific user
SELECT give_initial_tokens_to_user(
    (SELECT id FROM profiles WHERE email = 'user@example.com'),
    50
);
```

## Testing Verification

After applying fixes:
1. New user registration should create token record
2. Token purchases should properly update balances
3. File upload should show correct token balance
4. Users should be able to upload documents when they have sufficient tokens

## Related Files
- `src/components/documents/FileUploader.tsx` - Frontend upload component
- `src/lib/supabase.ts` - Token validation functions
- `supabase/functions/stripe-webhook/index.ts` - Token purchase processing
- `supabase/migrations/20250622120000_token_system_migration.sql` - Original token system
- `supabase/migrations/20250801000000_fix_function_search_path_warnings.sql` - Function fixes