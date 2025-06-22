# Token Upload Access Fix

## Issue Description
Users who registered and received their 50 tokens were unable to upload documents because the system showed "Payment Required" even though they had available tokens.

## Root Cause
The `getUserPermissions` function in `src/lib/supabase.ts` was only checking the **payment system** (upload_credits from payments table) and ignoring the **token system** (tokens_available from user_tokens table).

When users register, they receive 50 tokens in the `user_tokens` table, but the permission logic wasn't considering these tokens for upload access.

## Solution Implemented
Updated the `getUserPermissions` function to:

1. **Made it async** to allow token balance checking
2. **Added token balance check** using `getUserTokenBalance(profile.id)`
3. **Updated permission logic** to include tokens:
   - `canUpload = isAdmin || hasActiveSubscription || hasCredits || hasTokens`
   - `canAccessPaidFeatures` now also considers tokens
   - `hasUploadCredits` now includes token availability
   - `uploadCreditsRemaining` now includes token balance

4. **Updated all calling components** to handle async nature:
   - `src/components/ui/AccessControl.tsx`
   - `src/pages/DocumentsPage.tsx`
   - `src/pages/PricingPage.tsx`

## Key Changes
```typescript
// Before
const canUpload = isAdmin || hasActiveSubscription || hasCredits;

// After
const tokenBalance = await getUserTokenBalance(profile.id);
const hasTokens = tokenBalance > 0;
const canUpload = isAdmin || hasActiveSubscription || hasCredits || hasTokens;
```

## Result
- New users with 50 tokens can now upload documents immediately after registration
- Token balance is properly considered in permission calculations
- Upload access works for both payment system credits AND token system tokens
- All existing functionality remains intact

## Files Modified
- `src/lib/supabase.ts` - Updated getUserPermissions function
- `src/components/ui/AccessControl.tsx` - Made async-compatible
- `src/pages/DocumentsPage.tsx` - Made async-compatible  
- `src/pages/PricingPage.tsx` - Made async-compatible

## Testing
After this fix:
1. New user registration grants 50 tokens
2. Users with tokens can access document upload
3. Upload interface shows correct token balance
4. Payment system credits still work as before
5. Subscription users still have unlimited access