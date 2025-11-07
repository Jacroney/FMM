# Fix: TypeError - Cannot read 'toLowerCase' of undefined

**Date**: 2025-11-06
**Issue**: Runtime error when accessing Dues or Members pages
**Status**: ✅ FIXED

---

## Problem

When navigating to the Dues or Members pages, the application crashed with:
```
TypeError: Cannot read properties of undefined (reading 'toLowerCase')
at Dues.tsx:379:17
```

### Root Cause

During the migration from `MemberService` to `AuthService`, the member data structure changed:

- **Old Structure** (deleted `MemberService`): Members had a `name` property
- **New Structure** (`AuthService.getChapterMembers()`): Returns `UserProfile[]` objects with `full_name` property

The code in Dues.tsx and Members.jsx was still referencing `member.name`, which doesn't exist on `UserProfile` objects, causing the application to crash when trying to call `.toLowerCase()` on `undefined`.

---

## Files Fixed

### 1. src/pages/Dues.tsx (4 changes)

**Line 379** - Filter function:
```javascript
// Before
member.name.toLowerCase().includes(...)

// After
(member.full_name || '').toLowerCase().includes(...)
```

**Line 349** - Notification message:
```javascript
// Before
`Payment status updated for ${member.name}`

// After
`Payment status updated for ${member.full_name || 'member'}`
```

**Line 541** - Member initial (avatar):
```javascript
// Before
member.name.charAt(0)

// After
(member.full_name || 'M').charAt(0)
```

**Line 544** - Member name display:
```javascript
// Before
{member.name}

// After
{member.full_name || 'Unknown'}
```

### 2. src/pages/Members.jsx (4 changes)

**Line 247** - Filter function:
```javascript
// Before
member.name.toLowerCase().includes(...)

// After
(member.full_name || '').toLowerCase().includes(...)
```

**Line 217** - Notification message:
```javascript
// Before
`Payment status updated for ${member.name}`

// After
`Payment status updated for ${member.full_name || 'member'}`
```

**Line 409** - Member initial (avatar):
```javascript
// Before
member.name.charAt(0)

// After
(member.full_name || 'M').charAt(0)
```

**Line 412** - Member name display:
```javascript
// Before
{member.name}

// After
{member.full_name || 'Unknown'}
```

---

## Safety Measures Applied

1. **Optional Chaining Alternative**: Used `|| ''` fallback pattern for string operations
2. **Default Values**: Provided sensible defaults (`'Unknown'`, `'M'`, `'member'`)
3. **Null Safety**: All accesses now handle undefined/null values gracefully

---

## Other Files Checked

**authService.ts**: ✅ Correct - Uses `member.name` only in demo mode mapping (demo store members DO have `.name`)

**Contact.tsx**: ✅ Correct - Uses a static `teamMembers` array with `name` property (not related to database members)

---

## Data Structure Reference

### UserProfile (from authService.ts)
```typescript
interface UserProfile {
  id: string;
  chapter_id: string;
  email: string;
  full_name: string;        // ← Use this!
  phone_number?: string;
  year?: 'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | 'Graduate' | 'Alumni';
  role: 'admin' | 'exec' | 'treasurer' | 'member';
  // ... other fields
}
```

### Member (from types.ts)
```typescript
interface Member {
  id: string;
  chapter_id: string;
  full_name: string;        // ← Use this!
  email: string;
  status: 'active' | 'inactive' | 'pledge' | 'alumni';
  // ... other fields
}
```

---

## Testing

### Build Status
```bash
npm run build
# ✅ PASSING - No errors
```

### TypeScript Diagnostics
```bash
# ✅ No errors detected
```

### Manual Testing Required
- [ ] Navigate to Dues page - should load without errors
- [ ] Search for members - filter should work
- [ ] View member names and avatars - should display correctly
- [ ] Navigate to Members page - should load without errors
- [ ] Test all member-related functionality

---

## Migration Notes

If you encounter similar issues in the future, remember:

**When using `AuthService.getChapterMembers()`:**
- ✅ Use `member.full_name`
- ❌ Don't use `member.name`

**When using demo mode data:**
- ✅ Demo members still use `member.name`
- ✅ AuthService correctly maps this to `full_name` in the response

**Best Practice:**
Always add null/undefined protection when accessing nested properties:
```javascript
// Good
(member.full_name || '').toLowerCase()
member.full_name || 'Unknown'

// Better (if using TypeScript)
member.full_name?.toLowerCase() ?? ''
```

---

## Related Issues

This fix addresses:
- ✅ TypeError on Dues page load
- ✅ TypeError on Members page load
- ✅ Member search functionality
- ✅ Member name display in tables
- ✅ Member avatar initials

---

## Commit Message Suggestion

```
fix: replace member.name with member.full_name after AuthService migration

- Fixed TypeError when accessing Dues and Members pages
- Updated member.name → member.full_name (8 occurrences)
- Added null safety with fallback values
- Files: Dues.tsx, Members.jsx

Fixes runtime crash caused by data structure change during
MemberService → AuthService migration.
```

---

**Status**: Ready for testing
**Next Steps**: Manual verification in browser
