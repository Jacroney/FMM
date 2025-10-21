# Plaid Production Operations Guide

## Table of Contents
1. [Production Setup](#production-setup)
2. [Security Checklist](#security-checklist)
3. [Environment Configuration](#environment-configuration)
4. [Testing Protocol](#testing-protocol)
5. [Monitoring & Alerts](#monitoring--alerts)
6. [Troubleshooting](#troubleshooting)
7. [Incident Response](#incident-response)
8. [Rollback Procedures](#rollback-procedures)

---

## Production Setup

### 1. Plaid Dashboard Configuration

**Access Your Production Credentials:**
1. Log in to [Plaid Dashboard](https://dashboard.plaid.com)
2. Navigate to **Team Settings → Keys**
3. Enable **Production** access
4. Copy your production `client_id` and `secret`

**Configure Allowed Domains:**
1. In Plaid Dashboard, go to **API → Allowed redirect URIs**
2. Add your production domain(s):
   - `https://your-domain.com`
   - `https://app.your-domain.com`
3. Save changes

**Configure Webhook URL (Optional but Recommended):**
1. Go to **API → Webhooks**
2. Set webhook URL: `https://YOUR-SUPABASE-PROJECT.supabase.co/functions/v1/plaid-webhook`
3. Note: Webhook handler is configured but not yet implemented

**Verify Products:**
1. Go to **Products**
2. Ensure **Transactions** is enabled
3. Review and accept any production agreements

---

## Security Checklist

### Before Going Live:

- [ ] **Never commit secrets to git**
  - Verify `.env` is in `.gitignore`
  - Check git history for accidentally committed secrets: `git log --all --full-history -- .env`

- [ ] **Production secrets are set in Supabase Secrets only**
  - Verify: `supabase secrets list` (should show PLAID_SECRET_PRODUCTION)
  - Secrets should NEVER be in frontend code or .env files

- [ ] **RLS policies are active on all Plaid tables**
  ```sql
  -- Verify RLS is enabled
  SELECT tablename, rowsecurity
  FROM pg_tables
  WHERE tablename IN ('plaid_connections', 'plaid_accounts', 'plaid_sync_history');
  -- All should show rowsecurity = true
  ```

- [ ] **Access tokens are encrypted at rest**
  - Supabase handles encryption automatically
  - Verify column type: `SELECT data_type FROM information_schema.columns WHERE table_name = 'plaid_connections' AND column_name = 'access_token';`

- [ ] **Error messages don't leak sensitive data**
  - All edge functions use `sanitizeError()` helper
  - Plaid API errors are logged server-side only

- [ ] **Frontend only has public client IDs**
  - Check `.env` file - should only contain `VITE_PLAID_CLIENT_ID_*`
  - Verify no `PLAID_SECRET` in frontend files: `grep -r "PLAID_SECRET" src/`

- [ ] **Role-based access control is enforced**
  - Only admin and exec roles can create Plaid connections
  - Verify: `requireAdminOrExec()` is called in all edge functions

---

## Environment Configuration

### Supabase Secrets (Backend)

Set these secrets via Supabase CLI:

```bash
# Production credentials (REQUIRED for production mode)
supabase secrets set PLAID_CLIENT_ID_PRODUCTION="your-production-client-id"
supabase secrets set PLAID_SECRET_PRODUCTION="your-production-secret"

# Sandbox credentials (keep for testing)
supabase secrets set PLAID_CLIENT_ID="your-sandbox-client-id"
supabase secrets set PLAID_SECRET="your-sandbox-secret"
```

**Verify secrets are set:**
```bash
supabase secrets list
```

### Frontend Environment (.env)

Update your `.env` file (NOT committed to git):

```bash
# Supabase
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"

# Plaid - Frontend Configuration
VITE_PLAID_CLIENT_ID_SANDBOX="your-sandbox-client-id"
VITE_PLAID_CLIENT_ID_PRODUCTION="your-production-client-id"
VITE_PLAID_ENV="production"  # Set to "production" for live mode

# NEVER ADD PLAID_SECRET HERE - IT MUST ONLY BE IN SUPABASE SECRETS
```

**Deploy frontend with new env vars:**
```bash
npm run build
# Deploy to your hosting platform (Vercel, Netlify, etc.)
```

### Database Migration

Run the environment tracking migration:

```bash
# Run migration to add environment column
npx supabase db push

# Or if using remote database
npx supabase migration up
```

**Verify migration:**
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'plaid_connections' AND column_name = 'environment';
```

---

## Testing Protocol

### Phase 1: Sandbox Testing (Do This First!)

1. **Set environment to sandbox:**
   - In UI, toggle to "Sandbox (Test)" mode
   - Or set `VITE_PLAID_ENV="sandbox"` in .env

2. **Test full flow:**
   ```
   ✓ Create link token (sandbox)
   ✓ Connect test bank account (use Plaid sandbox credentials)
   ✓ Exchange token successfully
   ✓ Verify connection saved with environment='sandbox'
   ✓ Sync transactions
   ✓ Verify transactions imported correctly
   ✓ Disconnect bank account
   ```

3. **Verify data isolation:**
   ```sql
   -- Check that sandbox connections are properly tagged
   SELECT institution_name, environment, created_at
   FROM plaid_connections
   WHERE environment = 'sandbox';
   ```

### Phase 2: Production Testing (Careful!)

**IMPORTANT: Test with YOUR OWN personal bank account first!**

1. **Set environment to production:**
   - In UI, toggle to "Production" mode
   - Or set `VITE_PLAID_ENV="production"` in .env

2. **Test with your personal account:**
   ```
   ✓ Create link token (production)
   ✓ Connect YOUR real bank account
   ✓ Verify connection saved with environment='production'
   ✓ Sync transactions
   ✓ Verify real transactions imported correctly
   ✓ Check transaction categorization is working
   ✓ Verify balances are accurate
   ✓ Test disconnect (if desired)
   ```

3. **Monitor logs:**
   ```bash
   # Watch edge function logs for errors
   supabase functions logs plaid-create-link-token
   supabase functions logs plaid-exchange-token
   supabase functions logs plaid-sync-transactions
   ```

4. **Verify RLS works:**
   - Try to access another chapter's Plaid data (should fail)
   - Verify non-admin users cannot create connections (should fail)

### Phase 3: User Acceptance Testing

1. **Select beta testers:**
   - Choose 2-3 trusted chapter officers
   - Preferably from different banks/credit unions

2. **Guided testing:**
   - Walk them through connecting their bank
   - Monitor their first sync
   - Collect feedback on accuracy

3. **Monitor for 24-48 hours:**
   - Check for Plaid API errors
   - Verify sync jobs complete successfully
   - Watch for duplicate transactions

---

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Connection Health:**
   ```sql
   -- Active connections by environment
   SELECT environment, COUNT(*) as connection_count
   FROM plaid_connections
   WHERE is_active = true
   GROUP BY environment;

   -- Connections with errors
   SELECT institution_name, error_code, error_message, environment
   FROM plaid_connections
   WHERE error_code IS NOT NULL;
   ```

2. **Sync Performance:**
   ```sql
   -- Recent sync history
   SELECT
     pc.institution_name,
     pc.environment,
     psh.transactions_added,
     psh.sync_status,
     psh.completed_at
   FROM plaid_sync_history psh
   JOIN plaid_connections pc ON pc.id = psh.connection_id
   ORDER BY psh.started_at DESC
   LIMIT 20;

   -- Failed syncs
   SELECT * FROM plaid_sync_history
   WHERE sync_status = 'failed'
   ORDER BY started_at DESC;
   ```

3. **Transaction Volume:**
   ```sql
   -- Transactions imported today
   SELECT COUNT(*) as transactions_today
   FROM expenses
   WHERE source = 'PLAID'
   AND DATE(created_at) = CURRENT_DATE;
   ```

### Set Up Alerts (Recommended)

**Option 1: Supabase Database Webhooks**
- Create webhooks for failed syncs
- Alert on Plaid connections with errors

**Option 2: External Monitoring (Sentry, DataDog, etc.)**
- Monitor edge function error rates
- Track Plaid API response times
- Alert on high failure rates

**Option 3: Manual Monitoring**
- Daily check of error logs
- Weekly review of sync history
- Monthly audit of connection health

---

## Troubleshooting

### Common Issues

#### 1. "Production Plaid credentials not configured"

**Cause:** Production secrets not set in Supabase

**Fix:**
```bash
supabase secrets set PLAID_CLIENT_ID_PRODUCTION="your-client-id"
supabase secrets set PLAID_SECRET_PRODUCTION="your-secret"

# Redeploy edge functions to pick up new secrets
supabase functions deploy plaid-create-link-token
supabase functions deploy plaid-exchange-token
supabase functions deploy plaid-sync-transactions
```

#### 2. "INVALID_REDIRECT_URI" Error

**Cause:** Production domain not allowlisted in Plaid Dashboard

**Fix:**
1. Go to Plaid Dashboard → API → Allowed redirect URIs
2. Add your production domain
3. Try connecting again (may take a few minutes to propagate)

#### 3. Duplicate Transactions

**Cause:** Transaction already exists but UNIQUE constraint on `plaid_transaction_id` may not be enforced

**Fix:**
```sql
-- Check for duplicates
SELECT plaid_transaction_id, COUNT(*) as count
FROM expenses
WHERE plaid_transaction_id IS NOT NULL
GROUP BY plaid_transaction_id
HAVING COUNT(*) > 1;

-- If duplicates exist, keep the oldest and mark others as cancelled
-- (Run this carefully! Test in staging first)
```

#### 4. Connections Showing Errors

**Cause:** Bank requires re-authentication or Plaid API error

**Fix:**
- User needs to disconnect and reconnect the bank
- Check Plaid Dashboard for service status
- Verify production credentials are valid

#### 5. Transactions Not Syncing

**Cause:** Multiple possible causes

**Debug steps:**
```bash
# Check edge function logs
supabase functions logs plaid-sync-transactions --tail

# Check sync history for errors
SELECT * FROM plaid_sync_history
WHERE sync_status = 'failed'
ORDER BY started_at DESC LIMIT 5;

# Verify connection has valid access token
SELECT id, institution_name, error_code, cursor
FROM plaid_connections
WHERE id = 'connection-id-here';
```

---

## Incident Response

### If Production is Down or Compromised:

1. **Immediate Actions (within 5 minutes):**
   - [ ] Switch to sandbox mode: Set `VITE_PLAID_ENV="sandbox"` and redeploy
   - [ ] Disable Plaid UI: Comment out PlaidLink components temporarily
   - [ ] Alert chapter admins via your communication channel

2. **Investigation (within 30 minutes):**
   - [ ] Check edge function logs for errors
   - [ ] Review Plaid Dashboard for API issues
   - [ ] Check database for suspicious activity
   - [ ] Review recent code changes

3. **Communication:**
   - [ ] Post status update in your team channel
   - [ ] If user data affected, follow your incident response plan
   - [ ] Document timeline and root cause

4. **Resolution:**
   - [ ] Fix the underlying issue
   - [ ] Test thoroughly in sandbox first
   - [ ] Gradual rollout to production
   - [ ] Post-mortem and prevention steps

### Security Incident (Suspected Breach):

1. **Immediate:**
   - [ ] Rotate all Plaid secrets immediately
   - [ ] Revoke access tokens (contact Plaid support if needed)
   - [ ] Disable Plaid integration temporarily

2. **Investigation:**
   - [ ] Audit database access logs
   - [ ] Review edge function access logs
   - [ ] Check for unauthorized connections

3. **Recovery:**
   - [ ] Generate new Plaid credentials
   - [ ] Update secrets in Supabase
   - [ ] Notify affected users if required
   - [ ] Implement additional security measures

---

## Rollback Procedures

### Scenario 1: Production Issues - Switch to Sandbox

**Quick Rollback (< 5 minutes):**

```bash
# 1. Update frontend environment
# In your .env file:
VITE_PLAID_ENV="sandbox"

# 2. Redeploy frontend
npm run build
# Deploy to your hosting platform

# 3. (Optional) Hide production toggle in UI
# Temporarily set showEnvironmentToggle={false} in PlaidSync.tsx
```

### Scenario 2: Bad Deployment - Rollback Code

**Git Rollback:**

```bash
# 1. Identify last good commit
git log --oneline

# 2. Revert to last good commit
git revert <bad-commit-hash>

# 3. Push and redeploy
git push origin main

# 4. Redeploy edge functions
supabase functions deploy --project-ref YOUR_PROJECT_REF

# 5. Redeploy frontend
npm run build
# Deploy to hosting platform
```

### Scenario 3: Database Migration Issue

**Rollback Migration:**

```bash
# If using Supabase migrations
supabase migration repair <migration-version> --status reverted

# Manually rollback (if needed)
psql -h YOUR_DB_HOST -U postgres -d postgres

-- Remove environment column if migration failed partway
ALTER TABLE plaid_connections DROP COLUMN IF EXISTS environment;
```

### Scenario 4: Complete Disable of Plaid

**Emergency Shutdown:**

1. **Frontend: Remove Plaid UI**
   ```tsx
   // In PlaidSync.tsx, temporarily comment out:
   // <PlaidLink ... />

   // Show maintenance message instead
   <div>Bank sync temporarily unavailable. Manual entry still works!</div>
   ```

2. **Backend: Disable edge functions** (if absolutely necessary)
   ```bash
   # This stops all Plaid API calls
   # Note: This is drastic, only use in emergencies
   supabase functions delete plaid-create-link-token
   supabase functions delete plaid-exchange-token
   supabase functions delete plaid-sync-transactions
   ```

---

## Appendix: Useful Commands

### Database Queries

```sql
-- View all connections with environment
SELECT id, institution_name, environment, is_active, error_code
FROM plaid_connections
ORDER BY created_at DESC;

-- Count transactions by source
SELECT source, COUNT(*) as count
FROM expenses
GROUP BY source;

-- Recent Plaid sync history
SELECT * FROM plaid_sync_history
ORDER BY started_at DESC
LIMIT 10;

-- Find connections needing re-authentication
SELECT * FROM plaid_connections
WHERE error_code IS NOT NULL
AND is_active = true;
```

### Supabase CLI Commands

```bash
# View secrets (shows names only, not values)
supabase secrets list

# Set a secret
supabase secrets set KEY="value"

# Unset a secret
supabase secrets unset KEY

# View edge function logs
supabase functions logs FUNCTION_NAME

# Deploy all functions
supabase functions deploy --project-ref YOUR_PROJECT

# Run migrations
supabase migration up
```

### Testing Production Credentials

```bash
# Test if credentials work (replace with your values)
curl -X POST https://production.plaid.com/link/token/create \
  -H 'Content-Type: application/json' \
  -H 'PLAID-CLIENT-ID: your-client-id' \
  -H 'PLAID-SECRET: your-secret' \
  -d '{
    "client_name": "Test",
    "user": {"client_user_id": "test"},
    "products": ["transactions"],
    "country_codes": ["US"],
    "language": "en"
  }'

# Should return HTTP 200 with a link_token
```

---

## Support & Resources

**Plaid Resources:**
- Dashboard: https://dashboard.plaid.com
- Documentation: https://plaid.com/docs
- Status Page: https://status.plaid.com
- Support: https://dashboard.plaid.com/support

**Supabase Resources:**
- Dashboard: https://supabase.com/dashboard
- Documentation: https://supabase.com/docs
- Status Page: https://status.supabase.com

**Internal:**
- Development Guide: `docs/PLAID_SETUP.md`
- Implementation Summary: `docs/PLAID_IMPLEMENTATION_SUMMARY.md`
- Migration Files: `supabase/migrations/`

---

**Last Updated:** 2025-01-20

**Version:** 1.0.0

**Maintained by:** Development Team
