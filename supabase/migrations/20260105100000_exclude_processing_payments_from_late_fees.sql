-- Update late fee functions to exclude members with processing or requires_action payments
-- This prevents applying late fees to members who have pending payments

-- Update the main apply_late_fees function
CREATE OR REPLACE FUNCTION apply_late_fees(
  p_chapter_id UUID,
  p_config_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config RECORD;
  v_applied INTEGER := 0;
  v_due_record RECORD;
  v_late_fee NUMERIC;
BEGIN
  -- Get the dues configuration
  SELECT * INTO v_config
  FROM dues_configuration
  WHERE id = p_config_id AND chapter_id = p_chapter_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'applied', 0, 'error', 'Configuration not found');
  END IF;

  -- Check if late fees are enabled
  IF NOT v_config.late_fee_enabled THEN
    RETURN jsonb_build_object('success', false, 'applied', 0, 'error', 'Late fees are not enabled');
  END IF;

  -- Find all overdue dues that haven't had late fees applied
  -- Respects grace period before applying fees
  -- EXCLUDES members with processing or requires_action payment intents
  FOR v_due_record IN
    SELECT md.* FROM member_dues md
    WHERE md.chapter_id = p_chapter_id
      AND md.config_id = p_config_id
      AND md.status IN ('pending', 'partial', 'overdue')
      AND md.balance > 0
      AND md.late_fee_applied_date IS NULL
      AND md.due_date IS NOT NULL
      AND md.due_date + COALESCE(v_config.late_fee_grace_days, 0) < CURRENT_DATE
      -- Exclude members with pending/processing/requires_action payments
      AND NOT EXISTS (
        SELECT 1 FROM payment_intents pi
        WHERE pi.member_dues_id = md.id
          AND pi.status IN ('pending', 'processing', 'requires_action')
      )
  LOOP
    -- Calculate late fee based on type
    IF v_config.late_fee_type = 'flat' THEN
      -- Flat fee, capped at $100 for security
      v_late_fee := LEAST(COALESCE(v_config.late_fee_amount, 0), 100);
    ELSE
      -- Percentage fee, capped at 25% for security
      v_late_fee := LEAST(
        v_due_record.balance * (COALESCE(v_config.late_fee_amount, 0) / 100),
        v_due_record.balance * 0.25
      );
    END IF;

    -- Round to 2 decimal places
    v_late_fee := ROUND(v_late_fee, 2);

    -- Skip if late fee would be 0 or negative
    IF v_late_fee <= 0 THEN
      CONTINUE;
    END IF;

    -- Apply late fee to the dues record
    UPDATE member_dues
    SET
      late_fee = COALESCE(late_fee, 0) + v_late_fee,
      total_amount = total_amount + v_late_fee,
      balance = balance + v_late_fee,
      late_fee_applied_date = CURRENT_DATE,
      status = 'overdue',
      updated_at = NOW()
    WHERE id = v_due_record.id;

    v_applied := v_applied + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'applied', v_applied);
END;
$$;

-- Update preview_custom_late_fee to exclude members with processing payments
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
    -- Exclude members with pending/processing/requires_action payments
    AND NOT EXISTS (
      SELECT 1 FROM payment_intents pi
      WHERE pi.member_dues_id = md.id
        AND pi.status IN ('pending', 'processing', 'requires_action')
    )
  ORDER BY md.email;
END;
$$;

-- Update apply_custom_late_fee to exclude members with processing payments
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

  UPDATE member_dues md
  SET
    late_fee = COALESCE(md.late_fee, 0) + p_late_fee_amount,
    total_amount = md.total_amount + p_late_fee_amount,
    balance = md.balance + p_late_fee_amount,
    late_fee_applied_date = COALESCE(md.late_fee_applied_date, CURRENT_DATE),
    updated_at = NOW()
  WHERE md.chapter_id = p_chapter_id
    AND md.status NOT IN ('paid', 'waived')
    AND (NOT p_exclude_partial OR md.status != 'partial')
    AND (p_target_balances IS NULL OR md.balance = ANY(p_target_balances))
    AND md.late_fee = 0
    -- Exclude members with pending/processing/requires_action payments
    AND NOT EXISTS (
      SELECT 1 FROM payment_intents pi
      WHERE pi.member_dues_id = md.id
        AND pi.status IN ('pending', 'processing', 'requires_action')
    );

  GET DIAGNOSTICS v_applied = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'applied', v_applied);
END;
$$;

-- Grant execute permissions (already granted, but ensuring they persist)
GRANT EXECUTE ON FUNCTION apply_late_fees(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION preview_custom_late_fee(UUID, NUMERIC[], BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION apply_custom_late_fee(UUID, NUMERIC, NUMERIC[], BOOLEAN) TO authenticated;
