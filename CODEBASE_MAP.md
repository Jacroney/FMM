# 📚 FMM Treasury App - Complete Codebase Map

> **Last Updated:** October 2, 2025
> **Version:** 1.0 with Plaid Integration

## 🗂️ Project Structure

```
FMM/
├── 📁 src/                    # Frontend React application
│   ├── 📁 components/         # Reusable UI components
│   ├── 📁 pages/              # Route-level page components
│   ├── 📁 services/           # API & business logic services
│   ├── 📁 context/            # React Context providers
│   ├── 📁 hooks/              # Custom React hooks
│   ├── 📁 layouts/            # Layout wrappers
│   ├── 📁 utils/              # Utility functions
│   ├── 📁 types/              # TypeScript type definitions
│   └── 📁 assets/             # Images, icons, styles
│
├── 📁 supabase/               # Backend Supabase configuration
│   ├── 📁 functions/          # Edge Functions (serverless)
│   │   └── 📁 plaid-sync/     # Plaid integration function
│   └── 📁 migrations/         # Database migration files
│
├── 📁 database/               # Database setup SQL files
├── 📁 docs/                   # Project documentation
├── 📁 scripts/                # Deployment & setup scripts
└── 📁 public/                 # Static assets
```

---

## 📦 Frontend (`/src`)

### 🎨 Components (`/src/components`)

| File | Purpose | Key Features |
|------|---------|--------------|
| **Dashboard.tsx** | Main admin dashboard | Overview stats, recent transactions, budget summary |
| **MemberDashboard.tsx** | Member-only view | Dues payment info, read-only access |
| **Sidebar.tsx** | Navigation sidebar | Route links, theme toggle, chapter selector |
| **ExpenseModal.tsx** | Transaction entry form | Add/edit expenses, category selection |
| **ExpenseList.tsx** | Transaction table | Sortable, filterable expense list |
| **BudgetCharts.tsx** | Budget visualizations | Charts for budget vs. spending |
| **PlaidLink.tsx** | Plaid bank link button | Connects bank accounts, auto-syncs transactions |
| **ChapterSelector.tsx** | Chapter switcher | Multi-chapter support |
| **ConfirmModal.tsx** | Confirmation dialog | Delete confirmations, warnings |
| **LoadingSpinner.tsx** | Loading indicator | Used during async operations |
| **NotFound.tsx** | 404 error page | Invalid route handling |
| **FirstTimeSetup.tsx** | Onboarding wizard | New admin setup flow |
| **PasswordProtection.jsx** | App-level auth | Password protection layer |
| **SupabaseConnectionTest.tsx** | DB health check | Tests Supabase connection |

#### 🔐 Auth Components (`/src/components/auth`)
| File | Purpose |
|------|---------|
| **LoginForm.tsx** | User login interface |
| **SignupForm.tsx** | New user registration |
| **ProfileSettings.tsx** | User profile editor |

---

### 📄 Pages (`/src/pages`)

| File | Route | Purpose | Access Level |
|------|-------|---------|--------------|
| **Transactions.tsx** | `/transactions` | Transaction management | Admin/Exec |
| **Budgets.tsx** | `/budgets` | Budget planning & tracking | Admin/Exec |
| **Reports.jsx** | `/reports` | Financial reports & analytics | Admin/Exec |
| **Members.jsx** | `/members` | Member roster management | Admin/Exec |
| **PlaidSync.tsx** | `/plaid-sync` | Bank account sync dashboard | Admin/Exec |
| **Settings.jsx** | `/settings` | App & user settings | Admin/Exec |

---

### 🔧 Services (`/src/services`)

**Business logic & API communication layer**

| File | Purpose | Key Functions |
|------|---------|---------------|
| **supabaseClient.ts** | Supabase initialization | `supabase` client singleton |
| **authService.ts** | Authentication logic | `signIn()`, `signUp()`, `signOut()`, `getUserProfile()` |
| **expenseService.ts** | Expense/transaction CRUD | `createExpense()`, `updateExpense()`, `deleteExpense()`, `getExpenses()` |
| **budgetService.ts** | Budget management | `getBudgets()`, `createBudget()`, `getBudgetSummary()` |
| **memberService.ts** | Member management | `getMembers()`, `addMember()`, `updateMember()`, `exportToCSV()` |
| **chapterService.ts** | Chapter management | `getChapters()`, `createChapter()`, `updateChapter()` |
| **plaidService.ts** | Plaid integration | `createLinkToken()`, `exchangeToken()`, `syncTransactions()`, `reconcile()` |
| **transactionService.ts** | Transaction utilities | Import/export, categorization |
| **csvService.ts** | CSV import/export | Parse CSV files, map to transactions |
| **types.ts** | TypeScript types | Shared type definitions |

---

### 🌐 Context Providers (`/src/context`)

**Global state management**

| File | Purpose | Provides |
|------|---------|----------|
| **AuthContext.tsx** | User authentication state | `user`, `profile`, `hasAdminAccess`, `isMember`, `signIn()`, `signOut()` |
| **FinancialContext.tsx** | Financial data state | `transactions`, `budgets`, `categories`, CRUD functions |
| **ChapterContext.tsx** | Chapter selection state | `selectedChapter`, `chapters`, `setChapter()` |
| **ThemeContext.tsx** | Dark/light mode | `theme`, `toggleTheme()` |

---

### 🎣 Custom Hooks (`/src/hooks`)

| File | Purpose |
|------|---------|
| **useAuth.ts** | Authentication hook (wraps AuthContext) |
| **useFinancialData.ts** | Financial data hook (wraps FinancialContext) |

---

### 🏗️ Layouts (`/src/layouts`)

| File | Purpose |
|------|---------|
| **MainLayout.tsx** | App shell with sidebar + outlet |

---

## 🔙 Backend (`/supabase`)

### ⚡ Edge Functions (`/supabase/functions`)

#### `plaid-sync/` - Plaid Integration Function

**Files:**
- `index.ts` - Main function handler
- `deno.json` - Deno configuration

**Actions:**
| Action | Purpose | Required Params |
|--------|---------|-----------------|
| `create_link_token` | Generate Plaid Link token | `chapter_id` |
| `exchange_token` | Exchange public token for access token | `public_token`, `chapter_id` |
| `sync_transactions` | Sync transactions from Plaid | `connection_id`, `chapter_id` |
| `sync_all` | Sync all active connections | `chapter_id` |
| `get_connections` | List all bank connections | `chapter_id` |
| `deactivate_connection` | Disconnect bank account | `connection_id`, `chapter_id` |

**Environment Variables:**
- `PLAID_CLIENT_ID`
- `PLAID_SECRET`
- `PLAID_ENV` (sandbox/development/production)

---

### 🗄️ Database Migrations (`/supabase/migrations`)

| File | Purpose |
|------|---------|
| **20250102000002_plaid_setup.sql** | Plaid tables (applied to production) |

---

## 🗃️ Database Setup (`/database`)

**SQL files for manual setup or reference**

| File | Purpose | Tables Created |
|------|---------|----------------|
| **staging_reconciliation.sql** | Transaction staging & reconciliation | `transaction_staging`, `plaid_txn_staging`, `switch_txn_staging`, `category_rules`, `ingestion_audit` |
| **plaid_setup.sql** | Plaid connection tracking | `plaid_connections`, `plaid_sync_history` |

**Key Database Components:**

### Staging Tables
- **transaction_staging** - Generic transaction imports
- **plaid_txn_staging** - Plaid transactions
- **switch_txn_staging** - Switch payment transactions

### Production Tables
- **expenses** - Canonical transaction table
- **budgets** - Budget allocations
- **budget_categories** - Expense categories
- **budget_periods** - Fiscal periods (quarters, semesters)
- **user_profiles** - User data
- **chapters** - Fraternity chapters
- **members** - Chapter member roster
- **plaid_connections** - Bank account connections
- **plaid_sync_history** - Sync audit log

### Functions
- **fn_reconcile_staging()** - Moves staging → expenses with:
  - Deduplication by hash
  - Auto-categorization via `category_rules`
  - Period mapping
  - Error logging to `ingestion_audit`

### Views
- **unprocessed_staging_v** - All `status='new'` staging records
- **expense_details** - Expenses with category/period details

---

## 📚 Documentation (`/docs`)

| File | Purpose |
|------|---------|
| **PLAID_SETUP.md** | Complete Plaid setup guide (3,500 words) |
| **PLAID_IMPLEMENTATION_SUMMARY.md** | Architecture overview, implementation details |
| **NEXT_STEPS.md** | Quick start checklist for deployment |
| **.env.plaid.example** | Environment variable template |

---

## 🛠️ Scripts (`/scripts`)

| File | Purpose |
|------|---------|
| **deploy-plaid.sh** | Automated Plaid deployment to Supabase |

**Usage:**
```bash
./scripts/deploy-plaid.sh
```

---

## 🔧 Configuration Files

| File | Purpose |
|------|---------|
| **package.json** | NPM dependencies, scripts |
| **.env** | Environment variables (not in git) |
| **.env.example** | Environment variable template |
| **vercel.json** | Vercel deployment config |
| **vite.config.js** | Vite build configuration |
| **tailwind.config.js** | Tailwind CSS configuration |
| **supabase/config.toml** | Supabase project configuration |

---

## 🔑 Key Dependencies

### Frontend
- **React 18** - UI library
- **React Router 6** - Client-side routing
- **TailwindCSS 3** - Utility-first CSS
- **Vite** - Build tool
- **@supabase/supabase-js** - Supabase client
- **plaid** - Plaid SDK
- **react-plaid-link** - Plaid Link component
- **react-hot-toast** - Notifications
- **recharts** - Charts/graphs
- **papaparse** - CSV parsing
- **lucide-react** - Icons

### Backend
- **Deno** - Edge function runtime
- **Plaid SDK** - Bank integration
- **Supabase** - Database, auth, storage

---

## 🔐 Authentication & Authorization

### User Roles
- **admin** - Full access to all features
- **exec** - Full access (same as admin)
- **member** - Read-only dues dashboard

### Role Enforcement
- **Frontend:** `AuthContext` checks `profile.role`
- **Backend:** RLS policies on all tables
- **Database:** Chapter-scoped isolation via `user_profiles.chapter_id`

### RLS Policy Pattern
```sql
CREATE POLICY table_name_policy ON table_name
  FOR ALL USING (
    chapter_id IN (
      SELECT chapter_id FROM user_profiles WHERE id = auth.uid()
    )
  );
```

---

## 🔄 Data Flow

### Transaction Sync Flow (Plaid)

```
1. User clicks "Link Bank Account" (PlaidLink.tsx)
   ↓
2. Plaid Link opens → user connects bank
   ↓
3. public_token returned → exchangeToken() called
   ↓
4. Edge function exchanges for access_token
   ↓
5. access_token stored in plaid_connections
   ↓
6. syncTransactions() called automatically
   ↓
7. Transactions inserted into plaid_txn_staging
   ↓
8. reconcile() called automatically
   ↓
9. fn_reconcile_staging() processes:
   - Dedupes by hash
   - Categorizes via category_rules
   - Maps to current period
   - Inserts into expenses table
   ↓
10. User sees transactions in Transactions page
```

### Manual Transaction Entry Flow

```
1. User clicks "Add Transaction" (Transactions page)
   ↓
2. ExpenseModal opens
   ↓
3. User fills form (amount, category, date, etc.)
   ↓
4. Submit → expenseService.createExpense()
   ↓
5. Insert into expenses table
   ↓
6. FinancialContext updates
   ↓
7. UI refreshes with new transaction
```

---

## 🎨 UI Theme System

### Theme Files
- `ThemeContext.tsx` - Theme provider
- Dark mode stored in localStorage
- CSS variables in `src/styles/`

### Supported Modes
- **Light Mode** - Default
- **Dark Mode** - Dark backgrounds, light text

---

## 📊 Budget System

### Budget Structure
1. **Categories** - Expense types (Fixed, Operational, Event)
2. **Periods** - Time ranges (Quarter, Semester, Year)
3. **Budgets** - Allocated amounts per category/period
4. **Expenses** - Actual spending

### Budget Tracking
- Real-time spent vs. allocated
- Percentage used calculations
- Visual charts (BudgetCharts.tsx)
- Multi-period support

---

## 🔍 Search & Filtering

### Transaction Filters
- Date range
- Category
- Amount range
- Status (pending, completed, cancelled)
- Source (MANUAL, PLAID, CHASE, SWITCH, CSV_IMPORT)

### Member Filters
- Status (Active, Inactive, Pledge, Alumni)
- Dues paid status
- Year/class

---

## 🚀 Deployment

### Vercel (Frontend)
```bash
npm run build
vercel deploy
```

### Supabase (Backend)
```bash
# Set access token
export SUPABASE_ACCESS_TOKEN=your_token

# Deploy function
supabase functions deploy plaid-sync

# Push migrations
supabase db push
```

---

## 🧪 Testing Plaid (Sandbox)

### Test Credentials
- **Institution:** "First Platypus Bank" or "Chase"
- **Username:** `user_good`
- **Password:** `pass_good`
- **MFA Code:** `1234`

### Test Flow
1. Go to `/plaid-sync`
2. Click "Link Bank Account"
3. Search for test institution
4. Enter credentials
5. Verify transactions sync

---

## 🐛 Common Issues & Solutions

### "Function not found"
**Cause:** Edge function not deployed
**Fix:** `supabase functions deploy plaid-sync`

### "Unauthorized" error
**Cause:** Missing Plaid secrets
**Fix:** `supabase secrets set PLAID_CLIENT_ID=...`

### Transactions not appearing
**Cause:** Not reconciled from staging
**Fix:** Click "Process Now" button or call `reconcile()`

### RLS policy errors
**Cause:** User not associated with chapter
**Fix:** Ensure `user_profiles.chapter_id` is set

---

## 📈 Performance Optimizations

- **Cursor-based pagination** - Plaid incremental sync
- **React.memo** - Prevent unnecessary re-renders
- **Context splitting** - Separate Auth/Financial contexts
- **Lazy loading** - Route-level code splitting
- **Index optimization** - DB indexes on frequently queried columns

---

## 🔮 Future Enhancements

### Planned Features
- [ ] Real-time Plaid webhooks
- [ ] Scheduled auto-sync (pg_cron)
- [ ] Receipt upload & OCR
- [ ] Multi-currency support
- [ ] Export to QuickBooks/Xero
- [ ] Mobile app (React Native)
- [ ] Recurring transaction rules
- [ ] Budget forecasting AI

---

## 🆘 Getting Help

### Documentation
- `docs/PLAID_SETUP.md` - Plaid setup guide
- `docs/NEXT_STEPS.md` - Quick start
- `README.md` - Project overview

### Logs & Debugging
```bash
# Edge function logs
supabase functions logs plaid-sync

# Check secrets
supabase secrets list

# Database errors
# Check ingestion_audit table
SELECT * FROM ingestion_audit ORDER BY started_at DESC LIMIT 10;
```

---

## 📞 Support Contacts

- **Plaid Docs:** https://plaid.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **GitHub Issues:** (your repo URL)

---

**Version:** 1.0.0
**Last Updated:** October 2, 2025
**Maintained by:** FMM Treasury Team
