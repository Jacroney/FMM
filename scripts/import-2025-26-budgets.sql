-- ============================================
-- IMPORT 2025-26 BUDGET ALLOCATIONS
-- ============================================
-- Run this script after running reset-for-2025-26.sql

-- First, ensure we have all the budget periods we need
-- (These should already exist from the reset script)

-- Get the period IDs for easier reference
DO $$
DECLARE
    fall_2025_id UUID;
    winter_2026_id UUID;
    spring_2026_id UUID;
    summer_2026_id UUID;
BEGIN
    -- Get period IDs
    SELECT id INTO fall_2025_id FROM budget_periods WHERE name = 'Fall 2025';
    SELECT id INTO winter_2026_id FROM budget_periods WHERE name = 'Winter 2026';
    SELECT id INTO spring_2026_id FROM budget_periods WHERE name = 'Spring 2026';
    SELECT id INTO summer_2026_id FROM budget_periods WHERE name = 'Summer 2026';

    -- Example budget allocations - UPDATE THESE VALUES WITH YOUR ACTUAL BUDGET

    -- FALL 2025 BUDGET ALLOCATIONS
    INSERT INTO budgets (category_id, period_id, allocated, notes) VALUES
    -- Fixed Costs
    ((SELECT id FROM budget_categories WHERE name = 'Rent'), fall_2025_id, 5000.00, 'Fall quarter rent'),
    ((SELECT id FROM budget_categories WHERE name = 'Utilities'), fall_2025_id, 800.00, 'Electricity, water, internet'),
    ((SELECT id FROM budget_categories WHERE name = 'Insurance'), fall_2025_id, 600.00, 'Liability insurance'),
    ((SELECT id FROM budget_categories WHERE name = 'National Dues'), fall_2025_id, 1200.00, 'National fraternity dues'),

    -- Operational Costs
    ((SELECT id FROM budget_categories WHERE name = 'Food & Catering'), fall_2025_id, 2000.00, 'Brotherhood meals and events'),
    ((SELECT id FROM budget_categories WHERE name = 'Supplies'), fall_2025_id, 500.00, 'General supplies'),
    ((SELECT id FROM budget_categories WHERE name = 'Maintenance'), fall_2025_id, 800.00, 'House maintenance'),
    ((SELECT id FROM budget_categories WHERE name = 'Transportation'), fall_2025_id, 300.00, 'Travel expenses'),

    -- Event Costs
    ((SELECT id FROM budget_categories WHERE name = 'Social Events'), fall_2025_id, 1500.00, 'Fall social events'),
    ((SELECT id FROM budget_categories WHERE name = 'Formal Events'), fall_2025_id, 2500.00, 'Fall formal'),
    ((SELECT id FROM budget_categories WHERE name = 'Philanthropy'), fall_2025_id, 800.00, 'Charitable events'),
    ((SELECT id FROM budget_categories WHERE name = 'Brotherhood Events'), fall_2025_id, 600.00, 'Brotherhood activities')

    ON CONFLICT (category_id, period_id) DO UPDATE SET
        allocated = EXCLUDED.allocated,
        notes = EXCLUDED.notes,
        updated_at = NOW();

    -- WINTER 2026 BUDGET ALLOCATIONS
    INSERT INTO budgets (category_id, period_id, allocated, notes) VALUES
    -- Fixed Costs (typically same as fall)
    ((SELECT id FROM budget_categories WHERE name = 'Rent'), winter_2026_id, 5000.00, 'Winter quarter rent'),
    ((SELECT id FROM budget_categories WHERE name = 'Utilities'), winter_2026_id, 900.00, 'Higher heating costs'),
    ((SELECT id FROM budget_categories WHERE name = 'Insurance'), winter_2026_id, 600.00, 'Liability insurance'),
    ((SELECT id FROM budget_categories WHERE name = 'National Dues'), winter_2026_id, 1200.00, 'National fraternity dues'),

    -- Operational Costs
    ((SELECT id FROM budget_categories WHERE name = 'Food & Catering'), winter_2026_id, 1800.00, 'Winter events'),
    ((SELECT id FROM budget_categories WHERE name = 'Supplies'), winter_2026_id, 400.00, 'General supplies'),
    ((SELECT id FROM budget_categories WHERE name = 'Maintenance'), winter_2026_id, 700.00, 'Winter maintenance'),
    ((SELECT id FROM budget_categories WHERE name = 'Transportation'), winter_2026_id, 250.00, 'Travel expenses'),

    -- Event Costs
    ((SELECT id FROM budget_categories WHERE name = 'Social Events'), winter_2026_id, 1200.00, 'Winter social events'),
    ((SELECT id FROM budget_categories WHERE name = 'Formal Events'), winter_2026_id, 3000.00, 'Winter formal'),
    ((SELECT id FROM budget_categories WHERE name = 'Philanthropy'), winter_2026_id, 600.00, 'Winter charity events'),
    ((SELECT id FROM budget_categories WHERE name = 'Brotherhood Events'), winter_2026_id, 500.00, 'Brotherhood activities')

    ON CONFLICT (category_id, period_id) DO UPDATE SET
        allocated = EXCLUDED.allocated,
        notes = EXCLUDED.notes,
        updated_at = NOW();

    -- SPRING 2026 BUDGET ALLOCATIONS
    INSERT INTO budgets (category_id, period_id, allocated, notes) VALUES
    -- Fixed Costs
    ((SELECT id FROM budget_categories WHERE name = 'Rent'), spring_2026_id, 5000.00, 'Spring quarter rent'),
    ((SELECT id FROM budget_categories WHERE name = 'Utilities'), spring_2026_id, 750.00, 'Spring utilities'),
    ((SELECT id FROM budget_categories WHERE name = 'Insurance'), spring_2026_id, 600.00, 'Liability insurance'),
    ((SELECT id FROM budget_categories WHERE name = 'National Dues'), spring_2026_id, 1200.00, 'National fraternity dues'),

    -- Operational Costs
    ((SELECT id FROM budget_categories WHERE name = 'Food & Catering'), spring_2026_id, 2200.00, 'Spring events and recruitment'),
    ((SELECT id FROM budget_categories WHERE name = 'Supplies'), spring_2026_id, 600.00, 'Spring supplies'),
    ((SELECT id FROM budget_categories WHERE name = 'Maintenance'), spring_2026_id, 1000.00, 'Spring cleaning and repairs'),
    ((SELECT id FROM budget_categories WHERE name = 'Transportation'), spring_2026_id, 400.00, 'Spring break and events'),

    -- Event Costs
    ((SELECT id FROM budget_categories WHERE name = 'Social Events'), spring_2026_id, 1800.00, 'Spring social events'),
    ((SELECT id FROM budget_categories WHERE name = 'Formal Events'), spring_2026_id, 2800.00, 'Spring formal'),
    ((SELECT id FROM budget_categories WHERE name = 'Philanthropy'), spring_2026_id, 1000.00, 'Spring philanthropy'),
    ((SELECT id FROM budget_categories WHERE name = 'Brotherhood Events'), spring_2026_id, 700.00, 'Brotherhood activities')

    ON CONFLICT (category_id, period_id) DO UPDATE SET
        allocated = EXCLUDED.allocated,
        notes = EXCLUDED.notes,
        updated_at = NOW();

    -- SUMMER 2026 BUDGET ALLOCATIONS (typically lower)
    INSERT INTO budgets (category_id, period_id, allocated, notes) VALUES
    -- Fixed Costs
    ((SELECT id FROM budget_categories WHERE name = 'Rent'), summer_2026_id, 3000.00, 'Reduced summer rent'),
    ((SELECT id FROM budget_categories WHERE name = 'Utilities'), summer_2026_id, 600.00, 'Summer utilities'),
    ((SELECT id FROM budget_categories WHERE name = 'Insurance'), summer_2026_id, 600.00, 'Liability insurance'),
    ((SELECT id FROM budget_categories WHERE name = 'National Dues'), summer_2026_id, 800.00, 'Reduced summer dues'),

    -- Operational Costs
    ((SELECT id FROM budget_categories WHERE name = 'Food & Catering'), summer_2026_id, 800.00, 'Limited summer events'),
    ((SELECT id FROM budget_categories WHERE name = 'Supplies'), summer_2026_id, 200.00, 'Minimal supplies'),
    ((SELECT id FROM budget_categories WHERE name = 'Maintenance'), summer_2026_id, 1200.00, 'Summer maintenance projects'),
    ((SELECT id FROM budget_categories WHERE name = 'Transportation'), summer_2026_id, 200.00, 'Limited travel'),

    -- Event Costs
    ((SELECT id FROM budget_categories WHERE name = 'Social Events'), summer_2026_id, 600.00, 'Summer social events'),
    ((SELECT id FROM budget_categories WHERE name = 'Formal Events'), summer_2026_id, 0.00, 'No summer formal'),
    ((SELECT id FROM budget_categories WHERE name = 'Philanthropy'), summer_2026_id, 300.00, 'Summer charity'),
    ((SELECT id FROM budget_categories WHERE name = 'Brotherhood Events'), summer_2026_id, 400.00, 'Summer brotherhood')

    ON CONFLICT (category_id, period_id) DO UPDATE SET
        allocated = EXCLUDED.allocated,
        notes = EXCLUDED.notes,
        updated_at = NOW();

END $$;

-- Verification: Show the budget summary
SELECT
    bp.name as period,
    bp.start_date,
    bp.end_date,
    bc.name as category,
    bc.type as category_type,
    b.allocated,
    b.notes
FROM budgets b
JOIN budget_categories bc ON b.category_id = bc.id
JOIN budget_periods bp ON b.period_id = bp.id
WHERE bp.fiscal_year IN (2025, 2026)
ORDER BY bp.start_date, bc.type, bc.name;