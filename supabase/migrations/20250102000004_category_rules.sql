-- ============================================================================
-- CATEGORY RULES FOR AUTO-CATEGORIZATION
-- ============================================================================
-- This creates smart rules to automatically categorize Plaid transactions
-- Based on merchant names and transaction descriptions
-- ============================================================================

-- NOTE: Make sure you have these categories in your budget_categories table:
-- 'Food & Dining', 'Transportation', 'Office Supplies', 'Entertainment',
-- 'Utilities', 'Travel', 'Membership Dues', 'Event Expenses', 'Uncategorized'

-- ============================================================================
-- FOOD & DINING
-- ============================================================================
INSERT INTO category_rules (source, merchant_pattern, category, priority) VALUES
  ('PLAID', '(?i)(chipotle|qdoba|taco bell|del taco)', 'Food & Dining', 10),
  ('PLAID', '(?i)(pizza|domino|papa john)', 'Food & Dining', 10),
  ('PLAID', '(?i)(starbucks|coffee|dunkin|dutch bros)', 'Food & Dining', 10),
  ('PLAID', '(?i)(mcdonalds|burger king|wendy|five guys)', 'Food & Dining', 10),
  ('PLAID', '(?i)(restaurant|cafe|diner|bistro)', 'Food & Dining', 8),
  ('PLAID', '(?i)(uber eats|doordash|grubhub|postmates)', 'Food & Dining', 10),
  ('PLAID', '(?i)(grocery|safeway|kroger|whole foods|trader joe)', 'Food & Dining', 9);

-- ============================================================================
-- TRANSPORTATION
-- ============================================================================
INSERT INTO category_rules (source, merchant_pattern, category, priority) VALUES
  ('PLAID', '(?i)(uber|lyft|taxi)', 'Transportation', 10),
  ('PLAID', '(?i)(shell|chevron|exxon|mobil|bp|gas station)', 'Transportation', 10),
  ('PLAID', '(?i)(parking|park n fly)', 'Transportation', 10),
  ('PLAID', '(?i)(car wash|auto)', 'Transportation', 8);

-- ============================================================================
-- OFFICE SUPPLIES & EQUIPMENT
-- ============================================================================
INSERT INTO category_rules (source, merchant_pattern, category, priority) VALUES
  ('PLAID', '(?i)(amazon|amzn)', 'Office Supplies', 8),
  ('PLAID', '(?i)(office depot|staples|office max)', 'Office Supplies', 10),
  ('PLAID', '(?i)(best buy|apple store)', 'Office Supplies', 7),
  ('PLAID', '(?i)(target|walmart)', 'Office Supplies', 6);

-- ============================================================================
-- UTILITIES & SERVICES
-- ============================================================================
INSERT INTO category_rules (source, merchant_pattern, category, priority) VALUES
  ('PLAID', '(?i)(verizon|at&t|t-mobile|sprint)', 'Utilities', 10),
  ('PLAID', '(?i)(internet|comcast|spectrum|wifi)', 'Utilities', 10),
  ('PLAID', '(?i)(electric|power|pge|energy)', 'Utilities', 10),
  ('PLAID', '(?i)(water|waste)', 'Utilities', 10);

-- ============================================================================
-- ENTERTAINMENT & EVENTS
-- ============================================================================
INSERT INTO category_rules (source, merchant_pattern, category, priority) VALUES
  ('PLAID', '(?i)(spotify|apple music|youtube premium|netflix|hulu)', 'Entertainment', 10),
  ('PLAID', '(?i)(movie|cinema|theater|ticketmaster|eventbrite)', 'Entertainment', 10),
  ('PLAID', '(?i)(sports|game|concert)', 'Event Expenses', 9);

-- ============================================================================
-- TRAVEL
-- ============================================================================
INSERT INTO category_rules (source, merchant_pattern, category, priority) VALUES
  ('PLAID', '(?i)(airline|airbnb|hotel|motel|expedia|booking.com)', 'Travel', 10),
  ('PLAID', '(?i)(tsa|airport)', 'Travel', 9);

-- ============================================================================
-- MEMBERSHIP & DUES
-- ============================================================================
INSERT INTO category_rules (source, merchant_pattern, category, priority) VALUES
  ('PLAID', '(?i)(membership|dues|subscription)', 'Membership Dues', 10),
  ('PLAID', '(?i)(national|headquarters|hq)', 'Membership Dues', 7);

-- ============================================================================
-- BANKING & TRANSFERS (should usually be ignored/uncategorized)
-- ============================================================================
INSERT INTO category_rules (source, merchant_pattern, category, priority) VALUES
  ('PLAID', '(?i)(transfer|deposit|withdrawal|atm)', 'Uncategorized', 5),
  ('PLAID', '(?i)(fee|charge|interest)', 'Uncategorized', 5);

-- ============================================================================
-- USAGE NOTES
-- ============================================================================

-- View all rules:
-- SELECT * FROM category_rules ORDER BY priority DESC, created_at;

-- Test a merchant pattern:
-- SELECT category FROM category_rules
-- WHERE 'Chipotle Mexican Grill' ~* merchant_pattern
-- ORDER BY priority DESC LIMIT 1;

-- Delete specific rule:
-- DELETE FROM category_rules WHERE id = 'rule-uuid';

-- Update rule priority:
-- UPDATE category_rules SET priority = 15 WHERE merchant_pattern = '(?i)(chipotle)';
