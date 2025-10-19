-- ============================================================================
-- CHAPTER DUES STATS VIEW
-- ============================================================================
-- Creates aggregated statistics view for dues dashboard
-- Used by: Dues page, Dashboard, Reports
-- ============================================================================

CREATE OR REPLACE VIEW chapter_dues_stats AS
SELECT
  m.chapter_id,
  bp.name as period_name,
  bp.fiscal_year,

  -- Member counts
  COUNT(DISTINCT md.member_id) as total_members,
  COUNT(DISTINCT CASE WHEN md.status = 'paid' THEN md.member_id END) as members_paid,
  COUNT(DISTINCT CASE WHEN md.status = 'pending' THEN md.member_id END) as members_pending,
  COUNT(DISTINCT CASE WHEN md.status = 'overdue' THEN md.member_id END) as members_overdue,
  COUNT(DISTINCT CASE WHEN md.status = 'partial' THEN md.member_id END) as members_partial,

  -- Financial totals (using existing columns)
  COALESCE(SUM(md.amount_due), 0) as total_expected,
  COALESCE(SUM(md.amount_paid), 0) as total_collected,
  COALESCE(SUM(md.amount_due - md.amount_paid), 0) as total_outstanding,
  0::NUMERIC as total_late_fees, -- Not tracked yet in member_dues table

  -- Payment rate percentage
  CASE
    WHEN COUNT(md.member_id) > 0
    THEN (COUNT(CASE WHEN md.status = 'paid' THEN 1 END)::FLOAT / COUNT(md.member_id)::FLOAT * 100)
    ELSE 0
  END as payment_rate

FROM member_dues md
JOIN members m ON md.member_id = m.id
LEFT JOIN budget_periods bp ON m.chapter_id = bp.chapter_id AND bp.is_current = true
GROUP BY m.chapter_id, bp.name, bp.fiscal_year;

-- Grant access
GRANT SELECT ON chapter_dues_stats TO authenticated;

-- Add comment
COMMENT ON VIEW chapter_dues_stats IS 'Aggregated dues statistics per chapter and period for dashboard analytics';

-- ============================================================================
-- DONE!
-- ============================================================================

SELECT 'chapter_dues_stats view created successfully!' AS status;
