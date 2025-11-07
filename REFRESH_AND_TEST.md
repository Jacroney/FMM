# Refresh Supabase and Test Payment Recording

## Migration Applied ✅

Migration `20250130000004_ensure_record_payment_works.sql` has been applied successfully.

---

## IMPORTANT: Refresh Schema Cache

Supabase caches the database schema. You need to force it to recognize the new function.

### Method 1: Wait (Easiest)
Just wait 1-2 minutes for Supabase to automatically refresh its schema cache.

### Method 2: Manual Refresh in Dashboard

1. Go to https://supabase.com/dashboard/project/ffgeptjhhhifuuhjlsow
2. Navigate to **Database** → **Functions** in the left sidebar
3. Look for `record_dues_payment` in the list
4. If you don't see it, click the refresh icon or reload the page

### Method 3: Run SQL Command

Go to **SQL Editor** and run:
```sql
NOTIFY pgrst, 'reload schema';
```

This forces PostgREST (Supabase's API layer) to reload the schema immediately.

---

## Then Test Payment Recording

After refreshing (or waiting 1-2 minutes):

1. **Refresh your application** in the browser (Ctrl+R or Cmd+R)
2. Navigate to **Dues** page
3. Find any member with pending dues
4. Click **"Record"** button
5. Fill in payment details
6. Click **"Record Payment"**

**Expected Result**: ✅ Payment records successfully, no 404 error!

---

## If Still Getting 404 Error

Try these steps in order:

### Step 1: Verify Function Exists

Run this in Supabase SQL Editor:
```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'record_dues_payment';
```

**Should return**: 1 row showing the function exists

### Step 2: Test Function Directly

Replace the UUIDs with real values from your database:
```sql
-- First, get a real member_dues_id
SELECT id, member_id, balance
FROM member_dues
WHERE balance > 0
LIMIT 1;

-- Then test the function (use the id from above)
SELECT record_dues_payment(
  '<member_dues_id_from_above>',  -- Replace with actual UUID
  10.00,                           -- Amount
  'Cash',                          -- Payment method
  CURRENT_DATE,                    -- Payment date
  'TEST-123',                      -- Reference
  'Test payment'                   -- Notes
);
```

**Should return**: JSON with `"success": true`

### Step 3: Check Permissions

```sql
-- Check if authenticated users can execute the function
SELECT
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'record_dues_payment';
```

**Should show**: `authenticated` and `anon` with `EXECUTE` privilege

### Step 4: Force Schema Reload

```sql
-- Force reload multiple times
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload schema';
```

Then wait 30 seconds and try again in your app.

---

## Debugging Info

If the function works in SQL Editor but not in the app:

1. **Check Browser Console** for the exact error
2. **Check Network Tab**:
   - Look for the request to `/rest/v1/rpc/record_dues_payment`
   - Check the request payload
   - Check the response

3. **Common Issues**:
   - **Cached 404**: Clear browser cache or try incognito mode
   - **Wrong parameters**: Check that duesService.ts is sending correct param names
   - **RLS blocking**: Check RLS policies on `dues_payments` table

---

## What the Migration Did

1. ✅ Ensured `dues_payments` table exists
2. ✅ Added missing columns (`recorded_by`, `payment_method`, `reference_number`, `notes`)
3. ✅ Dropped old function (if existed)
4. ✅ Created new `record_dues_payment()` function
5. ✅ Granted EXECUTE permissions to `authenticated` and `anon` roles
6. ✅ Sent NOTIFY to reload schema cache

---

## Quick Test SQL

Run this in SQL Editor to verify everything:

```sql
-- 1. Function exists?
SELECT COUNT(*) as function_exists
FROM information_schema.routines
WHERE routine_name = 'record_dues_payment';
-- Should return: 1

-- 2. Table has all columns?
SELECT COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'dues_payments';
-- Should return: 14 or more

-- 3. Can call the function?
SELECT record_dues_payment(
  '00000000-0000-0000-0000-000000000000',  -- Will fail but tests if function is callable
  10.00
);
-- Should return error "Member dues record not found" (this is good - function exists!)
```

---

## Alternative: Direct SQL Insert (Temporary Workaround)

If you need to record a payment urgently while debugging:

```sql
-- Get the member_dues info
SELECT id, member_id, chapter_id, balance, amount_paid
FROM member_dues
WHERE id = '<your_member_dues_id>';

-- Insert payment manually
INSERT INTO dues_payments (
  member_dues_id,
  member_id,
  chapter_id,
  amount,
  payment_method,
  payment_date,
  recorded_by
) VALUES (
  '<member_dues_id>',
  '<member_id>',
  '<chapter_id>',
  50.00,
  'Cash',
  CURRENT_DATE,
  auth.uid()
);

-- Update the dues balance manually
UPDATE member_dues
SET
  amount_paid = amount_paid + 50.00,
  balance = balance - 50.00,
  status = CASE
    WHEN balance - 50.00 <= 0 THEN 'paid'
    ELSE 'partial'
  END
WHERE id = '<member_dues_id>';
```

---

## Next Steps

1. ⏳ **Wait 1-2 minutes** for schema cache to refresh
2. 🔄 **Refresh your browser** application
3. 🧪 **Test payment recording**
4. ✅ **Verify it works**

If still having issues after trying all steps above, the problem might be elsewhere (RLS policies, network, etc.)

---

**Created**: 2025-11-06
**Migration**: `20250130000004_ensure_record_payment_works.sql`
**Status**: ✅ Applied to database
