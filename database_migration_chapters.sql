-- Add chapters table and chapter_id to existing tables
-- Run this in your Supabase SQL Editor

-- 1. Create chapters table
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

-- 2. Add chapter_id to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_transactions_chapter ON transactions(chapter_id);

-- 3. Add chapter_id to members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_members_chapter ON members(chapter_id);

-- 4. Add chapter_id to budget tables (if they exist)
ALTER TABLE budget_categories ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_budget_categories_chapter ON budget_categories(chapter_id);

ALTER TABLE budget_periods ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_budget_periods_chapter ON budget_periods(chapter_id);

ALTER TABLE budgets ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_budgets_chapter ON budgets(chapter_id);

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_expenses_chapter ON expenses(chapter_id);

-- 5. Insert a default chapter for existing data
INSERT INTO chapters (name, school, member_count, fraternity_name)
VALUES ('Alpha Beta', 'University Example', 0, 'Kappa Sigma')
ON CONFLICT DO NOTHING;

-- 6. Update existing records to use the default chapter
-- Get the ID of the default chapter
DO $$
DECLARE
    default_chapter_id UUID;
BEGIN
    SELECT id INTO default_chapter_id FROM chapters LIMIT 1;

    -- Update existing transactions
    UPDATE transactions SET chapter_id = default_chapter_id WHERE chapter_id IS NULL;

    -- Update existing members
    UPDATE members SET chapter_id = default_chapter_id WHERE chapter_id IS NULL;

    -- Update existing budget data (if exists)
    UPDATE budget_categories SET chapter_id = default_chapter_id WHERE chapter_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budget_categories');
    UPDATE budget_periods SET chapter_id = default_chapter_id WHERE chapter_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budget_periods');
    UPDATE budgets SET chapter_id = default_chapter_id WHERE chapter_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budgets');
    UPDATE expenses SET chapter_id = default_chapter_id WHERE chapter_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses');
END $$;

-- 7. Make chapter_id NOT NULL after updating existing data
ALTER TABLE transactions ALTER COLUMN chapter_id SET NOT NULL;
ALTER TABLE members ALTER COLUMN chapter_id SET NOT NULL;

-- 8. Create function to automatically update member count
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

-- 9. Create trigger to automatically update member count
CREATE TRIGGER trigger_update_chapter_member_count
    AFTER INSERT OR UPDATE OR DELETE ON members
    FOR EACH ROW
    EXECUTE FUNCTION update_chapter_member_count();

-- 10. Update the initial chapter's member count
UPDATE chapters
SET member_count = (
    SELECT COUNT(*)
    FROM members
    WHERE chapter_id = chapters.id AND status = 'Active'
);

-- Enable Row Level Security (optional)
-- ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations" ON chapters FOR ALL USING (true);