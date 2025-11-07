# Data Model Documentation

## Overview
This document explains the relationships between the various user and member tables in the GreekPay application.

## User Authentication & Profile Flow

### 1. User Signup Process
When a user signs up through the application:

```
1. User submits signup form
2. auth.users record is created (Supabase Auth)
3. Trigger automatically creates user_profiles record
4. If signing up via invitation, member_dues are linked
```

### 2. Table Relationships

#### `auth.users` (Supabase Auth Table)
- **Purpose**: Core authentication table managed by Supabase
- **Key Fields**: id, email, encrypted_password, raw_user_meta_data
- **Created**: Automatically when user signs up
- **Note**: This is a Supabase system table

#### `user_profiles` (Application Profile Table)
- **Purpose**: Stores user profile information for authenticated users
- **Key Fields**:
  - `id` (UUID, PK) - Matches auth.users.id
  - `email` (TEXT, NOT NULL)
  - `full_name` (TEXT)
  - `chapter_id` (UUID, FK -> chapters.id)
  - `role` (TEXT) - 'admin', 'exec', 'treasurer', 'member'
  - `phone_number`, `year`, `major`, `position`
- **Created**: Automatically by trigger when auth.users record is inserted
- **Relationship**: 1-to-1 with auth.users (id = auth.uid())

#### `members` (Chapter Member Table)
- **Purpose**: Tracks chapter membership separately from authentication
- **Key Fields**:
  - `id` (UUID, PK) - Can match user_profiles.id for authenticated members
  - `chapter_id` (UUID, FK -> chapters.id)
  - `name` (TEXT, NOT NULL)
  - `email` (TEXT, NOT NULL)
  - `phone`, `year`, `status`
- **Created**: When user signs up via invitation OR manually by admin
- **Relationship**: 1-to-1 with user_profiles (optional, id can match)
- **Note**: Can exist independently for non-authenticated members (guests, alumni, etc.)

#### `member_dues` (Dues Assignment Table)
- **Purpose**: Tracks dues assignments and payments
- **Key Fields**:
  - `id` (UUID, PK)
  - `chapter_id` (UUID, FK -> chapters.id)
  - `member_id` (UUID, FK -> members.id, nullable)
  - `email` (TEXT, nullable)
  - `invitation_token` (UUID) - Used for invitation links
  - `status` - 'pending_invite', 'pending', 'partial', 'paid', 'overdue', 'waived'
- **Created**: When treasurer assigns dues
- **Relationship**: Many-to-1 with members (via member_id)

## Data Flow: Invitation Process

### Scenario: Treasurer assigns dues to a non-existent member

```
1. Treasurer enters email (e.g., john@example.com) and assigns dues
   → member_dues record created with:
     - email = 'john@example.com'
     - member_id = NULL
     - status = 'pending_invite'
     - invitation_token = <generated UUID>

2. Treasurer sends invitation link: /invite?token=<invitation_token>

3. John clicks link and signs up:
   → auth.users record created (id = <user_uuid>)
   → user_profiles record created by trigger (id = <user_uuid>)
   → John is redirected to complete profile

4. After signup, link_member_to_dues_invitation() is called:
   → Fetches John's full_name from user_profiles
   → Creates members record:
     - id = <user_uuid> (same as auth.users.id)
     - email = 'john@example.com'
     - name = 'John Doe' (from user_profiles)
   → Updates member_dues:
     - member_id = <user_uuid>
     - status = 'pending'
   → John can now view and pay his dues
```

## Key Functions

### `handle_new_user()` - Trigger Function
- **When**: Fires after INSERT on auth.users
- **What**: Creates user_profiles record with metadata from signup
- **Migration**: `20250127000009_create_user_profiles_trigger.sql`

### `link_member_to_dues_invitation(p_member_id, p_email, p_invitation_token)`
- **Purpose**: Links a newly signed-up user to their pending dues
- **Process**:
  1. Validates inputs
  2. Fetches user profile from user_profiles
  3. Updates member_dues to link to user
  4. Creates/updates members record
- **Migration**: `20250127000010_fix_link_invitation_with_name.sql`

### `assign_dues_by_email(p_chapter_id, p_email, ...)`
- **Purpose**: Assigns dues to a member by email (even if they don't have an account)
- **Process**:
  1. Checks if member exists
  2. Creates member_dues record
  3. Generates invitation_token if member doesn't exist
  4. Sets status to 'pending_invite' if no member found
- **Migration**: `20250127000000_add_dues_invitation_support.sql`

## Best Practices

1. **Always use the invitation flow** for new members
   - Don't manually create user_profiles records
   - Let the trigger handle it

2. **Check for existing records** before creating duplicates
   - Use ON CONFLICT clauses in INSERT statements
   - Query by email before creating new records

3. **Use the RPC functions** instead of direct table manipulation
   - Functions have proper error handling
   - They maintain data consistency

4. **Handle timing issues**
   - The trigger runs asynchronously
   - Add retry logic if user_profiles doesn't exist immediately

## Troubleshooting

### Issue: "User profile not found"
**Cause**: User signed up but user_profiles record hasn't been created yet
**Solution**: Add retry logic with a short delay (implemented in Invite.jsx)

### Issue: "Failed to link dues to account"
**Cause**: Multiple possible causes:
- Invalid invitation_token
- Email mismatch
- Invitation already used (status != 'pending_invite')
**Solution**: Check console logs for specific error, verify invitation details

### Issue: 400 error on auth endpoint
**Cause**:
- Invalid credentials
- Email already exists
- Email confirmation required but not handled
**Solution**: Check Supabase dashboard settings, verify email is not already in use
