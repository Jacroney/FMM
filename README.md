# FMM Treasury – Fraternity Financial Management

> **Modern financial management platform for fraternity chapters with automatic bank transaction syncing**

FMM Treasury is a comprehensive web-based financial management system designed specifically for fraternity treasurers. Built with React, Supabase, and Plaid integration, it provides powerful tools for budgeting, transaction tracking, and financial reporting.

## ✨ Key Features

### 💰 Financial Management
- **Budget Planning & Tracking** - Multi-period budgets (quarters, semesters, years)
- **Transaction Management** - Manual entry and automatic bank sync
- **Category System** - Customizable expense categories (Fixed, Operational, Event)
- **Financial Reports** - Real-time budget analysis and spending insights
- **Member Dues Tracking** - Roster management with payment status

### 🏦 Bank Integration (NEW!)
- **Automatic Transaction Sync** - Connect bank accounts via Plaid
- **Multi-Bank Support** - Link multiple accounts per chapter
- **Smart Categorization** - Auto-categorize transactions with pattern matching
- **Deduplication** - Intelligent duplicate detection across sources
- **Audit Trail** - Complete history of all syncs and imports

### 👥 Multi-Chapter Support
- **Chapter Isolation** - Secure data separation via RLS
- **Role-Based Access** - Admin, Executive, and Member roles
- **Chapter Switching** - Manage multiple chapters from one account

### 🎨 Modern UI/UX
- **Dark/Light Themes** - System preference aware
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Real-time Updates** - Live data syncing
- **Toast Notifications** - User-friendly feedback

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- Supabase account (free tier works!)
- Plaid account (optional, for bank sync)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Jacroney/FMM.git
   cd FMM
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

   Add your credentials to `.env`:
   ```bash
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_APP_PASSWORD=your_app_password

   # Optional: For Plaid bank sync
   VITE_PLAID_CLIENT_ID=your_plaid_client_id
   VITE_PLAID_ENV=sandbox
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Open browser:** http://localhost:5173

### Setting Up Plaid Integration (Optional)

For automatic bank transaction syncing:

1. **Sign up for Plaid:** https://dashboard.plaid.com
2. **Follow setup guide:** See `docs/PLAID_SETUP.md`
3. **Quick deploy:** Run `./scripts/deploy-plaid.sh`

**Or check:** `docs/NEXT_STEPS.md` for step-by-step instructions

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **[CODEBASE_MAP.md](CODEBASE_MAP.md)** | Complete project architecture and file locations |
| **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** | Quick lookup for common tasks |
| **[docs/PLAID_SETUP.md](docs/PLAID_SETUP.md)** | Plaid integration setup guide |
| **[docs/NEXT_STEPS.md](docs/NEXT_STEPS.md)** | Post-installation checklist |

---

## 🏗️ Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool & dev server
- **React Router 6** - Client-side routing
- **TailwindCSS 3** - Utility-first CSS
- **TypeScript** - Type safety (partial migration)

### Backend
- **Supabase** - Database, authentication, and real-time
- **PostgreSQL** - Relational database
- **Row Level Security (RLS)** - Chapter-scoped data isolation
- **Edge Functions** - Serverless functions (Deno runtime)

### Integrations
- **Plaid** - Bank account linking and transaction sync
- **Vercel Analytics** - Performance monitoring
- **React Hot Toast** - Notifications

### Libraries
- **Recharts** - Data visualization
- **PapaParse** - CSV parsing
- **Formik + Yup** - Form handling & validation
- **Lucide React** - Icon library

---

## 📁 Project Structure

```
FMM/
├── src/
│   ├── components/        # Reusable UI components
│   ├── pages/             # Route-level pages
│   ├── services/          # API & business logic
│   ├── context/           # React Context providers
│   ├── hooks/             # Custom React hooks
│   └── layouts/           # Page layouts
│
├── supabase/
│   ├── functions/         # Edge Functions
│   │   └── plaid-sync/    # Plaid integration
│   └── migrations/        # Database migrations
│
├── database/              # SQL setup files
├── docs/                  # Documentation
└── scripts/               # Deployment scripts
```

**See [CODEBASE_MAP.md](CODEBASE_MAP.md) for detailed breakdown**

---

## 🔐 Security Features

- **Row Level Security (RLS)** - Chapter-scoped data access
- **Role-based permissions** - Admin, Exec, Member roles
- **Secure authentication** - Supabase Auth
- **Encrypted secrets** - Environment variables never exposed
- **Input validation** - Server-side and client-side
- **SQL injection prevention** - Parameterized queries

---

## 🎯 Core Workflows

### Adding a Transaction
1. Go to Transactions page
2. Click "Add Transaction"
3. Fill form (amount, category, date)
4. Submit → instantly reflected in budgets

### Linking a Bank Account
1. Go to Bank Sync page
2. Click "Link Bank Account"
3. Select your bank via Plaid Link
4. Authenticate with your bank
5. Transactions auto-sync and categorize

### Creating a Budget
1. Go to Budgets page
2. Select period (Quarter/Semester/Year)
3. Set allocations by category
4. Track spending in real-time

---

## 🚢 Deployment

### Frontend (Vercel)
```bash
npm run build
vercel deploy
```

### Backend (Supabase)
```bash
# Set access token
export SUPABASE_ACCESS_TOKEN=your_token

# Deploy Edge Functions
supabase functions deploy plaid-sync

# Push database migrations
supabase db push
```

**See [docs/PLAID_SETUP.md](docs/PLAID_SETUP.md) for complete deployment guide**

---

## 🧪 Testing

### Plaid Sandbox Testing
- **Institution:** "First Platypus Bank"
- **Username:** `user_good`
- **Password:** `pass_good`
- **MFA Code:** `1234`

### Local Development
```bash
npm run dev           # Start dev server
npm run build         # Production build
npm run preview       # Preview production build
npm run lint          # Run linter
```

---

## 🤝 Contributing

Pull requests are welcome! For major changes:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📋 Roadmap

- [ ] Real-time Plaid webhooks
- [ ] Scheduled auto-sync (pg_cron)
- [ ] Receipt upload & OCR
- [ ] Mobile app (React Native)
- [ ] Export to QuickBooks/Xero
- [ ] AI budget forecasting
- [ ] Multi-currency support

---

## 🐛 Troubleshooting

### Common Issues

**Transactions not syncing?**
- Check Edge Function logs: `supabase functions logs plaid-sync`
- Verify Plaid secrets: `supabase secrets list`
- Click "Process Now" in Bank Sync page

**RLS errors?**
- Ensure user has `chapter_id` in `user_profiles`
- Check RLS policies in Supabase SQL Editor

**Function deployment failed?**
- Verify access token is set: `echo $SUPABASE_ACCESS_TOKEN`
- Check project reference: `supabase projects list`

**See [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for more debugging tips**

---

## 📞 Support

- **Documentation:** See `docs/` folder
- **Issues:** [GitHub Issues](https://github.com/Jacroney/FMM/issues)
- **Plaid:** https://plaid.com/docs
- **Supabase:** https://supabase.com/docs

---

## 📄 License

This project is private to Jacroney and collaborators.

---

## 🙏 Acknowledgments

- **Plaid** - Bank integration platform
- **Supabase** - Backend infrastructure
- **Vercel** - Hosting and deployment
- **TailwindCSS** - UI styling

---

**Version:** 1.0.0 with Plaid Integration
**Last Updated:** October 2, 2025
**Maintained by:** FMM Treasury Team

---

## 🎉 Getting Help

**New to the project?** Start here:
1. Read [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for common tasks
2. Check [CODEBASE_MAP.md](CODEBASE_MAP.md) for architecture details
3. Follow [docs/NEXT_STEPS.md](docs/NEXT_STEPS.md) to deploy Plaid

**Ready to code?** See [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for file locations and patterns.
