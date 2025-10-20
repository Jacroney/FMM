-- ============================================================================
-- SEED CAL POLY CHAPTERS WITH BRANDING
-- ============================================================================
-- Creates 5 Cal Poly chapters with unique branding (colors, greek letters)
-- UPDATED: Now uses fraternity_id foreign key instead of fraternity_name
-- ============================================================================

-- Insert Cal Poly chapters with branding (using new schema)
-- Note: This requires fraternities table to exist first
-- Run migration 20250120000003_create_fraternities_table.sql first

INSERT INTO chapters (
  name,
  school,
  member_count,
  fraternity_id,
  greek_letters,
  primary_color,
  secondary_color,
  accent_color
)
SELECT
  'Cal Poly - Sigma Chi',
  'California Polytechnic State University',
  75,
  f.id,
  'ΣΧ',
  '#1E40AF',
  '#3B82F6',
  '#60A5FA'
FROM fraternities f
WHERE f.name = 'Sigma Chi'
ON CONFLICT DO NOTHING;

INSERT INTO chapters (
  name,
  school,
  member_count,
  fraternity_id,
  greek_letters,
  primary_color,
  secondary_color,
  accent_color
)
SELECT
  'Cal Poly - Pike',
  'California Polytechnic State University',
  68,
  f.id,
  'ΠΚΑ',
  '#991B1B',
  '#DC2626',
  '#F87171'
FROM fraternities f
WHERE f.name = 'Pi Kappa Alpha'
ON CONFLICT DO NOTHING;

INSERT INTO chapters (
  name,
  school,
  member_count,
  fraternity_id,
  greek_letters,
  primary_color,
  secondary_color,
  accent_color
)
SELECT
  'Cal Poly - Lambda Chi',
  'California Polytechnic State University',
  82,
  f.id,
  'ΛΧΑ',
  '#065F46',
  '#059669',
  '#34D399'
FROM fraternities f
WHERE f.name = 'Lambda Chi Alpha'
ON CONFLICT DO NOTHING;

INSERT INTO chapters (
  name,
  school,
  member_count,
  fraternity_id,
  greek_letters,
  primary_color,
  secondary_color,
  accent_color
)
SELECT
  'Cal Poly - SigEp',
  'California Polytechnic State University',
  71,
  f.id,
  'ΣΦΕ',
  '#7C2D12',
  '#DC2626',
  '#FBBF24'
FROM fraternities f
WHERE f.name = 'Sigma Phi Epsilon'
ON CONFLICT DO NOTHING;

INSERT INTO chapters (
  name,
  school,
  member_count,
  fraternity_id,
  greek_letters,
  primary_color,
  secondary_color,
  accent_color
)
SELECT
  'Cal Poly - Theta Chi',
  'California Polytechnic State University',
  65,
  f.id,
  'ΘΧ',
  '#7C3AED',
  '#A78BFA',
  '#DDD6FE'
FROM fraternities f
WHERE f.name = 'Theta Chi'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- View all chapters with their fraternity branding
SELECT
  c.name AS chapter_name,
  c.school,
  f.name AS fraternity_name,
  f.greek_letters AS fraternity_letters,
  c.greek_letters AS chapter_letters_override,
  c.primary_color,
  c.secondary_color,
  c.accent_color,
  c.member_count
FROM chapters c
LEFT JOIN fraternities f ON c.fraternity_id = f.id
WHERE c.school = 'California Polytechnic State University'
ORDER BY c.name;

-- ============================================================================
-- DONE!
-- ============================================================================

SELECT 'Cal Poly chapters seeded successfully!' AS status;
SELECT COUNT(*) AS total_chapters
FROM chapters
WHERE school = 'California Polytechnic State University';
