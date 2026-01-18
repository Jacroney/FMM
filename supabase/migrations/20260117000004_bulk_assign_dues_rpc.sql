-- ============================================================================
-- BULK ASSIGN DUES RPC FUNCTION
-- ============================================================================
-- This function allows admins to assign dues to multiple members at once,
-- filtered by year and status.
-- ============================================================================

CREATE OR REPLACE FUNCTION bulk_assign_dues(
  p_chapter_id uuid,
  p_config_id uuid,
  p_amount numeric,
  p_year_filter text DEFAULT NULL,
  p_status_filter text DEFAULT NULL,
  p_due_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member RECORD;
  v_assigned int := 0;
  v_skipped int := 0;
  v_errors text[] := ARRAY[]::text[];
BEGIN
  -- Verify caller has permission (admin, treasurer, or exec for this chapter)
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
      AND chapter_id = p_chapter_id
      AND role IN ('admin', 'treasurer', 'exec')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Permission denied',
      'assigned', 0,
      'skipped', 0
    );
  END IF;

  -- Loop through matching members
  FOR v_member IN
    SELECT id, email, full_name, year
    FROM user_profiles
    WHERE chapter_id = p_chapter_id
      AND (p_year_filter IS NULL OR year = p_year_filter)
      AND (p_status_filter IS NULL OR status = p_status_filter)
  LOOP
    BEGIN
      -- Check if member already has dues for this config
      IF EXISTS (
        SELECT 1 FROM member_dues
        WHERE member_id = v_member.id
          AND config_id = p_config_id
      ) THEN
        -- Add to existing dues
        UPDATE member_dues
        SET
          base_amount = base_amount + p_amount,
          total_amount = base_amount + p_amount + COALESCE(late_fee, 0) + COALESCE(adjustments, 0),
          balance = base_amount + p_amount + COALESCE(late_fee, 0) + COALESCE(adjustments, 0) - COALESCE(amount_paid, 0),
          due_date = COALESCE(p_due_date, due_date),
          status = CASE
            WHEN base_amount + p_amount + COALESCE(late_fee, 0) + COALESCE(adjustments, 0) - COALESCE(amount_paid, 0) <= 0 THEN 'paid'
            WHEN COALESCE(amount_paid, 0) > 0 THEN 'partial'
            ELSE 'pending'
          END,
          updated_at = NOW()
        WHERE member_id = v_member.id
          AND config_id = p_config_id;
      ELSE
        -- Create new dues record
        INSERT INTO member_dues (
          chapter_id,
          member_id,
          email,
          config_id,
          base_amount,
          total_amount,
          balance,
          amount_paid,
          due_date,
          status,
          assigned_date
        ) VALUES (
          p_chapter_id,
          v_member.id,
          v_member.email,
          p_config_id,
          p_amount,
          p_amount,
          p_amount,
          0,
          p_due_date,
          'pending',
          NOW()
        );
      END IF;

      v_assigned := v_assigned + 1;

    EXCEPTION WHEN OTHERS THEN
      v_skipped := v_skipped + 1;
      v_errors := array_append(v_errors, v_member.email || ': ' || SQLERRM);
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'assigned', v_assigned,
    'skipped', v_skipped,
    'errors', v_errors
  );
END;
$$;

-- Grant execute permission to authenticated users (RLS will handle authorization)
GRANT EXECUTE ON FUNCTION bulk_assign_dues TO authenticated;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This function:
-- 1. Accepts filters for year and status
-- 2. Loops through matching members
-- 3. Either creates new dues records or adds to existing ones
-- 4. Returns a summary of assigned/skipped members
-- ============================================================================
