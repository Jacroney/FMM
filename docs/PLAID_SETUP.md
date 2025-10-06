# Plaid Integration Setup Guide

Complete guide to setting up automatic bank transaction syncing with Plaid.

## 📋 Prerequisites

1. Plaid account (sign up at [dashboard.plaid.com](https://dashboard.plaid.com))
2. Supabase project with CLI installed
3. Node.js and npm installed

## 🚀 Quick Start

### Step 1: Get Plaid Credentials

1. Sign up for a free Plaid account at [dashboard.plaid.com](https://dashboard.plaid.com)
2. Create a new application
3. Get your credentials:
   - **Client ID** (found in Dashboard → Team Settings → Keys)
   - **Sandbox Secret** (for testing)
   - **Development/Production Secret** (for live use)

### Step 2: Database Setup

Run the SQL migrations to create required tables:

```bash
# Run in Supabase SQL Editor or via CLI
npx supabase db push

# Or manually execute these files in order:
# 1. staging_reconciliation.sql
# 2. plaid_setup.sql
```

**Tables created:**
- `plaid_connections` - Stores bank account connections
- `plaid_sync_history` - Audit log of sync operations
- `plaid_txn_staging` - Staging table for Plaid transactions
- `transaction_staging` - Generic staging table
- `switch_txn_staging` - Switch payment staging
- `category_rules` - Auto-categorization rules
- `ingestion_audit` - Reconciliation audit log

### Step 3: Configure Environment Variables

#### Frontend (.env)

Add to your `.env` file:

```bash
# Existing Supabase config
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Add Plaid config
VITE_PLAID_CLIENT_ID=your_plaid_client_id
VITE_PLAID_ENV=sandbox  # or development/production
```

#### Backend (Supabase Edge Function Secrets)

Set secrets for your Edge Function:

```bash
npx supabase secrets set PLAID_CLIENT_ID=your_plaid_client_id
npx supabase secrets set PLAID_SECRET=your_plaid_secret
npx supabase secrets set PLAID_ENV=sandbox
```

### Step 4: Deploy Edge Function

Deploy the Plaid sync function to Supabase:

```bash
npx supabase functions deploy plaid-sync
```

**Verify deployment:**
```bash
npx supabase functions list
```

### Step 5: Add Route to App

Add the Plaid Sync page to your router in `src/App.tsx`:

```typescript
import { PlaidSync } from './pages/PlaidSync';

// In your routes:
<Route path="/plaid-sync" element={<PlaidSync />} />
```

Add navigation link in your sidebar/nav:

```typescript
// In src/components/Sidebar.tsx or Navigation
<NavLink to="/plaid-sync">
  <Building2 className="h-5 w-5" />
  Bank Sync
</NavLink>
```

## 📖 How It Works

### Flow Overview

```
1. User clicks "Link Bank Account"
   ↓
2. Plaid Link modal opens (user selects bank & logs in)
   ↓
3. Plaid returns public_token
   ↓
4. Exchange public_token → access_token (stored securely in DB)
   ↓
5. Sync transactions → plaid_txn_staging table
   ↓
6. Run reconciliation → moves to expenses table
   ↓
7. Transactions appear in your app!
```

### Database Flow

```
Plaid API
  ↓
plaid_txn_staging (raw transactions)
  ↓
fn_reconcile_staging() (de-dupe, categorize)
  ↓
expenses (canonical transactions)
```

## 🎯 Usage

### Connect a Bank Account

1. Navigate to `/plaid-sync`
2. Click "Link Bank Account"
3. Select your bank and log in via Plaid Link
4. Transactions will automatically sync and process

### Manual Sync

- **Single Account**: Click the refresh icon next to a connection
- **All Accounts**: Click "Sync All" button
- **Auto Reconcile**: New transactions are automatically processed

### View Sync History

The Plaid Sync page shows:
- Connected accounts
- Last sync time
- Unprocessed transactions count
- Recent sync history with stats

## 🔧 Advanced Configuration

### Auto-Categorization Rules

Add rules to automatically categorize transactions:

```sql
INSERT INTO category_rules (source, merchant_pattern, category, priority) VALUES
  ('PLAID', '(?i)(amazon|amzn)', 'Office Supplies', 10),
  ('PLAID', '(?i)(uber|lyft)', 'Transportation', 10),
  ('PLAID', '(?i)(restaurant|pizza|chipotle)', 'Food & Dining', 10),
  ('PLAID', '(?i)(venmo|paypal)', 'Transfers', 5);
```

**Pattern syntax**: PostgreSQL regex (case-insensitive with `(?i)`)

### Scheduled Auto-Sync

Set up automatic syncing with Supabase pg_cron:

```sql
-- Sync all connections every 6 hours
SELECT cron.schedule(
  'plaid-auto-sync',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/plaid-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb,
    body := '{"action": "sync_all"}'::jsonb
  )
  $$
);
```

### Webhook Setup (Optional)

Configure Plaid webhooks for real-time updates:

1. Create webhook endpoint in Supabase Edge Function
2. Add webhook URL in Plaid Dashboard:
   ```
   https://your-project.supabase.co/functions/v1/plaid-webhook
   ```
3. Handle webhook events (transactions update, item error, etc.)

## 🐛 Troubleshooting

### "Unauthorized" Error

**Cause**: User doesn't have access to the chapter
**Fix**: Verify `user_profiles.chapter_id` matches the chapter you're trying to sync

### Transactions Not Appearing

**Possible causes:**
1. Staging data not reconciled → Click "Process Now" on unprocessed count
2. Duplicate transactions → Check `hash` field for de-duplication
3. Missing category/period → Check logs in `ingestion_audit` table

**Debug query:**
```sql
-- View unprocessed staging records
SELECT * FROM unprocessed_staging_v WHERE chapter_id = 'your-chapter-id';

-- Check reconciliation errors
SELECT * FROM ingestion_audit
WHERE chapter_id = 'your-chapter-id'
ORDER BY started_at DESC LIMIT 10;
```

### Connection Fails

**Plaid sandbox limitations:**
- Use test credentials: `user_good` / `pass_good`
- Sandbox only supports test institutions
- For production, upgrade to Development/Production environment

### Edge Function Timeout

**Cause**: Large sync taking >60 seconds
**Fix**: Sync incrementally using cursor-based pagination (already implemented)

## 📊 Monitoring

### Check Sync Status

```sql
-- Recent syncs
SELECT
  psh.*,
  pc.institution_name
FROM plaid_sync_history psh
JOIN plaid_connections pc ON pc.id = psh.connection_id
WHERE psh.chapter_id = 'your-chapter-id'
ORDER BY psh.started_at DESC
LIMIT 20;
```

### View Staging Data

```sql
-- Unprocessed transactions
SELECT * FROM plaid_txn_staging
WHERE chapter_id = 'your-chapter-id'
  AND status = 'new'
ORDER BY ingested_at DESC;
```

### Reconciliation Audit

```sql
-- Check reconciliation results
SELECT * FROM ingestion_audit
WHERE chapter_id = 'your-chapter-id'
ORDER BY started_at DESC
LIMIT 10;
```

## 🔒 Security Notes

1. **Access Tokens**: Stored encrypted in `plaid_connections` table
2. **RLS Policies**: Chapter-scoped isolation enforced
3. **Edge Function**: Validates user auth + chapter access
4. **Secrets**: Never expose `PLAID_SECRET` in frontend code

## 🎓 Testing in Sandbox

Plaid provides test credentials for sandbox:

**Test Institution**: "Chase" (or any test bank)
**Username**: `user_good`
**Password**: `pass_good`
**MFA**: `1234`

## 📚 API Reference

### PlaidService Methods

```typescript
// Create link token
PlaidService.createLinkToken(chapterId: string): Promise<string>

// Exchange public token for access token
PlaidService.exchangeToken(publicToken: string, chapterId: string)

// Sync transactions for a connection
PlaidService.syncTransactions(connectionId: string, chapterId: string)

// Sync all active connections
PlaidService.syncAll(chapterId: string)

// Get all connections
PlaidService.getConnections(chapterId: string): Promise<PlaidConnection[]>

// Deactivate connection
PlaidService.deactivateConnection(connectionId: string, chapterId: string)

// Reconcile staging → expenses
PlaidService.reconcile(chapterId: string, stagingTable?: string)

// Get unprocessed staging records
PlaidService.getUnprocessedStaging(chapterId: string)

// Get sync history
PlaidService.getSyncHistory(chapterId: string, limit?: number)
```

## 🎉 Success Checklist

- [ ] Plaid account created
- [ ] Database migrations run (staging_reconciliation.sql, plaid_setup.sql)
- [ ] Environment variables configured (.env + Supabase secrets)
- [ ] Edge function deployed
- [ ] Route added to app
- [ ] Test bank account connected
- [ ] Transactions synced successfully
- [ ] Category rules configured (optional)
- [ ] Scheduled sync setup (optional)

## 🆘 Support

- **Plaid Docs**: [plaid.com/docs](https://plaid.com/docs)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Issues**: Check `plaid_sync_history` and `ingestion_audit` tables for error logs
