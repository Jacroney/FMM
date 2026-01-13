# Chapter Onboarding Runbook

This document describes the process for onboarding a new fraternity chapter to Greek Pay.

## Prerequisites

- Access to the Supabase Dashboard (https://supabase.com/dashboard)
- Access to the production database
- The new chapter's information:
  - Chapter name (e.g., "Nu-Alpha Chapter")
  - School name (e.g., "Cal Poly San Luis Obispo")
  - Fraternity organization (e.g., "Sigma Chi")
  - First admin's email address

## Step 1: Create the Chapter Record

Run this SQL in the Supabase SQL Editor:

```sql
-- Create a new chapter
INSERT INTO chapters (
  id,
  name,
  school,
  member_count,
  fraternity_id
) VALUES (
  gen_random_uuid(),
  'YOUR_CHAPTER_NAME',      -- e.g., 'Beta-Gamma Chapter'
  'YOUR_SCHOOL_NAME',       -- e.g., 'University of Michigan'
  0,                        -- Initial member count
  NULL                      -- Or link to fraternity if exists
)
RETURNING id, name, school;
```

**Save the returned chapter ID** - you'll need it for the next steps.

## Step 2: Create the First Admin User

### Option A: Using Supabase Auth Dashboard

1. Go to Supabase Dashboard > Authentication > Users
2. Click "Add User" > "Create New User"
3. Enter the admin's email and a temporary password
4. Note the created user's UUID

### Option B: Using Invitation System (Recommended)

Have the admin sign up through the normal invitation flow:

```sql
-- Create an admin invitation
INSERT INTO member_invitations (
  id,
  chapter_id,
  email,
  first_name,
  last_name,
  year,
  status,
  invitation_token,
  invitation_expires_at
) VALUES (
  gen_random_uuid(),
  'CHAPTER_ID_FROM_STEP_1',
  'admin@example.edu',
  'John',
  'Doe',
  4,  -- Year in school (or appropriate value)
  'pending',
  gen_random_uuid(),
  NOW() + INTERVAL '30 days'
)
RETURNING id, invitation_token;
```

Then send them the signup link: `https://greekpay.org/signup?token=INVITATION_TOKEN`

## Step 3: Assign Admin Role

After the user has signed up, update their role to admin:

```sql
-- Update user role to admin
UPDATE user_profiles
SET role = 'admin'
WHERE email = 'admin@example.edu'
  AND chapter_id = 'CHAPTER_ID_FROM_STEP_1';

-- Verify the update
SELECT id, email, full_name, role, chapter_id
FROM user_profiles
WHERE email = 'admin@example.edu';
```

## Step 4: Communicate with the New Chapter

Send the chapter admin:

1. **Login URL**: https://greekpay.org/login
2. **Setup checklist** (see below)
3. **Support contact**: joseph@greekpay.org

## Chapter Admin Setup Checklist

Once the chapter admin has access, they need to complete:

- [ ] **Stripe Connect Setup** (Settings > Payments)
  - Business type: Non-profit
  - Required info: EIN, bank account, authorized officer details
  - Wait for Stripe verification (usually 1-2 business days)

- [ ] **Dues Configuration** (Dues > Configure)
  - Set period name (e.g., "Winter 2026")
  - Set period type (Quarter/Semester/Year)
  - Set dues amounts per year
  - Configure late fees (if applicable)
  - Set due date

- [ ] **Import Members** (Members > Import CSV)
  - Upload CSV with: first_name, last_name, email, year
  - Review and confirm import
  - Invitations will be sent automatically

- [ ] **Assign Dues** (Dues > Assign)
  - Select members and dues configuration
  - Assign dues to members

## Verification Checklist

After setup, verify:

- [ ] Chapter admin can log in
- [ ] Stripe Connect is fully onboarded (charges_enabled = true)
- [ ] At least one dues configuration exists
- [ ] Members have been imported
- [ ] Test dues invitation email is received

## Troubleshooting

### User can't log in
- Check if user exists in Supabase Auth dashboard
- Verify user_profile was created with correct chapter_id
- Check for password reset if needed

### Stripe Connect issues
- Verify Stripe account status via API or dashboard
- Check for missing required information
- Ensure business type is set to "non_profit"

### Dues not showing
- Verify dues_configuration exists for the chapter
- Check if dues have been assigned to members
- Ensure config is marked as `is_current = true`

### Invitation emails not sending
- Check email_queue table for errors
- Verify Resend API key is configured
- Check Supabase edge function logs

## Database Quick Reference

```sql
-- Find chapter by name
SELECT * FROM chapters WHERE name ILIKE '%chapter_name%';

-- Find user by email
SELECT * FROM user_profiles WHERE email = 'user@example.edu';

-- Check chapter's dues configurations
SELECT * FROM dues_configuration WHERE chapter_id = 'CHAPTER_ID';

-- Check Stripe Connect status
SELECT * FROM stripe_connected_accounts WHERE chapter_id = 'CHAPTER_ID';

-- Count members with dues
SELECT COUNT(*) FROM member_dues WHERE chapter_id = 'CHAPTER_ID';

-- Check recent invitations
SELECT email, status, invitation_email_status, created_at
FROM member_invitations
WHERE chapter_id = 'CHAPTER_ID'
ORDER BY created_at DESC
LIMIT 10;
```

## Support

For issues not covered here, contact the development team or check the edge function logs in Supabase dashboard.
