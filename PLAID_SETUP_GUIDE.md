# Plaid Integration Setup Guide

This guide will help you set up and deploy the Plaid bank integration for read-only access to bank account balances and transactions.

## Prerequisites

1. Plaid Account (sign up at https://plaid.com)
2. Supabase project configured
3. Access to Supabase CLI

## Step 1: Get Plaid Credentials

1. Log in to your Plaid Dashboard (https://dashboard.plaid.com)
2. Navigate to **Team Settings** > **Keys**
3. Copy your:
   - `client_id`
   - `secret` for the environment you're using (sandbox, development, or production)

## Step 2: Update Environment Variables

### Local Development (.env file)

Update your `.env` file with complete Plaid credentials:

```env
# Existing Supabase config
VITE_SUPABASE_URL=https://ffgeptjhhhifuuhjlsow.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Plaid Configuration
VITE_PLAID_CLIENT_ID=your_plaid_client_id_here
VITE_PLAID_ENV=sandbox  # or 'development' or 'production'

# Note: PLAID_SECRET should NOT be in .env as it's only used server-side
```

### Supabase Edge Function Secrets

The Plaid secret key must be stored securely in Supabase and NOT in your frontend code:

```bash
# Set the Plaid secret (replace with your actual secret)
supabase secrets set PLAID_SECRET=your_plaid_secret_here

# Set the Plaid client ID (server-side)
supabase secrets set PLAID_CLIENT_ID=your_plaid_client_id_here

# Set the Plaid environment
supabase secrets set PLAID_ENV=sandbox
```

To verify your secrets:
```bash
supabase secrets list
```

## Step 3: Run Database Migration

Run the Plaid integration migration to create the necessary tables:

```bash
# If using Supabase CLI locally
supabase db push

# Or run the migration directly on your hosted database
# Go to your Supabase Dashboard > SQL Editor
# Copy the contents of supabase/migrations/20250110000001_plaid_integration.sql
# Execute it
```

You can also run it via command line:
```bash
supabase db execute --file supabase/migrations/20250110000001_plaid_integration.sql
```

## Step 4: Deploy Edge Functions

Deploy the three Plaid edge functions to Supabase:

```bash
# Deploy all three functions
supabase functions deploy plaid-create-link-token
supabase functions deploy plaid-exchange-token
supabase functions deploy plaid-sync-transactions

# Or deploy all at once
supabase functions deploy
```

## Step 5: Verify Function Deployment

Check that your functions are deployed:

```bash
supabase functions list
```

You should see:
- `plaid-create-link-token`
- `plaid-exchange-token`
- `plaid-sync-transactions`

## Step 6: Test the Integration

### Option A: Use the UI

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the **Bank Account Sync** page (Plaid Sync)

3. Click **Connect Bank Account**

4. In Plaid's sandbox environment, use these test credentials:
   - Username: `user_good`
   - Password: `pass_good`

5. Select accounts to link

6. After successful connection, you should see:
   - Connected institution
   - Account balances
   - Ability to sync transactions

### Option B: Test Edge Functions Directly

Create a link token:
```bash
curl -X POST 'https://ffgeptjhhhifuuhjlsow.supabase.co/functions/v1/plaid-create-link-token' \
  -H 'Authorization: Bearer YOUR_USER_JWT_TOKEN' \
  -H 'Content-Type: application/json'
```

## Step 7: Plaid Environment Progression

### Sandbox (Development)
- Use for development and testing
- Test credentials: `user_good` / `pass_good`
- No real bank connections
- **Current setup**: Sandbox

### Development (Pre-Production)
- Test with real credentials
- Limited to 100 Items
- Requires approval from Plaid
- Set `PLAID_ENV=development`

### Production (Live)
- Real bank connections
- Requires Plaid Production approval
- Set `PLAID_ENV=production`
- **Important**: Get security review from Plaid first

## Step 8: Security Checklist

- [x] Plaid secret is stored in Supabase secrets (NOT in frontend .env)
- [x] RLS policies are enabled on all Plaid tables
- [x] Access tokens are stored server-side only
- [x] Edge functions validate user authentication
- [x] Connections are chapter-scoped (multi-tenant safe)

## Troubleshooting

### Issue: Link token creation fails

**Solution**: Check that Plaid secrets are set correctly:
```bash
supabase secrets list
```

### Issue: "Invalid credentials" error

**Solution**:
1. Verify your Plaid environment matches your secret (sandbox secret only works with sandbox)
2. Check that client_id and secret are from the same environment

### Issue: No transactions syncing

**Solution**:
1. Check that the migration ran successfully
2. Verify category rules exist in `category_rules` table
3. Check that the chapter has at least one budget period and category

### Issue: RLS policy errors

**Solution**: Make sure `user_profiles` table has the `chapter_id` for the current user

## Testing with Sandbox Credentials

Plaid provides test credentials for sandbox testing:

| Institution | Username | Password | Result |
|------------|----------|----------|---------|
| First Platypus Bank | `user_good` | `pass_good` | Success |
| First Platypus Bank | `user_bad` | `pass_good` | Invalid credentials |
| Tartan Bank | `user_good` | `pass_good` | Success with checking/savings |

## Production Checklist

Before going to production:

1. **Get Plaid Production Access**
   - Apply at https://dashboard.plaid.com
   - Complete security questionnaire
   - May require SOC 2 compliance

2. **Update Environment Variables**
   - Change `PLAID_ENV` to `production`
   - Use production secret key
   - Update secrets in Supabase

3. **Security Review**
   - Ensure access tokens are encrypted
   - Consider using Supabase Vault for sensitive data
   - Audit RLS policies

4. **Monitor Usage**
   - Check Plaid dashboard for API usage
   - Set up error monitoring
   - Monitor sync history table

## API Rate Limits

Plaid has rate limits by environment:

- **Sandbox**: Unlimited
- **Development**: 100 requests/minute
- **Production**: 600 requests/minute (can request increase)

## Cost Considerations

- **Development**: Free for up to 100 Items
- **Production**: Pay per Item per month
  - Transactions: ~$0.25/Item/month
  - Auth: ~$0.05/Item/month

## Support

- Plaid Documentation: https://plaid.com/docs
- Plaid Support: https://dashboard.plaid.com/support
- Supabase Docs: https://supabase.com/docs

## Next Steps

Once setup is complete:

1. Test with sandbox credentials
2. Verify transactions are auto-categorized correctly
3. Adjust category rules if needed
4. Test manual sync functionality
5. Consider setting up automated daily sync via cron job

## Optional: Set Up Daily Auto-Sync

Create a cron job edge function (optional):

```bash
# Create a new edge function
supabase functions new plaid-daily-sync

# Add cron trigger in Supabase Dashboard
# Cron: 0 2 * * * (runs daily at 2am)
```

## Files Created/Modified

**Database:**
- `supabase/migrations/20250110000001_plaid_integration.sql`

**Edge Functions:**
- `supabase/functions/plaid-create-link-token/index.ts`
- `supabase/functions/plaid-exchange-token/index.ts`
- `supabase/functions/plaid-sync-transactions/index.ts`

**Frontend:**
- `src/services/plaidService.ts`
- `src/services/types.ts` (added Plaid types)
- `src/components/PlaidLink.tsx`
- `src/pages/PlaidSync.tsx`
- `src/components/Dashboard.tsx` (added bank balance card)

**Configuration:**
- `.env` (updated with Plaid client ID and env)
