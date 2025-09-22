-- ============================================
-- FRATERNITY FINANCIAL MANAGEMENT SCHEMA
-- ============================================

-- 1. MEMBERS TABLE (Required for member_dues)
-- Track fraternity members
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Alumni')),
  dues_paid BOOLEAN DEFAULT false,
  payment_date DATE,
  semester TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. BUDGET CATEGORIES
-- Defines the different types of budget categories
CREATE TABLE IF NOT EXISTS budget_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('Fixed Costs', 'Operational Costs', 'Event Costs')),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. BUDGET PERIODS
-- Defines fiscal periods (quarters, semesters, etc.)
CREATE TABLE IF NOT EXISTS budget_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Quarter', 'Semester', 'Year')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  fiscal_year INTEGER NOT NULL,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, fiscal_year)
);

-- 4. BUDGETS
-- Main budget allocations by category and period
CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES budget_categories(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES budget_periods(id) ON DELETE CASCADE,
  allocated DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category_id, period_id)
);

-- 5. EXPENSES
-- Actual expenses/transactions
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL,
  category_id UUID NOT NULL REFERENCES budget_categories(id),
  period_id UUID NOT NULL REFERENCES budget_periods(id),
  amount DECIMAL(12,2) NOT NULL,
  description TEXT NOT NULL,
  transaction_date DATE NOT NULL,
  vendor TEXT,
  receipt_url TEXT,
  payment_method TEXT CHECK (payment_method IN ('Cash', 'Check', 'Credit Card', 'ACH', 'Venmo', 'Other')),
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_by UUID, -- Reference to users table if you have one
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. MEMBER DUES
-- Track individual member dues and payments
CREATE TABLE IF NOT EXISTS member_dues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES budget_periods(id) ON DELETE CASCADE,
  amount_due DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'waived', 'overdue')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(member_id, period_id)
);

-- 7. DUES PAYMENTS
-- Individual payment records for member dues
CREATE TABLE IF NOT EXISTS dues_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_dues_id UUID NOT NULL REFERENCES member_dues(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('Cash', 'Check', 'Venmo', 'Zelle', 'Credit Card', 'Other')),
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- VIEWS FOR EASIER QUERYING
-- ============================================

-- Budget Summary View
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
    WHEN b.allocated > 0 THEN ROUND((COALESCE(SUM(e.amount), 0) / b.allocated * 100)::numeric, 2)
    ELSE 0
  END as percent_used
FROM budgets b
JOIN budget_categories bc ON b.category_id = bc.id
JOIN budget_periods bp ON b.period_id = bp.id
LEFT JOIN expenses e ON e.budget_id = b.id AND e.status = 'completed'
GROUP BY bp.name, bp.type, bp.fiscal_year, bp.start_date, bc.name, bc.type, b.allocated, b.id
ORDER BY bp.start_date, bc.type, bc.name;

-- Member Dues Summary View
CREATE OR REPLACE VIEW member_dues_summary AS
SELECT
  m.name as member_name,
  m.email,
  m.status as member_status,
  bp.name as period,
  bp.fiscal_year,
  md.amount_due,
  md.amount_paid,
  md.amount_due - md.amount_paid as balance,
  md.status as payment_status,
  md.due_date
FROM member_dues md
JOIN members m ON md.member_id = m.id
JOIN budget_periods bp ON md.period_id = bp.id
ORDER BY bp.start_date DESC, m.name;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_expenses_budget_id ON expenses(budget_id);
CREATE INDEX idx_expenses_transaction_date ON expenses(transaction_date);
CREATE INDEX idx_expenses_category_period ON expenses(category_id, period_id);
CREATE INDEX idx_dues_payments_member_dues_id ON dues_payments(member_dues_id);
CREATE INDEX idx_member_dues_status ON member_dues(status);
CREATE INDEX idx_budget_periods_current ON budget_periods(is_current) WHERE is_current = true;

-- ============================================
-- ROW LEVEL SECURITY (Optional but recommended)
-- ============================================

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE dues_payments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_member_dues_updated_at BEFORE UPDATE ON member_dues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA FOR BUDGET PERIODS (2024-2025)
-- ============================================

INSERT INTO budget_periods (name, type, start_date, end_date, fiscal_year, is_current) VALUES
  ('Fall', 'Quarter', '2024-09-01', '2024-12-31', 2024, false),
  ('Winter', 'Quarter', '2025-01-01', '2025-03-31', 2025, true),
  ('Spring', 'Quarter', '2025-04-01', '2025-06-30', 2025, false)
ON CONFLICT (name, fiscal_year) DO NOTHING;

-- ============================================
-- HELPFUL QUERIES
-- ============================================

-- Get current period budget status
-- SELECT * FROM budget_summary WHERE fiscal_year = 2024;

-- Get overdue member dues
-- SELECT * FROM member_dues_summary WHERE payment_status = 'overdue' OR (payment_status IN ('pending', 'partial') AND due_date < CURRENT_DATE);

-- Get expenses by category for current period
-- SELECT bc.name, SUM(e.amount) as total
-- FROM expenses e
-- JOIN budget_categories bc ON e.category_id = bc.id
-- JOIN budget_periods bp ON e.period_id = bp.id
-- WHERE bp.is_current = true
-- GROUP BY bc.name
-- ORDER BY total DESC;