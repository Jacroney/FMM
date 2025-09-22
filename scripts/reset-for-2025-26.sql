-- ============================================
-- RESET DATABASE FOR 2025-26 ACADEMIC YEAR
-- ============================================
-- This script will:
-- 1. Delete all 2024-25 fiscal year data
-- 2. Set up new budget periods for 2025-26
-- 3. Reset member data for new year

-- ============================================
-- 1. DELETE 2024-25 DATA
-- ============================================

-- Delete dues payments first (references member_dues)
DELETE FROM dues_payments
WHERE member_dues_id IN (
  SELECT md.id FROM member_dues md
  JOIN budget_periods bp ON md.period_id = bp.id
  WHERE bp.fiscal_year IN (2024, 2025)
);

-- Delete member dues for 2024-25
DELETE FROM member_dues
WHERE period_id IN (
  SELECT id FROM budget_periods
  WHERE fiscal_year IN (2024, 2025)
);

-- Delete expenses for 2024-25
DELETE FROM expenses
WHERE period_id IN (
  SELECT id FROM budget_periods
  WHERE fiscal_year IN (2024, 2025)
);

-- Delete budgets for 2024-25
DELETE FROM budgets
WHERE period_id IN (
  SELECT id FROM budget_periods
  WHERE fiscal_year IN (2024, 2025)
);

-- Delete budget periods for 2024-25
DELETE FROM budget_periods
WHERE fiscal_year IN (2024, 2025);

-- Reset member data for new academic year
UPDATE members
SET
  dues_paid = false,
  payment_date = NULL,
  semester = '2025-26',
  last_updated = NOW()
WHERE status = 'Active';

-- ============================================
-- 2. CREATE 2025-26 BUDGET PERIODS
-- ============================================

INSERT INTO budget_periods (name, type, start_date, end_date, fiscal_year, is_current) VALUES
  -- Fall 2025 (current quarter)
  ('Fall 2025', 'Quarter', '2025-09-01', '2025-11-30', 2025, true),

  -- Winter 2026
  ('Winter 2026', 'Quarter', '2025-12-01', '2026-02-28', 2026, false),

  -- Spring 2026
  ('Spring 2026', 'Quarter', '2026-03-01', '2026-05-31', 2026, false),

  -- Summer 2026
  ('Summer 2026', 'Quarter', '2026-06-01', '2026-08-31', 2026, false)
ON CONFLICT (name, fiscal_year) DO NOTHING;

-- ============================================
-- 3. ENSURE BUDGET CATEGORIES EXIST
-- ============================================

-- Insert standard budget categories if they don't exist
INSERT INTO budget_categories (name, type, description, is_active) VALUES
  -- Fixed Costs
  ('Rent', 'Fixed Costs', 'Monthly chapter house rent', true),
  ('Utilities', 'Fixed Costs', 'Electricity, water, gas, internet', true),
  ('Insurance', 'Fixed Costs', 'Liability and property insurance', true),
  ('National Dues', 'Fixed Costs', 'Dues to national fraternity', true),

  -- Operational Costs
  ('Food & Catering', 'Operational Costs', 'Meals and event catering', true),
  ('Supplies', 'Operational Costs', 'General supplies and materials', true),
  ('Maintenance', 'Operational Costs', 'House and property maintenance', true),
  ('Transportation', 'Operational Costs', 'Travel and transportation costs', true),

  -- Event Costs
  ('Social Events', 'Event Costs', 'Parties and social gatherings', true),
  ('Formal Events', 'Event Costs', 'Formal dinners and dances', true),
  ('Philanthropy', 'Event Costs', 'Charitable events and donations', true),
  ('Brotherhood Events', 'Event Costs', 'Member bonding activities', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 4. VERIFICATION QUERIES
-- ============================================

-- Verify the reset worked correctly
SELECT 'Budget Periods for 2025-26:' as info;
SELECT name, type, start_date, end_date, fiscal_year, is_current
FROM budget_periods
WHERE fiscal_year IN (2025, 2026)
ORDER BY start_date;

SELECT 'Active Budget Categories:' as info;
SELECT name, type, description
FROM budget_categories
WHERE is_active = true
ORDER BY type, name;

SELECT 'Member Status Summary:' as info;
SELECT
  status,
  COUNT(*) as count,
  COUNT(CASE WHEN dues_paid = true THEN 1 END) as dues_paid_count
FROM members
GROUP BY status;

-- Show what data remains (should be minimal)
SELECT 'Remaining Data Summary:' as info;
SELECT
  'budgets' as table_name, COUNT(*) as count FROM budgets
UNION ALL
SELECT 'expenses' as table_name, COUNT(*) as count FROM expenses
UNION ALL
SELECT 'member_dues' as table_name, COUNT(*) as count FROM member_dues
UNION ALL
SELECT 'dues_payments' as table_name, COUNT(*) as count FROM dues_payments;