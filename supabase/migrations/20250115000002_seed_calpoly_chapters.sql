-- ============================================================================
-- SEED CAL POLY CHAPTERS WITH BRANDING
-- ============================================================================
-- Creates 5 Cal Poly chapters with unique branding (colors, greek letters)
-- ============================================================================

-- Insert Cal Poly chapters with branding
INSERT INTO chapters (
  id,
  name,
  school,
  member_count,
  fraternity_name,
  greek_letters,
  primary_color,
  secondary_color,
  accent_color,
  theme_config
) VALUES
  -- Sigma Chi at Cal Poly
  (
    gen_random_uuid(),
    'Cal Poly - Sigma Chi',
    'California Polytechnic State University',
    75,
    'Sigma Chi',
    'ΣΧ',
    '#1E40AF', -- Navy blue (blue-800)
    '#3B82F6', -- Bright blue (blue-500)
    '#60A5FA', -- Light blue (blue-400)
    '{"fontFamily": "system-ui", "borderRadius": "md"}'::jsonb
  ),

  -- Pi Kappa Alpha at Cal Poly
  (
    gen_random_uuid(),
    'Cal Poly - Pike',
    'California Polytechnic State University',
    68,
    'Pi Kappa Alpha',
    'ΠΚΑ',
    '#991B1B', -- Maroon/Garnet (red-800)
    '#DC2626', -- Red (red-600)
    '#F87171', -- Light red (red-400)
    '{"fontFamily": "system-ui", "borderRadius": "lg"}'::jsonb
  ),

  -- Lambda Chi Alpha at Cal Poly
  (
    gen_random_uuid(),
    'Cal Poly - Lambda Chi',
    'California Polytechnic State University',
    82,
    'Lambda Chi Alpha',
    'ΛΧΑ',
    '#065F46', -- Deep green (emerald-800)
    '#059669', -- Green (emerald-600)
    '#34D399', -- Light green (emerald-400)
    '{"fontFamily": "system-ui", "borderRadius": "md"}'::jsonb
  ),

  -- Sigma Phi Epsilon at Cal Poly
  (
    gen_random_uuid(),
    'Cal Poly - SigEp',
    'California Polytechnic State University',
    71,
    'Sigma Phi Epsilon',
    'ΣΦΕ',
    '#7C2D12', -- Cardinal red (red-900)
    '#DC2626', -- Red (red-600)
    '#FBBF24', -- Gold/Yellow (amber-400)
    '{"fontFamily": "system-ui", "borderRadius": "sm"}'::jsonb
  ),

  -- Theta Chi at Cal Poly
  (
    gen_random_uuid(),
    'Cal Poly - Theta Chi',
    'California Polytechnic State University',
    65,
    'Theta Chi',
    'ΘΧ',
    '#7C3AED', -- Purple (violet-600)
    '#A78BFA', -- Light purple (violet-400)
    '#DDD6FE', -- Very light purple (violet-200)
    '{"fontFamily": "system-ui", "borderRadius": "xl"}'::jsonb
  )

ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- HELPFUL QUERIES
-- ============================================================================

-- View all chapters with their branding
-- SELECT name, greek_letters, primary_color, secondary_color, accent_color
-- FROM chapters
-- WHERE school = 'California Polytechnic State University'
-- ORDER BY name;

-- Update a specific chapter's branding
-- UPDATE chapters
-- SET
--   primary_color = '#NEW_COLOR',
--   secondary_color = '#NEW_COLOR',
--   accent_color = '#NEW_COLOR'
-- WHERE name = 'Chapter Name';

-- ============================================================================
-- DONE!
-- ============================================================================

SELECT 'Cal Poly chapters seeded successfully!' AS status;
SELECT COUNT(*) AS total_chapters
FROM chapters
WHERE school = 'California Polytechnic State University';
