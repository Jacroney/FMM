-- Create functions for applying custom late fees with preview capability
-- Used by treasurer to apply late fees to specific balance amounts

-- Preview function: Returns list of members who would be affected
CREATE OR REPLACE FUNCTION preview_custom_late_fee(
  p_chapter_id UUID,
  p_target_balances NUMERIC[] DEFAULT NULL,
  p_exclude_partial BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(
  id UUID,
  email TEXT,
  member_name TEXT,
  current_balance NUMERIC,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    md.id,
    md.email,
    COALESCE(up.full_name, md.email) as member_name,
    md.balance as current_balance,
    md.status::TEXT
  FROM member_dues md
  LEFT JOIN user_profiles up ON md.member_id = up.id
  WHERE md.chapter_id = p_chapter_id
    AND md.status NOT IN ('paid', 'waived')
    AND (NOT p_exclude_partial OR md.status != 'partial')
    AND (p_target_balances IS NULL OR md.balance = ANY(p_target_balances))
    AND md.late_fee = 0
  ORDER BY md.email;
END;
$$;

-- Apply function: Applies late fee to matching members
CREATE OR REPLACE FUNCTION apply_custom_late_fee(
  p_chapter_id UUID,
  p_late_fee_amount NUMERIC,
  p_target_balances NUMERIC[] DEFAULT NULL,
  p_exclude_partial BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_applied INTEGER := 0;
BEGIN
  -- Validate inputs
  IF p_late_fee_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'applied', 0, 'error', 'Late fee amount must be positive');
  END IF;

  IF p_late_fee_amount > 500 THEN
    RETURN jsonb_build_object('success', false, 'applied', 0, 'error', 'Late fee amount exceeds maximum allowed ($500)');
  END IF;

  UPDATE member_dues
  SET
    late_fee = COALESCE(late_fee, 0) + p_late_fee_amount,
    total_amount = total_amount + p_late_fee_amount,
    balance = balance + p_late_fee_amount,
    late_fee_applied_date = COALESCE(late_fee_applied_date, CURRENT_DATE),
    updated_at = NOW()
  WHERE chapter_id = p_chapter_id
    AND status NOT IN ('paid', 'waived')
    AND (NOT p_exclude_partial OR status != 'partial')
    AND (p_target_balances IS NULL OR balance = ANY(p_target_balances))
    AND late_fee = 0;

  GET DIAGNOSTICS v_applied = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'applied', v_applied);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION preview_custom_late_fee(UUID, NUMERIC[], BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION apply_custom_late_fee(UUID, NUMERIC, NUMERIC[], BOOLEAN) TO authenticated;
