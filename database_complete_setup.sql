-- Complete Database Setup for KSig Treasurer
-- Run this entire script in your Supabase SQL Editor

-- 1. Create chapters table FIRST (since other tables will reference it)
CREATE TABLE IF NOT EXISTS chapters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  school TEXT NOT NULL,
  member_count INTEGER DEFAULT 0,
  fraternity_name TEXT NOT NULL DEFAULT 'Kappa Sigma',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for chapters
CREATE INDEX IF NOT EXISTS idx_chapters_name ON chapters(name);
CREATE INDEX IF NOT EXISTS idx_chapters_school ON chapters(school);

-- 2. Insert a default chapter
INSERT INTO chapters (name, school, member_count, fraternity_name)
VALUES ('Alpha Beta', 'University Example', 0, 'Kappa Sigma')
ON CONFLICT DO NOTHING;

-- 3. Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  source TEXT CHECK (source IN ('CHASE', 'SWITCH', 'MANUAL')) NOT NULL,
  status TEXT CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_chapter ON transactions(chapter_id);

-- 4. Create members table
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT CHECK (status IN ('Active', 'Inactive', 'Alumni')) NOT NULL,
  "duesPaid" BOOLEAN DEFAULT FALSE,
  "paymentDate" DATE,
  semester TEXT NOT NULL,
  "lastUpdated" TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(email, chapter_id)  -- Email must be unique within a chapter
);

-- Create indexes for members
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_dues ON members("duesPaid");
CREATE INDEX IF NOT EXISTS idx_members_chapter ON members(chapter_id);

-- 5. Create budget_categories table
CREATE TABLE IF NOT EXISTS budget_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('Fixed Costs', 'Operational Costs', 'Event Costs')) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_budget_categories_chapter ON budget_categories(chapter_id);
CREATE INDEX IF NOT EXISTS idx_budget_categories_type ON budget_categories(type);

-- 6. Create budget_periods table
CREATE TABLE IF NOT EXISTS budget_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('Quarter', 'Semester', 'Year')) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  fiscal_year INTEGER NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_budget_periods_chapter ON budget_periods(chapter_id);
CREATE INDEX IF NOT EXISTS idx_budget_periods_dates ON budget_periods(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_budget_periods_current ON budget_periods(is_current);

-- 7. Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES budget_categories(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES budget_periods(id) ON DELETE CASCADE,
  allocated DECIMAL(10, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(category_id, period_id)  -- One budget per category per period
);

CREATE INDEX IF NOT EXISTS idx_budgets_chapter ON budgets(chapter_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(period_id);

-- 8. Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL,
  category_id UUID NOT NULL REFERENCES budget_categories(id),
  period_id UUID NOT NULL REFERENCES budget_periods(id),
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT NOT NULL,
  transaction_date DATE NOT NULL,
  vendor TEXT,
  receipt_url TEXT,
  payment_method TEXT CHECK (payment_method IN ('Cash', 'Check', 'Credit Card', 'ACH', 'Venmo', 'Other')),
  status TEXT CHECK (status IN ('pending', 'completed', 'cancelled')) DEFAULT 'pending',
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_expenses_chapter ON expenses(chapter_id);
CREATE INDEX IF NOT EXISTS idx_expenses_budget ON expenses(budget_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);

-- 9. Create budget_summary view
CREATE OR REPLACE VIEW budget_summary AS
SELECT
  bp.name as period,
  bp.type as period_type,
  bp.fiscal_year,
  bp.start_date,
  bc.name as category,
  bc.type as category_type,
  b.allocated,
  COALESCE(SUM(e.amount), 0) as spent,
  b.allocated - COALESCE(SUM(e.amount), 0) as remaining,
  CASE
    WHEN b.allocated > 0 THEN ROUND((COALESCE(SUM(e.amount), 0) / b.allocated) * 100, 2)
    ELSE 0
  END as percent_used,
  b.chapter_id
FROM budgets b
JOIN budget_categories bc ON b.category_id = bc.id
JOIN budget_periods bp ON b.period_id = bp.id
LEFT JOIN expenses e ON b.id = e.budget_id AND e.status = 'completed'
GROUP BY bp.name, bp.type, bp.fiscal_year, bp.start_date, bc.name, bc.type, b.allocated, b.chapter_id;

-- 10. Create function to automatically update member count
CREATE OR REPLACE FUNCTION update_chapter_member_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update member count for the affected chapter(s)
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE chapters
        SET member_count = (
            SELECT COUNT(*)
            FROM members
            WHERE chapter_id = NEW.chapter_id AND status = 'Active'
        ),
        updated_at = NOW()
        WHERE id = NEW.chapter_id;
    END IF;

    IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.chapter_id != NEW.chapter_id) THEN
        UPDATE chapters
        SET member_count = (
            SELECT COUNT(*)
            FROM members
            WHERE chapter_id = OLD.chapter_id AND status = 'Active'
        ),
        updated_at = NOW()
        WHERE id = OLD.chapter_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 11. Create trigger to automatically update member count
DROP TRIGGER IF EXISTS trigger_update_chapter_member_count ON members;
CREATE TRIGGER trigger_update_chapter_member_count
    AFTER INSERT OR UPDATE OR DELETE ON members
    FOR EACH ROW
    EXECUTE FUNCTION update_chapter_member_count();

-- 12. Insert sample data for testing
DO $$
DECLARE
    default_chapter_id UUID;
    food_category_id UUID;
    social_category_id UUID;
    dues_category_id UUID;
    current_period_id UUID;
BEGIN
    -- Get the default chapter ID
    SELECT id INTO default_chapter_id FROM chapters LIMIT 1;

    -- Insert sample budget categories
    INSERT INTO budget_categories (chapter_id, name, type, description)
    VALUES
        (default_chapter_id, 'Food & Dining', 'Operational Costs', 'Chapter meals and dining expenses'),
        (default_chapter_id, 'Social Events', 'Event Costs', 'Parties, mixers, and social activities'),
        (default_chapter_id, 'Member Dues', 'Fixed Costs', 'Monthly member dues collection')
    RETURNING id INTO food_category_id;

    -- Get all category IDs
    SELECT id INTO social_category_id FROM budget_categories WHERE name = 'Social Events' AND chapter_id = default_chapter_id;
    SELECT id INTO dues_category_id FROM budget_categories WHERE name = 'Member Dues' AND chapter_id = default_chapter_id;

    -- Insert current budget period (Winter 2025 Quarter)
    INSERT INTO budget_periods (chapter_id, name, type, start_date, end_date, fiscal_year, is_current)
    VALUES
        (default_chapter_id, 'Winter 2025', 'Quarter', '2025-01-01', '2025-03-31', 2025, true)
    RETURNING id INTO current_period_id;

    -- Insert sample budgets
    INSERT INTO budgets (chapter_id, category_id, period_id, allocated, notes)
    VALUES
        (default_chapter_id, food_category_id, current_period_id, 2000.00, 'Quarterly food budget'),
        (default_chapter_id, social_category_id, current_period_id, 5000.00, 'Winter quarter social events'),
        (default_chapter_id, dues_category_id, current_period_id, 10000.00, 'Expected dues collection')
    ON CONFLICT DO NOTHING;

    -- Insert sample transactions
    INSERT INTO transactions (chapter_id, date, amount, description, category, source, status)
    VALUES
        (default_chapter_id, CURRENT_DATE, 500.00, 'Monthly Dues Collection - January', 'Income', 'CHASE', 'COMPLETED'),
        (default_chapter_id, CURRENT_DATE - INTERVAL '1 day', -150.00, 'Pizza for Chapter Meeting', 'Food', 'MANUAL', 'COMPLETED'),
        (default_chapter_id, CURRENT_DATE - INTERVAL '2 days', -75.50, 'Office Supplies', 'Supplies', 'CHASE', 'COMPLETED'),
        (default_chapter_id, CURRENT_DATE - INTERVAL '3 days', 1200.00, 'Fundraiser Revenue', 'Income', 'MANUAL', 'COMPLETED')
    ON CONFLICT DO NOTHING;

    -- Insert sample members
    INSERT INTO members (chapter_id, name, email, status, "duesPaid", semester)
    VALUES
        (default_chapter_id, 'John Doe', 'john@example.com', 'Active', true, 'Winter 2025'),
        (default_chapter_id, 'Jane Smith', 'jane@example.com', 'Active', false, 'Winter 2025'),
        (default_chapter_id, 'Bob Johnson', 'bob@example.com', 'Alumni', true, 'Fall 2024'),
        (default_chapter_id, 'Mike Wilson', 'mike@example.com', 'Active', true, 'Winter 2025'),
        (default_chapter_id, 'Chris Lee', 'chris@example.com', 'Active', false, 'Winter 2025')
    ON CONFLICT DO NOTHING;
END $$;

-- 13. Update the chapter's member count
UPDATE chapters
SET member_count = (
    SELECT COUNT(*)
    FROM members
    WHERE chapter_id = chapters.id AND status = 'Active'
);

-- 14. Grant permissions (if using Row Level Security)
-- Uncomment these lines if you want to enable RLS
-- ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE members ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE budget_periods ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Allow all operations" ON chapters FOR ALL USING (true);
-- CREATE POLICY "Allow all operations" ON transactions FOR ALL USING (true);
-- CREATE POLICY "Allow all operations" ON members FOR ALL USING (true);
-- CREATE POLICY "Allow all operations" ON budget_categories FOR ALL USING (true);
-- CREATE POLICY "Allow all operations" ON budget_periods FOR ALL USING (true);
-- CREATE POLICY "Allow all operations" ON budgets FOR ALL USING (true);
-- CREATE POLICY "Allow all operations" ON expenses FOR ALL USING (true);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database setup complete! Tables created: chapters, transactions, members, budget_categories, budget_periods, budgets, expenses';
    RAISE NOTICE 'Sample data has been added for testing.';
END $$;