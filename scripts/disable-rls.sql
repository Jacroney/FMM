-- Disable Row Level Security for now (you can enable it later with proper policies)
ALTER TABLE budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE member_dues DISABLE ROW LEVEL SECURITY;
ALTER TABLE dues_payments DISABLE ROW LEVEL SECURITY;

-- Alternative: If you want to keep RLS enabled but allow all operations temporarily
-- CREATE POLICY "Allow all for budgets" ON budgets FOR ALL USING (true);
-- CREATE POLICY "Allow all for expenses" ON expenses FOR ALL USING (true);
-- CREATE POLICY "Allow all for member_dues" ON member_dues FOR ALL USING (true);
-- CREATE POLICY "Allow all for dues_payments" ON dues_payments FOR ALL USING (true);