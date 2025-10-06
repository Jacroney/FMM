# 🚀 FMM Treasury - Quick Reference Guide

> **TL;DR** - Where to find everything

## 📁 File Locations by Task

### 🎨 UI/Frontend Changes

| Task | Files to Edit |
|------|---------------|
| **Add new page** | `src/pages/YourPage.tsx` + `src/App.jsx` (add route) |
| **Modify sidebar** | `src/components/Sidebar.tsx` |
| **Change theme colors** | `src/context/ThemeContext.tsx` + `tailwind.config.js` |
| **Add new component** | `src/components/YourComponent.tsx` |
| **Modify dashboard** | `src/components/Dashboard.tsx` |
| **Transaction list** | `src/components/ExpenseList.tsx` |
| **Transaction form** | `src/components/ExpenseModal.tsx` |

---

### 🔧 Business Logic Changes

| Task | Files to Edit |
|------|---------------|
| **Auth logic** | `src/services/authService.ts` |
| **Transaction operations** | `src/services/expenseService.ts` |
| **Budget operations** | `src/services/budgetService.ts` |
| **Member operations** | `src/services/memberService.ts` |
| **Plaid integration** | `src/services/plaidService.ts` |
| **CSV import/export** | `src/services/csvService.ts` |

---

### 🗄️ Database Changes

| Task | Files to Edit |
|------|---------------|
| **Add new table** | Create new migration: `supabase/migrations/YYYYMMDD_description.sql` |
| **Modify existing table** | Create new migration (don't edit old ones!) |
| **Add RLS policy** | Create migration with `CREATE POLICY ...` |
| **Add database function** | Create migration with `CREATE FUNCTION ...` |
| **View staging setup** | `database/staging_reconciliation.sql` |
| **View Plaid setup** | `database/plaid_setup.sql` |

---

### ⚡ Backend/Edge Functions

| Task | Files to Edit |
|------|---------------|
| **Modify Plaid sync** | `supabase/functions/plaid-sync/index.ts` |
| **Add new edge function** | `supabase/functions/your-function/index.ts` |
| **Change Plaid secrets** | Run: `supabase secrets set KEY=value` |

---

### 🌐 State Management

| Task | Files to Edit |
|------|---------------|
| **Auth state** | `src/context/AuthContext.tsx` |
| **Financial data state** | `src/context/FinancialContext.tsx` |
| **Chapter selection** | `src/context/ChapterContext.tsx` |
| **Theme (dark/light)** | `src/context/ThemeContext.tsx` |

---

## 🔍 Common Tasks - Step by Step

### Add a New Transaction Source

1. **Create staging table:**
   ```sql
   -- In supabase/migrations/new_migration.sql
   CREATE TABLE your_source_txn_staging (
     -- Copy structure from plaid_txn_staging
   );
   ```

2. **Add to reconciliation:**
   - Modify `fn_reconcile_staging()` in staging SQL
   - Add to `v_staging_tables` array

3. **Create service:**
   ```typescript
   // src/services/yourSourceService.ts
   export class YourSourceService {
     static async sync() { /* ... */ }
   }
   ```

4. **Add UI component:**
   - Create component in `src/components/`
   - Add to relevant page

---

### Add a New Page/Route

1. **Create page component:**
   ```tsx
   // src/pages/YourPage.tsx
   export function YourPage() {
     return <div>Your content</div>;
   }
   ```

2. **Add route:**
   ```tsx
   // src/App.jsx
   import { YourPage } from './pages/YourPage';

   // In AppRoutes, inside admin routes:
   <Route path="your-page" element={<YourPage />} />
   ```

3. **Add to sidebar:**
   ```tsx
   // src/components/Sidebar.tsx
   const menuItems = [
     // ... existing items
     {
       title: 'Your Page',
       path: '/your-page',
       icon: 'M...' // SVG path
     },
   ];
   ```

---

### Modify a Database Table

**⚠️ NEVER edit existing migrations!**

1. **Create new migration:**
   ```bash
   # Create file: supabase/migrations/20251003120000_add_column.sql
   ```

2. **Write migration:**
   ```sql
   ALTER TABLE your_table ADD COLUMN new_column TEXT;
   ```

3. **Push to database:**
   ```bash
   export SUPABASE_ACCESS_TOKEN=your_token
   supabase db push
   ```

---

### Add New Category Rule

```sql
-- In Supabase SQL Editor
INSERT INTO category_rules (source, merchant_pattern, category, priority)
VALUES ('PLAID', '(?i)(starbucks|coffee)', 'Food & Dining', 10);
```

---

### Change Plaid Environment (Sandbox → Production)

1. **Update .env:**
   ```bash
   VITE_PLAID_ENV=production
   PLAID_SECRET=your_production_secret
   ```

2. **Update Supabase secrets:**
   ```bash
   export SUPABASE_ACCESS_TOKEN=your_token
   supabase secrets set PLAID_ENV=production
   supabase secrets set PLAID_SECRET=your_production_secret
   ```

3. **Redeploy function:**
   ```bash
   supabase functions deploy plaid-sync
   ```

---

## 🐛 Debugging Checklist

### Frontend Issues

| Problem | Check These |
|---------|-------------|
| Page not loading | Browser console (F12) |
| Auth not working | `AuthContext.tsx`, `authService.ts` |
| Data not showing | `FinancialContext.tsx`, Network tab |
| Styling broken | Tailwind config, CSS imports |
| Route 404 | `App.jsx` routes, path spelling |

### Backend Issues

| Problem | Check These |
|---------|-------------|
| Function errors | `supabase functions logs plaid-sync` |
| DB errors | Supabase Dashboard → Database → Logs |
| RLS blocking queries | Check policies in SQL Editor |
| Missing data | Check `ingestion_audit` table |
| Plaid errors | Edge function logs, Plaid Dashboard |

---

## 📊 Database Table Reference

### Core Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **expenses** | All transactions | `id`, `chapter_id`, `amount`, `category_id`, `period_id`, `source` |
| **budget_categories** | Expense categories | `id`, `chapter_id`, `name`, `type` |
| **budget_periods** | Fiscal periods | `id`, `chapter_id`, `type`, `start_date`, `end_date`, `is_current` |
| **budgets** | Budget allocations | `id`, `chapter_id`, `category_id`, `period_id`, `allocated` |
| **user_profiles** | User data | `id`, `chapter_id`, `role`, `full_name`, `email` |
| **chapters** | Fraternity chapters | `id`, `name`, `school` |
| **members** | Chapter roster | `id`, `chapter_id`, `name`, `dues_paid` |

### Plaid Tables

| Table | Purpose |
|-------|---------|
| **plaid_connections** | Bank account connections |
| **plaid_sync_history** | Sync audit log |
| **plaid_txn_staging** | Plaid transaction staging |

### Staging Tables

| Table | Purpose |
|-------|---------|
| **transaction_staging** | Generic staging |
| **switch_txn_staging** | Switch payment staging |
| **category_rules** | Auto-categorization rules |
| **ingestion_audit** | Reconciliation audit |

---

## 🔑 Environment Variables

### Frontend (.env)

```bash
VITE_SUPABASE_URL=https://ffgeptjhhhifuuhjlsow.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_APP_PASSWORD=fmm
VITE_PLAID_CLIENT_ID=68dea3bb13ae0f002210a4be
VITE_PLAID_ENV=sandbox
```

### Backend (Supabase Secrets)

```bash
PLAID_CLIENT_ID=68dea3bb13ae0f002210a4be
PLAID_SECRET=9c3b1ee1f6d096a1633a2f12e0820a
PLAID_ENV=sandbox
```

---

## 🚀 Deployment Commands

```bash
# Frontend (Vercel)
npm run build
vercel deploy

# Backend - Edge Functions
export SUPABASE_ACCESS_TOKEN=your_token
supabase functions deploy plaid-sync

# Backend - Database Migrations
supabase db push

# Check deployment
supabase functions list
supabase secrets list
```

---

## 📞 Quick Links

- **Supabase Dashboard:** https://supabase.com/dashboard/project/ffgeptjhhhifuuhjlsow
- **Plaid Dashboard:** https://dashboard.plaid.com
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Edge Functions:** https://supabase.com/dashboard/project/ffgeptjhhhifuuhjlsow/functions
- **Database Editor:** https://supabase.com/dashboard/project/ffgeptjhhhifuuhjlsow/editor
- **SQL Editor:** https://supabase.com/dashboard/project/ffgeptjhhhifuuhjlsow/sql

---

## 💡 Pro Tips

1. **Always test in sandbox first** before switching to production
2. **Never edit old migrations** - always create new ones
3. **Check edge function logs** when debugging Plaid issues
4. **Use `ingestion_audit` table** to debug reconciliation
5. **Test RLS policies** in SQL Editor with `SET role postgres;` vs `SET role authenticated;`
6. **Keep secrets in Supabase** - never commit to git
7. **Use TypeScript** for new files (better type safety)
8. **Follow existing patterns** when adding features

---

**Need more details?** Check `CODEBASE_MAP.md` for comprehensive documentation.
