# Supabase Setup Instructions

## 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Name it: `ksig-treasurer`
5. Choose your region and set a strong database password
6. Wait for project to be created

## 2. Create Database Tables

Go to the SQL Editor in your Supabase dashboard and run these SQL commands:

### Transactions Table
```sql
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  source TEXT CHECK (source IN ('CHASE', 'SWITCH', 'MANUAL')) NOT NULL,
  status TEXT CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index for faster queries
CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_transactions_category ON transactions(category);
```

### Members Table
```sql
CREATE TABLE members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  status TEXT CHECK (status IN ('Active', 'Inactive', 'Alumni')) NOT NULL,
  "duesPaid" BOOLEAN DEFAULT FALSE,
  "paymentDate" DATE,
  semester TEXT NOT NULL,
  "lastUpdated" TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index for faster queries
CREATE INDEX idx_members_status ON members(status);
CREATE INDEX idx_members_dues ON members("duesPaid");
```

### Budgets Table
```sql
CREATE TABLE budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  spent DECIMAL(10, 2) DEFAULT 0,
  category TEXT NOT NULL,
  period TEXT CHECK (period IN ('MONTHLY', 'QUARTERLY', 'YEARLY')) NOT NULL,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index for faster queries
CREATE INDEX idx_budgets_dates ON budgets("startDate", "endDate");
CREATE INDEX idx_budgets_category ON budgets(category);
```

## 3. Enable Row Level Security (Optional for Development)

For now, you can leave RLS disabled during development. To enable it later:

```sql
-- Enable RLS on all tables
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Create policies (example for allowing all operations during development)
CREATE POLICY "Allow all operations" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON members FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON budgets FOR ALL USING (true);
```

## 4. Get Your API Keys

1. Go to Settings → API in your Supabase dashboard
2. Copy your:
   - Project URL (looks like `https://xxxxxxxxxxxxx.supabase.co`)
   - Anon/Public API Key

## 5. Configure Environment Variables

Update the `.env` file in your project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 6. Test the Connection

Run your application:
```bash
npm run dev
```

The app should now:
- Load data from Supabase on startup
- Save all transactions, members, and budgets to your Supabase database
- Sync changes in real-time

## 7. Sample Data (Optional)

To add some sample data for testing:

```sql
-- Sample transactions
INSERT INTO transactions (date, amount, description, category, source, status)
VALUES 
  (CURRENT_DATE, 500.00, 'Monthly Dues Collection', 'Income', 'CHASE', 'COMPLETED'),
  (CURRENT_DATE - INTERVAL '1 day', -150.00, 'Pizza for Meeting', 'Food', 'MANUAL', 'COMPLETED'),
  (CURRENT_DATE - INTERVAL '2 days', -75.50, 'Office Supplies', 'Supplies', 'CHASE', 'COMPLETED');

-- Sample members
INSERT INTO members (name, email, status, "duesPaid", semester)
VALUES 
  ('John Doe', 'john@example.com', 'Active', true, 'Fall 2024'),
  ('Jane Smith', 'jane@example.com', 'Active', false, 'Fall 2024'),
  ('Bob Johnson', 'bob@example.com', 'Alumni', true, 'Spring 2024');

-- Sample budgets
INSERT INTO budgets (name, amount, category, period, "startDate", "endDate")
VALUES 
  ('Q1 Social Events', 5000.00, 'Social Events', 'QUARTERLY', '2024-01-01', '2024-03-31'),
  ('Monthly Food Budget', 500.00, 'Food', 'MONTHLY', '2024-01-01', '2024-01-31');
```

## Troubleshooting

### Connection Issues
- Verify your Supabase URL and API key are correct
- Check that your tables are created properly
- Ensure your internet connection is stable

### Data Not Showing
- Check browser console for errors
- Verify RLS policies if enabled
- Ensure tables have the correct column names (case-sensitive)

### Performance Issues
- Add appropriate indexes to your tables
- Consider implementing pagination for large datasets
- Use Supabase's built-in caching features

## Next Steps

1. **Authentication**: Add Supabase Auth to secure your app
2. **Real-time Updates**: Enable Supabase real-time subscriptions
3. **Backups**: Set up automatic database backups in Supabase dashboard
4. **Monitoring**: Use Supabase's built-in monitoring tools