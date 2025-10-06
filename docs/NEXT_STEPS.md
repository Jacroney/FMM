# 🚀 Plaid Integration - Final Setup Steps

## ✅ What's Been Done

1. ✅ Installed Supabase CLI
2. ✅ Initialized Supabase project
3. ✅ Created all Plaid integration files
4. ✅ Added PlaidSync route to App.jsx
5. ✅ Added "Bank Sync" to sidebar navigation
6. ✅ Installed Plaid dependencies (plaid, react-plaid-link)

## 📋 What You Need to Do (10-15 minutes)

### Step 1: Get Plaid Credentials (5 min)

1. Go to https://dashboard.plaid.com/signup
2. Sign up for a free account
3. Create a new application
4. Get your credentials:
   - **Client ID** - Copy this
   - **Sandbox Secret** - Copy this

### Step 2: Run Database Migrations (3 min)

1. Open Supabase Dashboard: https://ffgeptjhhhifuuhjlsow.supabase.co
2. Click "SQL Editor" in left sidebar
3. Click "New Query"
4. Copy and paste **`staging_reconciliation.sql`** → Click Run
5. Click "New Query" again
6. Copy and paste **`plaid_setup.sql`** → Click Run

### Step 3: Deploy Edge Function (3 min)

1. Get your Supabase Access Token:
   - Go to https://supabase.com/dashboard/account/tokens
   - Click "Generate new token"
   - Copy the token

2. Run these commands in your terminal:

```bash
# Login to Supabase
export SUPABASE_ACCESS_TOKEN=your_token_here

# Link to your project
supabase link --project-ref ffgeptjhhhifuuhjlsow

# Set Plaid secrets (use your credentials from Step 1)
supabase secrets set PLAID_CLIENT_ID=your_plaid_client_id
supabase secrets set PLAID_SECRET=your_plaid_secret
supabase secrets set PLAID_ENV=sandbox

# Deploy the edge function
supabase functions deploy plaid-sync
```

### Step 4: Update Environment Variables (1 min)

Add these to your `.env` file:

```bash
# Add these lines to .env
VITE_PLAID_CLIENT_ID=your_plaid_client_id_here
VITE_PLAID_ENV=sandbox
```

### Step 5: Test It! (3 min)

1. Start your dev server:
```bash
npm run dev
```

2. Open http://localhost:5173 (or your dev URL)

3. Login to your app

4. Click "Bank Sync" in the sidebar

5. Click "Link Bank Account"

6. Use Plaid test credentials:
   - Institution: Search for "First Platypus Bank" or "Chase"
   - Username: `user_good`
   - Password: `pass_good`
   - MFA Code: `1234`

7. Watch transactions sync automatically! 🎉

## 🎯 Quick Command Reference

```bash
# If you need to redeploy the edge function later
supabase functions deploy plaid-sync

# View edge function logs
supabase functions logs plaid-sync

# Run database migrations (if you have supabase CLI setup)
supabase db push

# Check Plaid secrets
supabase secrets list
```

## 🐛 Troubleshooting

### "Function not found" error
→ Make sure you deployed the edge function: `supabase functions deploy plaid-sync`

### "Unauthorized" error
→ Check that Plaid secrets are set correctly: `supabase secrets list`

### Transactions not showing up
→ Click the "Process Now" button in the Plaid Sync page to reconcile staging data

### Can't connect to bank
→ Make sure you're using sandbox credentials: `user_good` / `pass_good` / `1234`

## 📚 Documentation

- **Full Setup Guide**: `PLAID_SETUP.md`
- **Implementation Details**: `PLAID_IMPLEMENTATION_SUMMARY.md`
- **Database Schema**: `staging_reconciliation.sql` and `plaid_setup.sql`

## 🎉 Success Checklist

- [ ] Plaid account created
- [ ] Client ID and Secret copied
- [ ] Database migrations run (`staging_reconciliation.sql` + `plaid_setup.sql`)
- [ ] Edge function deployed
- [ ] `.env` updated with Plaid credentials
- [ ] Test bank account connected
- [ ] Transactions synced successfully

Once all checked, you're fully set up! 🚀

## 💡 What's Next?

After testing with sandbox:

1. **Add Category Rules** - Auto-categorize transactions:
```sql
INSERT INTO category_rules (source, merchant_pattern, category, priority) VALUES
  ('PLAID', '(?i)(amazon|amzn)', 'Office Supplies', 10),
  ('PLAID', '(?i)(uber|lyft)', 'Transportation', 10),
  ('PLAID', '(?i)(chipotle|pizza)', 'Food & Dining', 10);
```

2. **Upgrade to Development** - For real bank connections:
   - Get Development credentials from Plaid
   - Update secrets: `supabase secrets set PLAID_ENV=development`

3. **Set up Auto-Sync** - Schedule automatic syncing every 6 hours (see `PLAID_SETUP.md`)

## 🆘 Need Help?

- Check `PLAID_SETUP.md` for detailed documentation
- View sync history in the "Bank Sync" page
- Check `ingestion_audit` table for reconciliation errors
- Check edge function logs: `supabase functions logs plaid-sync`
